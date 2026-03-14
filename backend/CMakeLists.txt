cmake_minimum_required(VERSION 3.16)
project(blog_backend)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Drogon REQUIRED)

add_executable(blog_backend
    src/main.cc
    src/controllers/AuthController.cc
    src/controllers/ArticleController.cc
    src/controllers/CommentController.cc
    src/controllers/UploadController.cc
)

target_include_directories(blog_backend PRIVATE src)
target_link_libraries(blog_backend PRIVATE Drogon::Drogon)
