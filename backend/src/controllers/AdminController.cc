#include "AdminController.h"
#include "../repositories/pg/PgUserRepository.h"
#include "../repositories/pg/PgArticleRepository.h"
#include "../repositories/pg/PgCommentRepository.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

using Cb = std::function<void(const drogon::HttpResponsePtr&)>;

AdminController::AdminController()
    : userRepo_(std::make_shared<PgUserRepository>())
    , articleRepo_(std::make_shared<PgArticleRepository>())
    , commentRepo_(std::make_shared<PgCommentRepository>())
{}

std::optional<UserInfo> AdminController::getAdminUser(const drogon::HttpRequestPtr& req) {
    std::string auth = req->getHeader("Authorization");
    if (auth.size() < 8 || auth.substr(0, 7) != "Bearer ") return std::nullopt;
    UserInfo user;
    if (!AuthManager::instance().validateToken(auth.substr(7), user)) return std::nullopt;
    if (user.role != "admin") return std::nullopt;
    return user;
}

static drogon::HttpResponsePtr forbidden() {
    Json::Value err; err["error"] = "Forbidden";
    auto r = drogon::HttpResponse::newHttpJsonResponse(err);
    r->setStatusCode(drogon::k403Forbidden);
    return r;
}

static drogon::HttpResponsePtr dbError() {
    Json::Value err; err["error"] = "Database error";
    auto r = drogon::HttpResponse::newHttpJsonResponse(err);
    r->setStatusCode(drogon::k500InternalServerError);
    return r;
}

static drogon::HttpResponsePtr badRequest(const std::string& msg) {
    Json::Value err; err["error"] = msg;
    auto r = drogon::HttpResponse::newHttpJsonResponse(err);
    r->setStatusCode(drogon::k400BadRequest);
    return r;
}

// ── Users ────────────────────────────────────────────────────

void AdminController::listUsers(const drogon::HttpRequestPtr& req, Cb&& cb) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto callback = std::make_shared<Cb>(std::move(cb));
    userRepo_->listUsers([callback](std::vector<UserListItem> users, std::string error) {
        if (!error.empty()) { (*callback)(dbError()); return; }
        Json::Value result(Json::arrayValue);
        for (const auto& u : users) {
            Json::Value item;
            item["id"]         = u.id;
            item["username"]   = u.username;
            item["role"]       = u.role;
            item["created_at"] = u.createdAt;
            result.append(item);
        }
        (*callback)(drogon::HttpResponse::newHttpJsonResponse(result));
    });
}

void AdminController::createUser(const drogon::HttpRequestPtr& req, Cb&& cb) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto body = req->getJsonObject();
    if (!body) { cb(badRequest("Invalid JSON")); return; }
    std::string username = (*body)["username"].asString();
    std::string password = (*body)["password"].asString();
    std::string role     = (*body).get("role", "user").asString();
    if (username.empty() || password.empty()) { cb(badRequest("Username and password required")); return; }
    if (role != "user" && role != "admin") role = "user";

    auto callback = std::make_shared<Cb>(std::move(cb));
    userRepo_->createUser(username, password, role,
        [callback](std::optional<UserListItem> userOpt, std::string error) {
            if (!error.empty()) {
                std::string msg = error.find("duplicate") != std::string::npos
                                  ? "Username already exists" : "Database error";
                (*callback)(badRequest(msg)); return;
            }
            Json::Value result;
            result["id"]         = userOpt->id;
            result["username"]   = userOpt->username;
            result["role"]       = userOpt->role;
            result["created_at"] = userOpt->createdAt;
            auto r = drogon::HttpResponse::newHttpJsonResponse(result);
            r->setStatusCode(drogon::k201Created);
            (*callback)(r);
        });
}

void AdminController::deleteUser(const drogon::HttpRequestPtr& req, Cb&& cb, int id) {
    auto adminUser = getAdminUser(req);
    if (!adminUser) { cb(forbidden()); return; }
    if (adminUser->id == id) { cb(badRequest("Cannot delete yourself")); return; }
    auto callback = std::make_shared<Cb>(std::move(cb));
    userRepo_->deleteUser(id, [callback](bool ok, std::string) {
        if (!ok) { (*callback)(dbError()); return; }
        (*callback)(drogon::HttpResponse::newHttpResponse());
    });
}

// ── Articles ─────────────────────────────────────────────────

