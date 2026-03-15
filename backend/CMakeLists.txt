cmake_minimum_required(VERSION 3.16)
project(blog_backend)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Drogon REQUIRED)

# 主程序
add_executable(blog_backend
    src/main.cc
    src/controllers/AuthController.cc
    src/controllers/ArticleController.cc
    src/controllers/CommentController.cc
    src/controllers/UploadController.cc
)
target_include_directories(blog_backend PRIVATE src)
target_link_libraries(blog_backend PRIVATE Drogon::Drogon)

# 单元测试
option(BUILD_TESTS "Build unit tests" ON)
if(BUILD_TESTS)
    enable_testing()
    include(FetchContent)
    FetchContent_Declare(
        googletest
        URL https://github.com/google/googletest/archive/v1.14.0.tar.gz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)

    add_executable(blog_tests
        test/test_auth_controller.cc
        test/test_article_controller.cc
        test/test_comment_controller.cc
        src/controllers/AuthController.cc
        src/controllers/ArticleController.cc
        src/controllers/CommentController.cc
    )
    target_include_directories(blog_tests PRIVATE src)
    target_link_libraries(blog_tests PRIVATE
        GTest::gtest_main
        GTest::gmock_main
        Drogon::Drogon
    )
    add_test(NAME blog_tests COMMAND blog_tests)
endif()
