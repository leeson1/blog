#pragma once
#include <drogon/HttpController.h>
#include "../repositories/IUserRepository.h"
#include "../utils/AuthManager.h"
#include <memory>

class AuthController : public drogon::HttpController<AuthController> {
public:
    AuthController();
    explicit AuthController(std::shared_ptr<IUserRepository> userRepo);

    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuthController::login, "/api/login", drogon::Post);
    METHOD_LIST_END

    void login(const drogon::HttpRequestPtr& req,
               std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<IUserRepository> userRepo_;
};
