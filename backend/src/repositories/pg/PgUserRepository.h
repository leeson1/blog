#pragma once
#include "../IUserRepository.h"
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>

class PgUserRepository : public IUserRepository {
public:
    void findByCredentials(
        const std::string& username,
        const std::string& password,
        std::function<void(std::optional<UserInfo>, std::string)> callback) override
    {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "SELECT id, username, role FROM users WHERE username=$1 AND password=$2",
            [cb](const drogon::orm::Result& r) {
                if (r.empty()) { (*cb)(std::nullopt, ""); return; }
                UserInfo u{ r[0]["id"].as<int>(), r[0]["username"].as<std::string>(), r[0]["role"].as<std::string>() };
                (*cb)(u, "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)(std::nullopt, e.base().what());
            },
            username, password
        );
    }

    void listUsers(
        std::function<void(std::vector<UserListItem>, std::string)> callback) override
    {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "SELECT id, username, role, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at FROM users ORDER BY id ASC",
            [cb](const drogon::orm::Result& r) {
                std::vector<UserListItem> list;
                for (const auto& row : r) {
                    list.push_back({ row["id"].as<int>(), row["username"].as<std::string>(),
                                     row["role"].as<std::string>(), row["created_at"].as<std::string>() });
                }
                (*cb)(std::move(list), "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)({}, e.base().what());
            }
        );
    }

    void createUser(
        const std::string& username,
        const std::string& password,
        const std::string& role,
        std::function<void(std::optional<UserListItem>, std::string)> callback) override
    {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "INSERT INTO users (username, password, role) VALUES ($1,$2,$3) RETURNING id, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at",
            [cb, username, role](const drogon::orm::Result& r) {
                UserListItem u{ r[0]["id"].as<int>(), username, role, r[0]["created_at"].as<std::string>() };
                (*cb)(u, "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)(std::nullopt, e.base().what());
            },
            username, password, role
        );
    }

    void deleteUser(
        int id,
        std::function<void(bool, std::string)> callback) override
    {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "DELETE FROM users WHERE id=$1",
            [cb](const drogon::orm::Result&) { (*cb)(true, ""); },
            [cb](const drogon::orm::DrogonDbException& e) { (*cb)(false, e.base().what()); },
            id
        );
    }
};
