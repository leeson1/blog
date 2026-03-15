#pragma once
#include <gmock/gmock.h>
#include "../../src/repositories/IUserRepository.h"

class MockUserRepository : public IUserRepository {
public:
    MOCK_METHOD(void, findByCredentials,
        (const std::string&, const std::string&,
         std::function<void(std::optional<UserInfo>, std::string)>),
        (override));
};