void AdminController::listArticles(const drogon::HttpRequestPtr& req, Cb&& cb) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto pageStr  = req->getParameter("page");
    auto limitStr = req->getParameter("limit");
    int page  = std::max(1, pageStr.empty()  ? 1 : std::stoi(pageStr));
    int limit = std::max(1, limitStr.empty() ? 20 : std::stoi(limitStr));
    limit = std::min(limit, 100);

    auto callback = std::make_shared<Cb>(std::move(cb));
    articleRepo_->findAllPaginated(page, limit,
        [callback, page, limit](std::vector<ArticleSummary> articles, int total, std::string error) {
            if (!error.empty()) { (*callback)(dbError()); return; }
            Json::Value result;
            result["total"] = total;
            result["page"]  = page;
            result["limit"] = limit;
            result["items"] = Json::arrayValue;
            for (const auto& a : articles) {
                Json::Value item;
                item["id"]         = a.id;
                item["user_id"]    = a.userId;
                item["username"]   = a.username;
                item["title"]      = a.title;
                item["created_at"] = a.createdAt;
                result["items"].append(item);
            }
            (*callback)(drogon::HttpResponse::newHttpJsonResponse(result));
        });
}

void AdminController::updateArticle(const drogon::HttpRequestPtr& req, Cb&& cb, int id) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto body = req->getJsonObject();
    if (!body) { cb(badRequest("Invalid JSON")); return; }
    std::string title   = (*body)["title"].asString();
    std::string content = (*body)["content"].asString();
    if (title.empty()) { cb(badRequest("Title required")); return; }

    auto callback = std::make_shared<Cb>(std::move(cb));
    articleRepo_->update(id, title, content, [callback](bool ok, std::string) {
        if (!ok) { (*callback)(dbError()); return; }
        (*callback)(drogon::HttpResponse::newHttpResponse());
    });
}

void AdminController::deleteArticle(const drogon::HttpRequestPtr& req, Cb&& cb, int id) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto callback = std::make_shared<Cb>(std::move(cb));
    articleRepo_->remove(id, [callback](bool ok, std::string) {
        if (!ok) { (*callback)(dbError()); return; }
        (*callback)(drogon::HttpResponse::newHttpResponse());
    });
}

// ── Comments ─────────────────────────────────────────────────

void AdminController::listComments(const drogon::HttpRequestPtr& req, Cb&& cb) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto pageStr  = req->getParameter("page");
    auto limitStr = req->getParameter("limit");
    int page  = std::max(1, pageStr.empty()  ? 1 : std::stoi(pageStr));
    int limit = std::max(1, limitStr.empty() ? 20 : std::stoi(limitStr));
    limit = std::min(limit, 100);

    auto callback = std::make_shared<Cb>(std::move(cb));
    commentRepo_->listAll(page, limit,
        [callback, page, limit](std::vector<CommentItem> comments, int total, std::string error) {
            if (!error.empty()) { (*callback)(dbError()); return; }
            Json::Value result;
            result["total"] = total;
            result["page"]  = page;
            result["limit"] = limit;
            result["items"] = Json::arrayValue;
            for (const auto& c : comments) {
                Json::Value item;
                item["id"]         = c.id;
                item["article_id"] = c.articleId;
                item["user_id"]    = c.userId;
                item["username"]   = c.username;
                item["content"]    = c.content;
                item["created_at"] = c.createdAt;
                result["items"].append(item);
            }
            (*callback)(drogon::HttpResponse::newHttpJsonResponse(result));
        });
}

void AdminController::updateComment(const drogon::HttpRequestPtr& req, Cb&& cb, int id) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto body = req->getJsonObject();
    if (!body) { cb(badRequest("Invalid JSON")); return; }
    std::string content = (*body)["content"].asString();
    if (content.empty()) { cb(badRequest("Content required")); return; }

    auto callback = std::make_shared<Cb>(std::move(cb));
    commentRepo_->update(id, content, [callback](bool ok, std::string) {
        if (!ok) { (*callback)(dbError()); return; }
        (*callback)(drogon::HttpResponse::newHttpResponse());
    });
}

void AdminController::deleteComment(const drogon::HttpRequestPtr& req, Cb&& cb, int id) {
    if (!getAdminUser(req)) { cb(forbidden()); return; }
    auto callback = std::make_shared<Cb>(std::move(cb));
    commentRepo_->remove(id, [callback](bool ok, std::string) {
        if (!ok) { (*callback)(dbError()); return; }
        (*callback)(drogon::HttpResponse::newHttpResponse());
    });
}
