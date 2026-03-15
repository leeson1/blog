#pragma once
#include <drogon/HttpController.h>
#include "../repositories/ICommentRepository.h"
#include "../utils/AuthManager.h"
#include <memory>
#include <optional>

class CommentController : public drogon::HttpController<CommentController> {
public:
    CommentController();
    explicit CommentController(std::shared_ptr<ICommentRepository> commentRepo);

    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CommentController::createComment, "/api/articles/{id}/comments", drogon::Post);
    METHOD_LIST_END

    void createComment(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id);

private:
    std::shared_ptr<ICommentRepository> commentRepo_;
    std::optional<UserInfo> getAuthUser(const drogon::HttpRequestPtr& req);
};
