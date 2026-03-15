#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "mocks/MockArticleRepository.h"
#include "../src/controllers/ArticleController.h"
#include <drogon/HttpRequest.h>

using namespace testing;

TEST(ArticleControllerTest, GetArticlesSuccess) {
    auto mockRepo = std::make_shared<MockArticleRepository>();
    EXPECT_CALL(*mockRepo, findAll(_))
        .WillOnce(Invoke([](std::function<void(std::vector<ArticleSummary>, std::string)> cb) {
            cb({{1, 1, "admin", "Test Article", "2026-01-01 10:00:00"}}, "");
        }));

    ArticleController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    drogon::HttpResponsePtr response;
    ctrl.getArticles(req, [&response](const drogon::HttpResponsePtr& r) { response = r; });

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k200OK);
    auto json = *response->getJsonObject();
    EXPECT_EQ(json.size(), 1u);
    EXPECT_EQ(json[0]["title"].asString(), "Test Article");
}

TEST(ArticleControllerTest, GetArticleFound) {
    auto mockRepo = std::make_shared<MockArticleRepository>();
    EXPECT_CALL(*mockRepo, findById(1, _))
        .WillOnce(Invoke([](int, std::function<void(std::optional<ArticleDetail>, std::string)> cb) {
            ArticleDetail a;
            a.id = 1; a.userId = 1; a.username = "admin";
            a.title = "Hello"; a.content = "World"; a.createdAt = "2026-01-01 10:00:00";
            cb(a, "");
        }));

    ArticleController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    drogon::HttpResponsePtr response;
    ctrl.getArticle(req, [&response](const drogon::HttpResponsePtr& r) { response = r; }, 1);

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k200OK);
    auto json = *response->getJsonObject();
    EXPECT_EQ(json["title"].asString(), "Hello");
    EXPECT_EQ(json["content"].asString(), "World");
}

TEST(ArticleControllerTest, GetArticleNotFound) {
    auto mockRepo = std::make_shared<MockArticleRepository>();
    EXPECT_CALL(*mockRepo, findById(999, _))
        .WillOnce(Invoke([](int, std::function<void(std::optional<ArticleDetail>, std::string)> cb) {
            cb(std::nullopt, "");
        }));

    ArticleController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    drogon::HttpResponsePtr response;
    ctrl.getArticle(req, [&response](const drogon::HttpResponsePtr& r) { response = r; }, 999);

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k404NotFound);
}

TEST(ArticleControllerTest, CreateArticleUnauthorized) {
    auto mockRepo = std::make_shared<MockArticleRepository>();
    EXPECT_CALL(*mockRepo, create(_, _, _, _, _)).Times(0);

    ArticleController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setBody(R"({"title":"T","content":"C"})");
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    drogon::HttpResponsePtr response;
    ctrl.createArticle(req, [&response](const drogon::HttpResponsePtr& r) { response = r; });

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k401Unauthorized);
}

TEST(ArticleControllerTest, CreateArticleMissingTitle) {
    auto mockRepo = std::make_shared<MockArticleRepository>();
    EXPECT_CALL(*mockRepo, create(_, _, _, _, _)).Times(0);

    // 先获取一个有效 token
    std::string token = AuthManager::instance().createToken({1, "admin"});

    ArticleController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setBody(R"({"title":"","content":"content"})");
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    req->addHeader("Authorization", "Bearer " + token);
    drogon::HttpResponsePtr response;
    ctrl.createArticle(req, [&response](const drogon::HttpResponsePtr& r) { response = r; });

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k400BadRequest);
}
