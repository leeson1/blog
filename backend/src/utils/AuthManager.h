#pragma once
#include <string>
#include <unordered_map>
#include <mutex>
#include <random>
#include <sstream>
#include <iomanip>
#include "../models/Models.h"

class AuthManager {
public:
    static AuthManager& instance() {
        static AuthManager inst;
        return inst;
    }

    std::string createToken(const UserInfo& user) {
        std::string token = generateToken();
        std::lock_guard<std::mutex> lock(mutex_);
        tokens_[token] = user;
        return token;
    }

    bool validateToken(const std::string& token, UserInfo& user) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = tokens_.find(token);
        if (it == tokens_.end()) return false;
        user = it->second;
        return true;
    }

    void removeToken(const std::string& token) {
        std::lock_guard<std::mutex> lock(mutex_);
        tokens_.erase(token);
    }

private:
    std::unordered_map<std::string, UserInfo> tokens_;
    std::mutex mutex_;

    AuthManager() = default;
    AuthManager(const AuthManager&) = delete;
    AuthManager& operator=(const AuthManager&) = delete;

    std::string generateToken() {
        std::random_device rd;
        std::mt19937_64 gen(rd());
        std::uniform_int_distribution<uint64_t> dis;

        std::ostringstream oss;
        oss << std::hex << std::setfill('0');
        oss << std::setw(16) << dis(gen);
        oss << std::setw(16) << dis(gen);
        return oss.str();
    }
};
