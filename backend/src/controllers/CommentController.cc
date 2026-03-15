#include "CommentController.h"
#include "../utils/AuthManager.h"
#include <drogon/HttpResponse.h>
#include <drogon/orm/DbClient.h>
#include <json/json.h>

std::optional<UserInfo> CommentController::getAuthUser(const drogon::HttpRequestPtr& req) {
    auto auth = req->getHeader("Authorization");
    if (auth.size() < 7 || auth.substr(0, 7) != "Bearer ") return std::nullopt;
    UserInfo user;
    if (!AuthManager::instance().validateToken(auth.substr(7), user)) return std::nullopt;
    return user;
}

void CommentController::createComment(const drogon::HttpRequestPtr& req,
                                       std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                       int articleId) {
    auto userOpt = getAuthUser(req);
    if (!userOpt) {
        Json::Value err; err["error"] = "Unauthorized";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k401Unauthorized);
        callback(r); return;
    }

    auto body = req->getJsonObject();
    if (!body) {
        Json::Value err; err["error"] = "Invalid JSON";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    std::string content = (*body)["content"].asString();
    if (content.empty()) {
        Json::Value err; err["error"] = "Content is required";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    UserInfo user = userOpt.value();
    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "INSERT INTO comments (article_id, user_id, username, content) VALUES ($1, $2, $3, $4) RETURNING id, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at",
        [cb, user, articleId, content](const drogon::orm::Result& r) {
            Json::Value result;
            result["id"] = r[0]["id"].as<int>();
            result["article_id"] = articleId;
            result["user_id"] = user.id;
            result["username"] = user.username;
            result["content"] = content;
            result["created_at"] = r[0]["created_at"].as<std::string>();
            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            resp->setStatusCode(drogon::k201Created);
            (*cb)(resp);
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            (*cb)(resp);
        },
        articleId, user.id, user.username, content
    );
}
