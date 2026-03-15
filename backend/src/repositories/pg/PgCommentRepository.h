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
};
