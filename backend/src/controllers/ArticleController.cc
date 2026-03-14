#include "ArticleController.h"
#include "../utils/CsvHelper.h"
#include "../utils/AuthManager.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>
#include <mutex>
#include <chrono>
#include <ctime>
#include <sstream>
#include <iomanip>
#include <algorithm>

extern std::string g_dataDir;

static std::mutex g_articlesMutex;

std::optional<UserInfo> ArticleController::getAuthUser(const drogon::HttpRequestPtr& req) {
    auto auth = req->getHeader("Authorization");
    if (auth.size() < 7 || auth.substr(0, 7) != "Bearer ") return std::nullopt;
    std::string token = auth.substr(7);
    UserInfo user;
    if (!AuthManager::instance().validateToken(token, user)) return std::nullopt;
    return user;
}

static std::string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t t = std::chrono::system_clock::to_time_t(now);
    std::tm tm_info;
    gmtime_r(&t, &tm_info);
    std::ostringstream oss;
    oss << std::put_time(&tm_info, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

void ArticleController::getArticles(const drogon::HttpRequestPtr& req,
                                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    std::lock_guard<std::mutex> lock(g_articlesMutex);
    auto rows = CsvHelper::readCsv(g_dataDir + "/articles.csv");

    Json::Value result(Json::arrayValue);
    // rows[0] is header: id,user_id,username,title,content,created_at
    for (size_t i = 1; i < rows.size(); i++) {
        const auto& row = rows[i];
        if (row.size() < 6) continue;
        Json::Value article;
        article["id"] = std::stoi(row[0]);
        article["user_id"] = std::stoi(row[1]);
        article["username"] = row[2];
        article["title"] = row[3];
        // No content in list
        article["created_at"] = row[5];
        result.append(article);
    }

    // Sort by id descending (newest first)
    // Json::Value doesn't have sort, build a vector
    std::vector<Json::Value> articles;
    for (const auto& a : result) {
        articles.push_back(a);
    }
    std::sort(articles.begin(), articles.end(), [](const Json::Value& a, const Json::Value& b) {
        return a["id"].asInt() > b["id"].asInt();
    });

    Json::Value sorted(Json::arrayValue);
    for (const auto& a : articles) {
        sorted.append(a);
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(sorted);
    callback(resp);
}

void ArticleController::getArticle(const drogon::HttpRequestPtr& req,
                                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                    int id) {
    std::lock_guard<std::mutex> lock(g_articlesMutex);

    auto articleRows = CsvHelper::readCsv(g_dataDir + "/articles.csv");
    Json::Value article;
    bool found = false;

    for (size_t i = 1; i < articleRows.size(); i++) {
        const auto& row = articleRows[i];
        if (row.size() < 6) continue;
        if (std::stoi(row[0]) == id) {
            article["id"] = std::stoi(row[0]);
            article["user_id"] = std::stoi(row[1]);
            article["username"] = row[2];
            article["title"] = row[3];
            article["content"] = row[4];
            article["created_at"] = row[5];
            found = true;
            break;
        }
    }

    if (!found) {
        Json::Value err;
        err["error"] = "Article not found";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k404NotFound);
        callback(r);
        return;
    }

    // Load comments
    auto commentRows = CsvHelper::readCsv(g_dataDir + "/comments.csv");
    Json::Value comments(Json::arrayValue);
    // comments header: id,article_id,user_id,username,content,created_at
    for (size_t i = 1; i < commentRows.size(); i++) {
        const auto& row = commentRows[i];
        if (row.size() < 6) continue;
        if (std::stoi(row[1]) == id) {
            Json::Value comment;
            comment["id"] = std::stoi(row[0]);
            comment["article_id"] = std::stoi(row[1]);
            comment["user_id"] = std::stoi(row[2]);
            comment["username"] = row[3];
            comment["content"] = row[4];
            comment["created_at"] = row[5];
            comments.append(comment);
        }
    }

    article["comments"] = comments;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(article);
    callback(resp);
}

void ArticleController::createArticle(const drogon::HttpRequestPtr& req,
                                       std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto userOpt = getAuthUser(req);
    if (!userOpt) {
        Json::Value err;
        err["error"] = "Unauthorized";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k401Unauthorized);
        callback(r);
        return;
    }

    auto body = req->getJsonObject();
    if (!body) {
        Json::Value err;
        err["error"] = "Invalid JSON";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r);
        return;
    }

    std::string title = (*body)["title"].asString();
    std::string content = (*body)["content"].asString();

    if (title.empty()) {
        Json::Value err;
        err["error"] = "Title is required";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r);
        return;
    }

    std::lock_guard<std::mutex> lock(g_articlesMutex);

    auto rows = CsvHelper::readCsv(g_dataDir + "/articles.csv");
    int newId = 1;
    for (size_t i = 1; i < rows.size(); i++) {
        if (rows[i].size() >= 1) {
            try {
                int rowId = std::stoi(rows[i][0]);
                if (rowId >= newId) newId = rowId + 1;
            } catch (...) {}
        }
    }

    std::string timestamp = getCurrentTimestamp();
    UserInfo user = userOpt.value();

    std::vector<std::string> newRow = {
        std::to_string(newId),
        std::to_string(user.id),
        user.username,
        title,
        content,
        timestamp
    };

    CsvHelper::appendCsvRow(g_dataDir + "/articles.csv", newRow);

    Json::Value result;
    result["id"] = newId;
    result["user_id"] = user.id;
    result["username"] = user.username;
    result["title"] = title;
    result["content"] = content;
    result["created_at"] = timestamp;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}
