#pragma once
#include <drogon/HttpController.h>
#include "../repositories/IUserRepository.h"
#include "../repositories/IArticleRepository.h"
#include "../repositories/ICommentRepository.h"
#include "../utils/AuthManager.h"
#include <memory>
#include <optional>

class AdminController : public drogon::HttpController<AdminController> {
public:
    AdminController();

    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AdminController::listUsers,    "/api/admin/users",          drogon::Get);
    ADD_METHOD_TO(AdminController::createUser,   "/api/admin/users",          drogon::Post);
    ADD_METHOD_TO(AdminController::deleteUser,   "/api/admin/users/{id}",     drogon::Delete);
    ADD_METHOD_TO(AdminController::listArticles, "/api/admin/articles",       drogon::Get);
    ADD_METHOD_TO(AdminController::updateArticle,"/api/admin/articles/{id}",  drogon::Put);
    ADD_METHOD_TO(AdminController::deleteArticle,"/api/admin/articles/{id}",  drogon::Delete);
    ADD_METHOD_TO(AdminController::listComments, "/api/admin/comments",       drogon::Get);
    ADD_METHOD_TO(AdminController::updateComment,"/api/admin/comments/{id}",  drogon::Put);
    ADD_METHOD_TO(AdminController::deleteComment,"/api/admin/comments/{id}",  drogon::Delete);
    METHOD_LIST_END

    void listUsers   (const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb);
    void createUser  (const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb);
    void deleteUser  (const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb, int id);
    void listArticles(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb);
    void updateArticle(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb, int id);
    void deleteArticle(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb, int id);
    void listComments(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb);
    void updateComment(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb, int id);
    void deleteComment(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& cb, int id);

private:
    std::shared_ptr<IUserRepository>    userRepo_;
    std::shared_ptr<IArticleRepository> articleRepo_;
    std::shared_ptr<ICommentRepository> commentRepo_;

    std::optional<UserInfo> getAdminUser(const drogon::HttpRequestPtr& req);
};
