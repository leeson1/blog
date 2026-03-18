#pragma once
#include <string>
#include <functional>
#include <optional>
#include <vector>
#include "../models/Models.h"

class ICommentRepository {
public:
    virtual ~ICommentRepository() = default;

    virtual void create(
        int articleId, int userId, const std::string& username,
        const std::string& content,
        std::function<void(std::optional<CommentItem>, std::string /*error*/)> callback) = 0;

    virtual void listAll(
        int page, int limit,
        std::function<void(std::vector<CommentItem>, int /*total*/, std::string /*error*/)> callback) = 0;

    virtual void update(
        int id,
        const std::string& content,
        std::function<void(bool, std::string /*error*/)> callback) = 0;

    virtual void remove(
        int id,
        std::function<void(bool, std::string /*error*/)> callback) = 0;
};
