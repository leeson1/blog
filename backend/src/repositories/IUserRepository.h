#pragma once
#include <string>
#include <functional>
#include <optional>
#include "../models/Models.h"

class IUserRepository {
public:
    virtual ~IUserRepository() = default;
    virtual void findByCredentials(
        const std::string& username,
        const std::string& password,
        std::function<void(std::optional<UserInfo>, std::string /*error*/)> callback) = 0;
};
