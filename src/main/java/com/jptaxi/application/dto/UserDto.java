package com.jptaxi.application.dto;

import com.jptaxi.application.entity.UserRole;

public record UserDto(
        String id,
        String name,
        String nameJp,
        String email,
        String phone,
        String address,
        UserRole role,
        String avatar
) {
}
