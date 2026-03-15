#pragma once
#include <string>
#include <functional>
#include <vector>
#include <optional>
#include "../models/Models.h"

class IArticleRepository {
public:
    virtual ~IArticleRepository() = default;

    virtual void findAll(
        std::function<void(std::vector<ArticleSummary>, std::string /*error*/)> callback) = 0;

    virtual void findById(
        int id,
        std::function<void(std::optional<ArticleDetail>, std::string /*error*/)> callback) = 0;

    virtual void create(
        int userId, const std::string& username,
        const std::string& title, const std::string& content,
        std::function<void(std::optional<ArticleDetail>, std::string /*error*/)> callback) = 0;
};
