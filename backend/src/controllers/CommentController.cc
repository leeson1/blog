#include "CommentController.h"
#include "../utils/CsvHelper.h"
#include "../utils/AuthManager.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>
#include <mutex>
#include <chrono>
#include <ctime>
#include <sstream>
#include <iomanip>

extern std::string g_dataDir;

static std::mutex g_commentsMutex;

std::optional<UserInfo> CommentController::getAuthUser(const drogon::HttpRequestPtr& req) {
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

void CommentController::createComment(const drogon::HttpRequestPtr& req,
                                       std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                       int id) {
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

    std::string content = (*body)["content"].asString();
    if (content.empty()) {
        Json::Value err;
        err["error"] = "Content is required";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r);
        return;
    }

    std::lock_guard<std::mutex> lock(g_commentsMutex);

    auto rows = CsvHelper::readCsv(g_dataDir + "/comments.csv");
    int newId = 1;
    for (size_t i = 1; i < rows.size(); i++) {
        if (rows[i].size() >= 1) {
            try {
                int rowId = std::stoi(rows[i][0]);
                if (rowId >= newId) newId = rowId + 1;
            } catch (...) {}
        }
    }

    UserInfo user = userOpt.value();
    std::string timestamp = getCurrentTimestamp();

    std::vector<std::string> newRow = {
        std::to_string(newId),
        std::to_string(id),
        std::to_string(user.id),
        user.username,
        content,
        timestamp
    };

    CsvHelper::appendCsvRow(g_dataDir + "/comments.csv", newRow);

    Json::Value result;
    result["id"] = newId;
    result["article_id"] = id;
    result["user_id"] = user.id;
    result["username"] = user.username;
    result["content"] = content;
    result["created_at"] = timestamp;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}
