#pragma once
#include <drogon/HttpController.h>
#include "../utils/AuthManager.h"
#include <optional>

class ArticleController : public drogon::HttpController<ArticleController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(ArticleController::getArticles, "/api/articles", drogon::Get);
    ADD_METHOD_TO(ArticleController::getArticle, "/api/articles/{id}", drogon::Get);
    ADD_METHOD_TO(ArticleController::createArticle, "/api/articles", drogon::Post);
    METHOD_LIST_END

    void getArticles(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    void getArticle(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    int id);

    void createArticle(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::optional<UserInfo> getAuthUser(const drogon::HttpRequestPtr& req);
};
