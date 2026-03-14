#include <drogon/drogon.h>
#include <filesystem>
#include <iostream>
#include <string>

// Global data directory path - set in main before app runs
std::string g_dataDir;

int main(int argc, char* argv[]) {
    // Determine the data directory path
    // The binary is in build/, data is at ../data/ relative to binary location
    // Or we can use the executable path
    std::filesystem::path exePath = std::filesystem::canonical(argv[0]);
    std::filesystem::path exeDir = exePath.parent_path();

    // Try ../data relative to binary (build/ -> backend/data/)
    std::filesystem::path dataPath = exeDir / ".." / "data";
    if (std::filesystem::exists(dataPath)) {
        g_dataDir = std::filesystem::canonical(dataPath).string();
    } else {
        // Fallback: try ./data
        dataPath = exeDir / "data";
        if (std::filesystem::exists(dataPath)) {
            g_dataDir = std::filesystem::canonical(dataPath).string();
        } else {
            // Last resort: use current working directory / data
            g_dataDir = std::filesystem::current_path().string() + "/data";
        }
    }

    std::cout << "Data directory: " << g_dataDir << std::endl;

    // Ensure image directory exists
    std::filesystem::create_directories(g_dataDir + "/image");

    // Set CORS - handle OPTIONS preflight
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

    drogon::app()
        .loadConfigFile("../config.json")
        .run();

    return 0;
}
