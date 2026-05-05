package com.jptaxi.application.dto;

public record LoginRequest(
        String email,
        String password
) {
}
