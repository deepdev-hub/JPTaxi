package com.jptaxi.application.dto;

import com.jptaxi.application.entity.UserRole;

public record UpdateUserRequest(
        String name,
        String nameJp,
        String email,
        String password,
        String phone,
        String address,
        UserRole role,
        String avatar
) {
}
