package com.jptaxi.application.dto;

public record ResetPasswordRequest(
        String token,
        String newPassword
) {
}
