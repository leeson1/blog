#pragma once
#include <string>
#include <vector>
#include <optional>

struct UserInfo {
    int id = 0;
    std::string username;
    std::string role;
};

struct UserListItem {
    int id = 0;
    std::string username;
    std::string role;
    std::string createdAt;
};

struct ArticleSummary {
    int id = 0;
    int userId = 0;
    std::string username;
    std::string title;
    std::string createdAt;
};

struct CommentItem {
    int id = 0;
    int articleId = 0;
    int userId = 0;
    std::string username;
    std::string content;
    std::string createdAt;
};

struct ArticleDetail {
    int id = 0;
    int userId = 0;
    std::string username;
    std::string title;
    std::string content;
    std::string createdAt;
    std::vector<CommentItem> comments;
};
