#pragma once
#include <drogon/HttpController.h>
#include "../repositories/IArticleRepository.h"
#include "../utils/AuthManager.h"
#include <memory>
#include <optional>

class ArticleController : public drogon::HttpController<ArticleController> {
public:
    ArticleController();
    explicit ArticleController(std::shared_ptr<IArticleRepository> articleRepo);

    METHOD_LIST_BEGIN
    ADD_METHOD_TO(ArticleController::getArticles, "/api/articles", drogon::Get);
    ADD_METHOD_TO(ArticleController::getArticle,  "/api/articles/{id}", drogon::Get);
    ADD_METHOD_TO(ArticleController::createArticle, "/api/articles", drogon::Post);
    METHOD_LIST_END

    void getArticles(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getArticle(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);
    void createArticle(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<IArticleRepository> articleRepo_;
    std::optional<UserInfo> getAuthUser(const drogon::HttpRequestPtr& req);
};
