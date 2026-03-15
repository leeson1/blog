#include "ArticleController.h"
#include "../utils/AuthManager.h"
#include <drogon/HttpResponse.h>
#include <drogon/orm/DbClient.h>
#include <json/json.h>

std::optional<UserInfo> ArticleController::getAuthUser(const drogon::HttpRequestPtr& req) {
    auto auth = req->getHeader("Authorization");
    if (auth.size() < 7 || auth.substr(0, 7) != "Bearer ") return std::nullopt;
    UserInfo user;
    if (!AuthManager::instance().validateToken(auth.substr(7), user)) return std::nullopt;
    return user;
}

void ArticleController::getArticles(const drogon::HttpRequestPtr& req,
                                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT id, user_id, username, title, created_at FROM articles ORDER BY id DESC",
        [cb](const drogon::orm::Result& r) {
            Json::Value result(Json::arrayValue);
            for (const auto& row : r) {
                Json::Value article;
                article["id"] = row["id"].as<int>();
                article["user_id"] = row["user_id"].as<int>();
                article["username"] = row["username"].as<std::string>();
                article["title"] = row["title"].as<std::string>();
                article["created_at"] = row["created_at"].as<std::string>();
                result.append(article);
            }
            (*cb)(drogon::HttpResponse::newHttpJsonResponse(result));
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            (*cb)(resp);
        }
    );
}

void ArticleController::getArticle(const drogon::HttpRequestPtr& req,
                                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                    int id) {
    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT id, user_id, username, title, content, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at FROM articles WHERE id=$1",
        [cb, id, db](const drogon::orm::Result& r) mutable {
            if (r.empty()) {
                Json::Value err; err["error"] = "Article not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                (*cb)(resp); return;
            }
            auto articleCb = std::make_shared<Json::Value>();
            (*articleCb)["id"] = r[0]["id"].as<int>();
            (*articleCb)["user_id"] = r[0]["user_id"].as<int>();
            (*articleCb)["username"] = r[0]["username"].as<std::string>();
            (*articleCb)["title"] = r[0]["title"].as<std::string>();
            (*articleCb)["content"] = r[0]["content"].as<std::string>();
            (*articleCb)["created_at"] = r[0]["created_at"].as<std::string>();

            db->execSqlAsync(
                "SELECT id, article_id, user_id, username, content, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at FROM comments WHERE article_id=$1 ORDER BY id ASC",
                [cb, articleCb](const drogon::orm::Result& cr) {
                    Json::Value comments(Json::arrayValue);
                    for (const auto& row : cr) {
                        Json::Value comment;
                        comment["id"] = row["id"].as<int>();
                        comment["article_id"] = row["article_id"].as<int>();
                        comment["user_id"] = row["user_id"].as<int>();
                        comment["username"] = row["username"].as<std::string>();
                        comment["content"] = row["content"].as<std::string>();
                        comment["created_at"] = row["created_at"].as<std::string>();
                        comments.append(comment);
                    }
                    (*articleCb)["comments"] = comments;
                    (*cb)(drogon::HttpResponse::newHttpJsonResponse(*articleCb));
                },
                [cb](const drogon::orm::DrogonDbException& e) {
                    Json::Value err; err["error"] = "Database error";
                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                    resp->setStatusCode(drogon::k500InternalServerError);
                    (*cb)(resp);
                },
                id
            );
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            (*cb)(resp);
        },
        id
    );
}

void ArticleController::createArticle(const drogon::HttpRequestPtr& req,
                                       std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
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

    std::string title = (*body)["title"].asString();
    std::string content = (*body)["content"].asString();

    if (title.empty()) {
        Json::Value err; err["error"] = "Title is required";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    UserInfo user = userOpt.value();
    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "INSERT INTO articles (user_id, username, title, content) VALUES ($1, $2, $3, $4) RETURNING id, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at",
        [cb, user, title, content](const drogon::orm::Result& r) {
            Json::Value result;
            result["id"] = r[0]["id"].as<int>();
            result["user_id"] = user.id;
            result["username"] = user.username;
            result["title"] = title;
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
        user.id, user.username, title, content
    );
}
