#include "AuthController.h"
#include "../repositories/pg/PgUserRepository.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

AuthController::AuthController()
    : AuthController(std::make_shared<PgUserRepository>()) {}

AuthController::AuthController(std::shared_ptr<IUserRepository> userRepo)
    : userRepo_(std::move(userRepo)) {}

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
    userRepo_->findByCredentials(username, password,
        [cb](std::optional<UserInfo> userOpt, std::string error) {
            if (!error.empty()) {
                Json::Value err; err["error"] = "Database error";
                auto r = drogon::HttpResponse::newHttpJsonResponse(err);
                r->setStatusCode(drogon::k500InternalServerError);
                (*cb)(r); return;
            }
            if (!userOpt) {
                Json::Value err; err["error"] = "Invalid username or password";
                auto r = drogon::HttpResponse::newHttpJsonResponse(err);
                r->setStatusCode(drogon::k401Unauthorized);
                (*cb)(r); return;
            }
            std::string token = AuthManager::instance().createToken(*userOpt);
            Json::Value result;
            result["token"] = token;
            result["user"]["id"] = userOpt->id;
            result["user"]["username"] = userOpt->username;
            result["user"]["role"] = userOpt->role;
            (*cb)(drogon::HttpResponse::newHttpJsonResponse(result));
        });
}
