-- 博客系统表结构
-- 创建时间：2026-03-19

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    role       VARCHAR(10)  NOT NULL DEFAULT 'user',
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL,
    username   VARCHAR(50)  NOT NULL,
    title      VARCHAR(500) NOT NULL,
    content    TEXT         NOT NULL DEFAULT '',
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id         SERIAL PRIMARY KEY,
    article_id INTEGER      NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id    INTEGER      NOT NULL,
    username   VARCHAR(50)  NOT NULL,
    content    TEXT         NOT NULL,
    created_at TIMESTAMP    DEFAULT NOW()
);
