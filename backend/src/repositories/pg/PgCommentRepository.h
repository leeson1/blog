#pragma once
#include "../ICommentRepository.h"
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>

class PgCommentRepository : public ICommentRepository {
public:
    void create(int articleId, int userId, const std::string& username,
                const std::string& content,
                std::function<void(std::optional<CommentItem>, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "INSERT INTO comments (article_id, user_id, username, content) VALUES ($1,$2,$3,$4) RETURNING id, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at",
            [cb, articleId, userId, username, content](const drogon::orm::Result& r) {
                CommentItem c;
                c.id = r[0]["id"].as<int>();
                c.articleId = articleId;
                c.userId = userId;
                c.username = username;
                c.content = content;
                c.createdAt = r[0]["created_at"].as<std::string>();
                (*cb)(c, "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)(std::nullopt, e.base().what());
            },
            articleId, userId, username, content
        );
    }

    void listAll(int page, int limit,
                 std::function<void(std::vector<CommentItem>, int, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        int offset = (page - 1) * limit;
        db->execSqlAsync(
            "SELECT id, article_id, user_id, username, content, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at, COUNT(*) OVER() as total FROM comments ORDER BY id DESC LIMIT $1 OFFSET $2",
            [cb](const drogon::orm::Result& r) {
                std::vector<CommentItem> list;
                int total = 0;
                for (const auto& row : r) {
                    total = row["total"].as<int>();
                    list.push_back({ row["id"].as<int>(), row["article_id"].as<int>(),
                                     row["user_id"].as<int>(), row["username"].as<std::string>(),
                                     row["content"].as<std::string>(), row["created_at"].as<std::string>() });
                }
                (*cb)(std::move(list), total, "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)({}, 0, e.base().what());
            },
            limit, offset
        );
    }

    void update(int id, const std::string& content,
                std::function<void(bool, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "UPDATE comments SET content=$1 WHERE id=$2",
            [cb](const drogon::orm::Result&) { (*cb)(true, ""); },
            [cb](const drogon::orm::DrogonDbException& e) { (*cb)(false, e.base().what()); },
            content, id
        );
    }

    void remove(int id, std::function<void(bool, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "DELETE FROM comments WHERE id=$1",
            [cb](const drogon::orm::Result&) { (*cb)(true, ""); },
            [cb](const drogon::orm::DrogonDbException& e) { (*cb)(false, e.base().what()); },
            id
        );
    }
};
