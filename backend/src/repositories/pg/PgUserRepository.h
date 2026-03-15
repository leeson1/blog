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
            "SELECT id, username FROM users WHERE username=$1 AND password=$2",
            [cb](const drogon::orm::Result& r) {
                if (r.empty()) { (*cb)(std::nullopt, ""); return; }
                UserInfo u{ r[0]["id"].as<int>(), r[0]["username"].as<std::string>() };
                (*cb)(u, "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)(std::nullopt, e.base().what());
            },
            username, password
        );
    }
};
