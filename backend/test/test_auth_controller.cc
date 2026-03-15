#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "mocks/MockUserRepository.h"
#include "../src/controllers/AuthController.h"
#include <drogon/HttpRequest.h>
#include <json/json.h>

using namespace testing;

static drogon::HttpResponsePtr callLogin(AuthController& ctrl, const std::string& jsonBody) {
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setBody(jsonBody);
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    drogon::HttpResponsePtr response;
    ctrl.login(req, [&response](const drogon::HttpResponsePtr& r) { response = r; });
    return response;
}

TEST(AuthControllerTest, LoginSuccess) {
    auto mockRepo = std::make_shared<MockUserRepository>();
    EXPECT_CALL(*mockRepo, findByCredentials("admin", "admin123", _))
        .WillOnce(Invoke([](const std::string&, const std::string&,
                            std::function<void(std::optional<UserInfo>, std::string)> cb) {
            cb(UserInfo{1, "admin"}, "");
        }));

    AuthController ctrl(mockRepo);
    auto resp = callLogin(ctrl, R"({"username":"admin","password":"admin123"})");

    ASSERT_NE(resp, nullptr);
    EXPECT_EQ(resp->getStatusCode(), drogon::k200OK);
    auto json = *resp->getJsonObject();
    EXPECT_FALSE(json["token"].asString().empty());
    EXPECT_EQ(json["user"]["username"].asString(), "admin");
}

TEST(AuthControllerTest, LoginInvalidCredentials) {
    auto mockRepo = std::make_shared<MockUserRepository>();
    EXPECT_CALL(*mockRepo, findByCredentials("admin", "wrong", _))
        .WillOnce(Invoke([](const std::string&, const std::string&,
                            std::function<void(std::optional<UserInfo>, std::string)> cb) {
            cb(std::nullopt, "");
        }));

    AuthController ctrl(mockRepo);
    auto resp = callLogin(ctrl, R"({"username":"admin","password":"wrong"})");

    ASSERT_NE(resp, nullptr);
    EXPECT_EQ(resp->getStatusCode(), drogon::k401Unauthorized);
}

TEST(AuthControllerTest, LoginMissingFields) {
    auto mockRepo = std::make_shared<MockUserRepository>();
    EXPECT_CALL(*mockRepo, findByCredentials(_, _, _)).Times(0);

    AuthController ctrl(mockRepo);
    auto resp = callLogin(ctrl, R"({"username":"","password":""})");

    ASSERT_NE(resp, nullptr);
    EXPECT_EQ(resp->getStatusCode(), drogon::k400BadRequest);
}

TEST(AuthControllerTest, LoginDatabaseError) {
    auto mockRepo = std::make_shared<MockUserRepository>();
    EXPECT_CALL(*mockRepo, findByCredentials(_, _, _))
        .WillOnce(Invoke([](const std::string&, const std::string&,
                            std::function<void(std::optional<UserInfo>, std::string)> cb) {
            cb(std::nullopt, "connection refused");
        }));

    AuthController ctrl(mockRepo);
    auto resp = callLogin(ctrl, R"({"username":"admin","password":"admin123"})");

    ASSERT_NE(resp, nullptr);
    EXPECT_EQ(resp->getStatusCode(), drogon::k500InternalServerError);
}

TEST(AuthControllerTest, LoginInvalidJson) {
    auto mockRepo = std::make_shared<MockUserRepository>();
    EXPECT_CALL(*mockRepo, findByCredentials(_, _, _)).Times(0);

    AuthController ctrl(mockRepo);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setBody("not json");
    drogon::HttpResponsePtr response;
    ctrl.login(req, [&response](const drogon::HttpResponsePtr& r) { response = r; });

    ASSERT_NE(response, nullptr);
    EXPECT_EQ(response->getStatusCode(), drogon::k400BadRequest);
}
