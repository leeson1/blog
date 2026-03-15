#include "UploadController.h"
#include "../utils/AuthManager.h"
#include <drogon/HttpResponse.h>
#include <drogon/MultiPart.h>
#include <json/json.h>
#include <fstream>
#include <random>
#include <sstream>
#include <iomanip>
#include <filesystem>
#include <algorithm>
#include <chrono>

extern std::string g_imageDir;

std::optional<UserInfo> UploadController::getAuthUser(const drogon::HttpRequestPtr& req) {
    auto auth = req->getHeader("Authorization");
    if (auth.size() < 7 || auth.substr(0, 7) != "Bearer ") return std::nullopt;
    UserInfo user;
    if (!AuthManager::instance().validateToken(auth.substr(7), user)) return std::nullopt;
    return user;
}

static std::string generateFilename(const std::string& ext) {
    std::random_device rd;
    std::mt19937_64 gen(rd());
    std::uniform_int_distribution<uint64_t> dis;
    auto now = std::chrono::system_clock::now().time_since_epoch().count();
    std::ostringstream oss;
    oss << std::hex << now << "_" << dis(gen);
    return oss.str() + ext;
}

void UploadController::uploadImage(const drogon::HttpRequestPtr& req,
                                    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto userOpt = getAuthUser(req);
    if (!userOpt) {
        Json::Value err; err["error"] = "Unauthorized";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k401Unauthorized);
        callback(r); return;
    }

    drogon::MultiPartParser parser;
    if (parser.parse(req) != 0) {
        Json::Value err; err["error"] = "Failed to parse multipart data";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    const auto& files = parser.getFiles();
    if (files.empty()) {
        Json::Value err; err["error"] = "No file uploaded";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    const auto& file = files[0];
    std::string origName = file.getFileName();
    std::string ext = ".jpg";
    size_t dotPos = origName.rfind('.');
    if (dotPos != std::string::npos) {
        ext = origName.substr(dotPos);
        std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
    }

    if (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp") {
        Json::Value err; err["error"] = "Invalid file type";
        auto r = drogon::HttpResponse::newHttpJsonResponse(err);
        r->setStatusCode(drogon::k400BadRequest);
        callback(r); return;
    }

    std::string filename = generateFilename(ext);
    std::string savePath = g_imageDir + "/" + filename;
    file.saveAs(savePath);

    Json::Value result;
    result["url"] = "/data/image/" + filename;
    callback(drogon::HttpResponse::newHttpJsonResponse(result));
}

void UploadController::serveImage(const drogon::HttpRequestPtr& req,
                                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                   const std::string& filename) {
    if (filename.find("..") != std::string::npos || filename.find('/') != std::string::npos) {
        auto r = drogon::HttpResponse::newHttpResponse();
        r->setStatusCode(drogon::k403Forbidden);
        callback(r); return;
    }

    std::string filePath = g_imageDir + "/" + filename;
    if (!std::filesystem::exists(filePath)) {
        auto r = drogon::HttpResponse::newHttpResponse();
        r->setStatusCode(drogon::k404NotFound);
        callback(r); return;
    }

    std::ifstream ifs(filePath, std::ios::binary);
    if (!ifs.is_open()) {
        auto r = drogon::HttpResponse::newHttpResponse();
        r->setStatusCode(drogon::k500InternalServerError);
        callback(r); return;
    }

    std::string content((std::istreambuf_iterator<char>(ifs)), std::istreambuf_iterator<char>());
    std::string ext;
    size_t dotPos = filename.rfind('.');
    if (dotPos != std::string::npos) {
        ext = filename.substr(dotPos);
        std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
    }

    std::string contentType = "image/jpeg";
    if (ext == ".png") contentType = "image/png";
    else if (ext == ".gif") contentType = "image/gif";
    else if (ext == ".webp") contentType = "image/webp";

    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setBody(content);
    resp->setContentTypeString(contentType);
    callback(resp);
}
