#include "CommentController.h"
#include "../repositories/pg/PgCommentRepository.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

CommentController::CommentController()
    : CommentController(std::make_shared<PgCommentRepository>()) {}

CommentController::CommentController(std::shared_ptr<ICommentRepository> commentRepo)
    : commentRepo_(std::move(commentRepo)) {}

std::optional<UserInfo> CommentController::getAuthUser(const drogon::HttpRequestPtr& req) {
    auto auth = req->getHeader("Authorization");
    if (auth.size() < 7 || auth.substr(0, 7) != "Bearer ") return std::nullopt;
    UserInfo user;
    if (!AuthManager::instance().validateToken(auth.substr(7), user)) return std::nullopt;
    return user;
}

void CommentController::createComment(const drogon::HttpRequestPtr& req,
                                       std::function<void(const drogon::HttpResponsePtr&)>&& callback, int articleId) {
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
    UserInfo user = *userOpt;
    auto cb = std::make_shared<std::function<void(const drogon::HttpResponsePtr&)>>(std::move(callback));
    commentRepo_->create(articleId, user.id, user.username, content,
        [cb](std::optional<CommentItem> cOpt, std::string error) {
            if (!error.empty() || !cOpt) {
                Json::Value err; err["error"] = "Database error";
                auto r = drogon::HttpResponse::newHttpJsonResponse(err);
                r->setStatusCode(drogon::k500InternalServerError);
                (*cb)(r); return;
            }
            const auto& c = *cOpt;
            Json::Value result;
            result["id"] = c.id; result["article_id"] = c.articleId;
            result["user_id"] = c.userId; result["username"] = c.username;
            result["content"] = c.content; result["created_at"] = c.createdAt;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            resp->setStatusCode(drogon::k201Created);
            (*cb)(resp);
        });
}
