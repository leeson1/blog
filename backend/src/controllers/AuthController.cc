#include "AuthController.h"
#include "../utils/AuthManager.h"
#include <drogon/HttpResponse.h>
#include <drogon/orm/DbClient.h>
#include <json/json.h>

void AuthController::login(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto body = req->getJsonObject();
    if (!body) {
        Json::Value err; err["error"] = "Invalid JSON";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    std::string username = (*body)["username"].asString();
    std::string password = (*body)["password"].asString();

    if (username.empty() || password.empty()) {
        Json::Value err; err["error"] = "Username and password required";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT id, username FROM users WHERE username=$1 AND password=$2",
        [cb](const drogon::orm::Result& r) {
            if (r.empty()) {
                Json::Value err; err["error"] = "Invalid username or password";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k401Unauthorized);
                (*cb)(resp); return;
            }
            UserInfo user;
            user.id = r[0]["id"].as<int>();
            user.username = r[0]["username"].as<std::string>();
            std::string token = AuthManager::instance().createToken(user);

            Json::Value result;
            result["token"] = token;
            Json::Value userJson;
            userJson["id"] = user.id;
            userJson["username"] = user.username;
            result["user"] = userJson;
            (*cb)(drogon::HttpResponse::newHttpJsonResponse(result));
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            (*cb)(resp);
        },
        username, password
    );
}
