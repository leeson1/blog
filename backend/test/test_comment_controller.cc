#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "mocks/MockCommentRepository.h"
#include "../src/controllers/CommentController.h"
#include <drogon/HttpRequest.h>

using namespace testing;

TEST(CommentControllerTest, CreateCommentSuccess) {
    auto mockRepo = std::make_shared<MockCommentRepository>();
    EXPECT_CALL(*mockRepo, create(1, 1, "admin", "Nice post!", _))
        .WillOnce(Invoke([](int, int, const std::string&, const std::string&,
                            std::function<void(std::optional<CommentItem>, std::string)> cb) {
            cb(CommentItem{1, 1, 1, "admin", "Nice post!", "2026-01-01 10:00:00"}, "");
        }));

    std::string token = AuthManager::instance().createToken({1, "admin"});
    CommentController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setBody(R"({"content":"Nice post!"})");
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    req->addHeader("Authorization", "Bearer " + token);
    drogon::HttpResponsePtr response;
    ctrl.createComment(req, [&response](const drogon::HttpResponsePtr& r) { response = r; }, 1);

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k201Created);
    auto json = *response->getJsonObject();
    EXPECT_EQ(json["content"].asString(), "Nice post!");
}

TEST(CommentControllerTest, CreateCommentUnauthorized) {
    auto mockRepo = std::make_shared<MockCommentRepository>();
    EXPECT_CALL(*mockRepo, create(_, _, _, _, _)).Times(0);

    CommentController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setBody(R"({"content":"hello"})");
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    drogon::HttpResponsePtr response;
    ctrl.createComment(req, [&response](const drogon::HttpResponsePtr& r) { response = r; }, 1);

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k401Unauthorized);
}

TEST(CommentControllerTest, CreateCommentEmptyContent) {
    auto mockRepo = std::make_shared<MockCommentRepository>();
    EXPECT_CALL(*mockRepo, create(_, _, _, _, _)).Times(0);

    std::string token = AuthManager::instance().createToken({1, "admin"});
    CommentController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setBody(R"({"content":""})");
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    req->addHeader("Authorization", "Bearer " + token);
    drogon::HttpResponsePtr response;
    ctrl.createComment(req, [&response](const drogon::HttpResponsePtr& r) { response = r; }, 1);

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k400BadRequest);
}
