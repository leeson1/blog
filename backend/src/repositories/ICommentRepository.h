#pragma once
#include <string>
#include <functional>
#include <optional>
#include "../models/Models.h"

class ICommentRepository {
public:
    virtual ~ICommentRepository() = default;

    virtual void create(
        int articleId, int userId, const std::string& username,
        const std::string& content,
        std::function<void(std::optional<CommentItem>, std::string /*error*/)> callback) = 0;
};
