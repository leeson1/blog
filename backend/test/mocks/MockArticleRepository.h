#pragma once
#include <gmock/gmock.h>
#include "../../src/repositories/IArticleRepository.h"

class MockArticleRepository : public IArticleRepository {
public:
    MOCK_METHOD(void, findAll,
        (std::function<void(std::vector<ArticleSummary>, std::string)>),
        (override));
    MOCK_METHOD(void, findById,
        (int, std::function<void(std::optional<ArticleDetail>, std::string)>),
        (override));
    MOCK_METHOD(void, create,
        (int, const std::string&, const std::string&, const std::string&,
         std::function<void(std::optional<ArticleDetail>, std::string)>),
        (override));
};
