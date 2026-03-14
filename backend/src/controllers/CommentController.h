#pragma once
#include <drogon/HttpController.h>
#include "../utils/AuthManager.h"
#include <optional>

class CommentController : public drogon::HttpController<CommentController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CommentController::createComment, "/api/articles/{id}/comments", drogon::Post);
    METHOD_LIST_END

    void createComment(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                       int id);

private:
    std::optional<UserInfo> getAuthUser(const drogon::HttpRequestPtr& req);
};
