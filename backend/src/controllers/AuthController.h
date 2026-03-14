#pragma once
#include <drogon/HttpController.h>
#include "../utils/AuthManager.h"
#include <string>

class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuthController::login, "/api/login", drogon::Post);
    METHOD_LIST_END

    void login(const drogon::HttpRequestPtr& req,
               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
};
