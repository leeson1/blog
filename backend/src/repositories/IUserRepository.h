#pragma once
#include <string>
#include <functional>
#include <optional>
#include <vector>
#include "../models/Models.h"

class IUserRepository {
public:
    virtual ~IUserRepository() = default;

    virtual void findByCredentials(
        const std::string& username,
        const std::string& password,
        std::function<void(std::optional<UserInfo>, std::string /*error*/)> callback) = 0;

    virtual void listUsers(
        std::function<void(std::vector<UserListItem>, std::string /*error*/)> callback) = 0;

    virtual void createUser(
        const std::string& username,
        const std::string& password,
        const std::string& role,
        std::function<void(std::optional<UserListItem>, std::string /*error*/)> callback) = 0;

    virtual void deleteUser(
        int id,
        std::function<void(bool, std::string /*error*/)> callback) = 0;
};
