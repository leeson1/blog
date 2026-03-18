#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>
#include <filesystem>
#include <iostream>
#include <thread>
#include <chrono>
#include <cstdlib>

// 全局图片目录（供 UploadController 使用）
std::string g_imageDir = "/app/images";

int main() {
    // 读取 DB 配置
    auto getEnv = [](const char* key, const char* def) -> std::string {
        const char* val = std::getenv(key);
        return val ? val : def;
    };
    std::string dbHost = getEnv("DB_HOST", "db");
    std::string dbName = getEnv("DB_NAME", "blog");
    std::string dbUser = getEnv("DB_USER", "blog");
    std::string dbPass = getEnv("DB_PASS", "blogpassword");

    std::string connStr = "host=" + dbHost +
                          " port=5432"
                          " dbname=" + dbName +
                          " user=" + dbUser +
                          " password=" + dbPass;

    // 等待 DB 就绪并初始化表结构
    bool initialized = false;
    for (int i = 0; i < 30 && !initialized; i++) {
        try {
            auto client = drogon::orm::DbClient::newPgClient(connStr, 1);

            // 建表
            client->execSqlSync(R"(
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(10) NOT NULL DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            )");

            client->execSqlSync(R"(
                CREATE TABLE IF NOT EXISTS articles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    username VARCHAR(50) NOT NULL,
                    title VARCHAR(500) NOT NULL,
                    content TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            )");

            client->execSqlSync(R"(
                CREATE TABLE IF NOT EXISTS comments (
                    id SERIAL PRIMARY KEY,
                    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL,
                    username VARCHAR(50) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            )");

            // 迁移：为已有部署补充 role 列，移除 user_id 外键
            client->execSqlSync("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'user'");
            client->execSqlSync("ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_user_id_fkey");
            client->execSqlSync("ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey");

            initialized = true;
            std::cout << "Database initialized successfully." << std::endl;
        } catch (const std::exception& e) {
            std::cout << "DB not ready (" << e.what() << "), retrying in 2s... (" << (i+1) << "/30)" << std::endl;
            std::this_thread::sleep_for(std::chrono::seconds(2));
        }
    }

    if (!initialized) {
        std::cerr << "Failed to connect to database after 30 attempts. Exiting." << std::endl;
        return 1;
    }

    // 创建图片目录
    std::filesystem::create_directories(g_imageDir);

    // CORS
    drogon::app().registerPreRoutingAdvice([](const drogon::HttpRequestPtr& req,
        drogon::AdviceCallback&& acb,
        drogon::AdviceChainCallback&& accb) {
        if (req->method() == drogon::Options) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->addHeader("Access-Control-Allow-Origin", "*");
            resp->addHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
            resp->addHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
            resp->setStatusCode(drogon::k204NoContent);
            acb(resp);
        } else {
            accb();
        }
    });

    drogon::app().registerPostHandlingAdvice([](const drogon::HttpRequestPtr&,
        const drogon::HttpResponsePtr& resp) {
        resp->addHeader("Access-Control-Allow-Origin", "*");
        resp->addHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        resp->addHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    });

    // 注册 DB 客户端到 app
    drogon::app().createDbClient(
        "postgresql",
        dbHost,
        5432,
        dbName,
        dbUser,
        dbPass,
        4,   // connection_number
        "",  // filename (sqlite only)
        "default"
    );

    drogon::app()
        .loadConfigFile("../config.json")
        .run();

    return 0;
}
