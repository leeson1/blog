#include "AuthController.h"
#include "../utils/CsvHelper.h"
#include "../utils/AuthManager.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>
#include <string>
#include <mutex>

extern std::string g_dataDir;

void AuthController::login(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto body = req->getJsonObject();
    if (!body) {
        auto resp = drogon::HttpResponse::newHttpJsonResponse(
            Json::Value(Json::objectValue));
        Json::Value err;
        err["error"] = "Invalid JSON";
        resp->setStatusCode(drogon::k400BadRequest);
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r);
        return;
    }

    std::string username = (*body)["username"].asString();
    std::string password = (*body)["password"].asString();

    if (username.empty() || password.empty()) {
        Json::Value err;
        err["error"] = "Username and password required";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r);
        return;
    }

    // Read users.csv
    auto rows = CsvHelper::readCsv(g_dataDir + "/users.csv");
    // rows[0] is header: id,username,password,created_at
    for (size_t i = 1; i < rows.size(); i++) {
        const auto& row = rows[i];
        if (row.size() < 4) continue;
        if (row[1] == username && row[2] == password) {
            UserInfo user;
            user.id = std::stoi(row[0]);
            user.username = row[1];

            std::string token = AuthManager::instance().createToken(user);

            Json::Value result;
            result["token"] = token;
            Json::Value userJson;
            userJson["id"] = user.id;
            userJson["username"] = user.username;
            result["user"] = userJson;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            callback(resp);
            return;
        }
    }

    Json::Value err;
    err["error"] = "Invalid username or password";
    auto r = drogon::HttpResponse::newHttpJsonResponse(err);
    r->setStatusCode(drogon::k401Unauthorized);
    callback(r);
}
