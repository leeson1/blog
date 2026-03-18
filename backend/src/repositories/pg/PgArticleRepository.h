#pragma once
#include "../IArticleRepository.h"
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>

class PgArticleRepository : public IArticleRepository {
public:
    void findAll(std::function<void(std::vector<ArticleSummary>, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "SELECT id, user_id, username, title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at FROM articles ORDER BY id DESC",
            [cb](const drogon::orm::Result& r) {
                std::vector<ArticleSummary> list;
                for (const auto& row : r) {
                    list.push_back({
                        row["id"].as<int>(),
                        row["user_id"].as<int>(),
                        row["username"].as<std::string>(),
                        row["title"].as<std::string>(),
                        row["created_at"].as<std::string>()
                    });
                }
                (*cb)(std::move(list), "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)({}, e.base().what());
            }
        );
    }

    void findById(int id, std::function<void(std::optional<ArticleDetail>, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "SELECT id, user_id, username, title, content, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at FROM articles WHERE id=$1",
            [cb, id, db](const drogon::orm::Result& r) mutable {
                if (r.empty()) { (*cb)(std::nullopt, ""); return; }
                auto article = std::make_shared<ArticleDetail>();
                article->id = r[0]["id"].as<int>();
                article->userId = r[0]["user_id"].as<int>();
                article->username = r[0]["username"].as<std::string>();
                article->title = r[0]["title"].as<std::string>();
                article->content = r[0]["content"].as<std::string>();
                article->createdAt = r[0]["created_at"].as<std::string>();

                db->execSqlAsync(
                    "SELECT id, article_id, user_id, username, content, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at FROM comments WHERE article_id=$1 ORDER BY id ASC",
                    [cb, article](const drogon::orm::Result& cr) {
                        for (const auto& row : cr) {
                            article->comments.push_back({
                                row["id"].as<int>(),
                                row["article_id"].as<int>(),
                                row["user_id"].as<int>(),
                                row["username"].as<std::string>(),
                                row["content"].as<std::string>(),
                                row["created_at"].as<std::string>()
                            });
                        }
                        (*cb)(*article, "");
                    },
                    [cb](const drogon::orm::DrogonDbException& e) {
                        (*cb)(std::nullopt, e.base().what());
                    },
                    id
                );
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)(std::nullopt, e.base().what());
            },
            id
        );
    }

    void create(int userId, const std::string& username,
                const std::string& title, const std::string& content,
                std::function<void(std::optional<ArticleDetail>, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "INSERT INTO articles (user_id, username, title, content) VALUES ($1,$2,$3,$4) RETURNING id, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at",
            [cb, userId, username, title, content](const drogon::orm::Result& r) {
                ArticleDetail a;
                a.id = r[0]["id"].as<int>();
                a.userId = userId;
                a.username = username;
                a.title = title;
                a.content = content;
                a.createdAt = r[0]["created_at"].as<std::string>();
                (*cb)(a, "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)(std::nullopt, e.base().what());
            },
            userId, username, title, content
        );
    }

    void findAllPaginated(int page, int limit,
                          std::function<void(std::vector<ArticleSummary>, int, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        int offset = (page - 1) * limit;
        db->execSqlAsync(
            "SELECT id, user_id, username, title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') as created_at, COUNT(*) OVER() as total FROM articles ORDER BY id DESC LIMIT $1 OFFSET $2",
            [cb](const drogon::orm::Result& r) {
                std::vector<ArticleSummary> list;
                int total = 0;
                for (const auto& row : r) {
                    total = row["total"].as<int>();
                    list.push_back({ row["id"].as<int>(), row["user_id"].as<int>(),
                                     row["username"].as<std::string>(), row["title"].as<std::string>(),
                                     row["created_at"].as<std::string>() });
                }
                (*cb)(std::move(list), total, "");
            },
            [cb](const drogon::orm::DrogonDbException& e) {
                (*cb)({}, 0, e.base().what());
            },
            limit, offset
        );
    }

    void update(int id, const std::string& title, const std::string& content,
                std::function<void(bool, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "UPDATE articles SET title=$1, content=$2 WHERE id=$3",
            [cb](const drogon::orm::Result&) { (*cb)(true, ""); },
            [cb](const drogon::orm::DrogonDbException& e) { (*cb)(false, e.base().what()); },
            title, content, id
        );
    }

    void remove(int id, std::function<void(bool, std::string)> callback) override {
        auto cb = std::make_shared<decltype(callback)>(std::move(callback));
        auto db = drogon::app().getDbClient();
        db->execSqlAsync(
            "DELETE FROM articles WHERE id=$1",
            [cb](const drogon::orm::Result&) { (*cb)(true, ""); },
            [cb](const drogon::orm::DrogonDbException& e) { (*cb)(false, e.base().what()); },
            id
        );
    }
};
