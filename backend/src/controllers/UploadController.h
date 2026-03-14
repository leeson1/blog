#pragma once
#include <drogon/HttpController.h>
#include "../utils/AuthManager.h"
#include <optional>

class UploadController : public drogon::HttpController<UploadController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(UploadController::uploadImage, "/api/upload/image", drogon::Post);
    ADD_METHOD_TO(UploadController::serveImage, "/data/image/{filename}", drogon::Get);
    METHOD_LIST_END

    void uploadImage(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    void serveImage(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    const std::string& filename);

private:
    std::optional<UserInfo> getAuthUser(const drogon::HttpRequestPtr& req);
};
