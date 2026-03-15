#include "ArticleController.h"
#include "../repositories/pg/PgArticleRepository.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

ArticleController::ArticleController()
    : ArticleController(std::make_shared<PgArticleRepository>()) {}

ArticleController::ArticleController(std::shared_ptr<IArticleRepository> articleRepo)
    : articleRepo_(std::move(articleRepo)) {}

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
    articleRepo_->findAll([cb](std::vector<ArticleSummary> articles, std::string error) {
        if (!error.empty()) {
            Json::Value err; err["error"] = "Database error";
            auto r = drogon::HttpResponse::newHttpJsonResponse(err);
            r->setStatusCode(drogon::k500InternalServerError);
            (*cb)(r); return;
        }
        Json::Value result(Json::arrayValue);
        for (const auto& a : articles) {
            Json::Value item;
            item["id"] = a.id; item["user_id"] = a.userId;
            item["username"] = a.username; item["title"] = a.title;
            item["created_at"] = a.createdAt;
            result.append(item);
        }
        (*cb)(drogon::HttpResponse::newHttpJsonResponse(result));
    });
}

void ArticleController::getArticle(const drogon::HttpRequestPtr& req,
                                    std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id) {
    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    articleRepo_->findById(id, [cb](std::optional<ArticleDetail> articleOpt, std::string error) {
        if (!error.empty()) {
            Json::Value err; err["error"] = "Database error";
            auto r = drogon::HttpResponse::newHttpJsonResponse(err);
            r->setStatusCode(drogon::k500InternalServerError);
            (*cb)(r); return;
        }
        if (!articleOpt) {
            Json::Value err; err["error"] = "Article not found";
            auto r = drogon::HttpResponse::newHttpJsonResponse(err);
            r->setStatusCode(drogon::k404NotFound);
            (*cb)(r); return;
        }
        const auto& a = *articleOpt;
        Json::Value result;
        result["id"] = a.id; result["user_id"] = a.userId;
        result["username"] = a.username; result["title"] = a.title;
        result["content"] = a.content; result["created_at"] = a.createdAt;
        Json::Value comments(Json::arrayValue);
        for (const auto& c : a.comments) {
            Json::Value cj;
            cj["id"] = c.id; cj["article_id"] = c.articleId;
            cj["user_id"] = c.userId; cj["username"] = c.username;
            cj["content"] = c.content; cj["created_at"] = c.createdAt;
            comments.append(cj);
        }
        result["comments"] = comments;
        (*cb)(drogon::HttpResponse::newHttpJsonResponse(result));
    });
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
    UserInfo user = *userOpt;
    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    articleRepo_->create(user.id, user.username, title, content,
        [cb](std::optional<ArticleDetail> aOpt, std::string error) {
            if (!error.empty() || !aOpt) {
                Json::Value err; err["error"] = "Database error";
                auto r = drogon::HttpResponse::newHttpJsonResponse(err);
                r->setStatusCode(drogon::k500InternalServerError);
                (*cb)(r); return;
            }
            const auto& a = *aOpt;
            Json::Value result;
            result["id"] = a.id; result["user_id"] = a.userId;
            result["username"] = a.username; result["title"] = a.title;
            result["content"] = a.content; result["created_at"] = a.createdAt;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            resp->setStatusCode(drogon::k201Created);
            (*cb)(resp);
        });
}
