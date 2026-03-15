#pragma once
#include <gmock/gmock.h>
#include "../../src/repositories/ICommentRepository.h"

class MockCommentRepository : public ICommentRepository {
public:
    MOCK_METHOD(void, create,
        (int, int, const std::string&, const std::string&,
         std::function<void(std::optional<CommentItem>, std::string)>),
        (override));
};
