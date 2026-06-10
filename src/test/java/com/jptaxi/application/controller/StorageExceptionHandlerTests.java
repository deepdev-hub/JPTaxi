package com.jptaxi.application.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.jptaxi.application.service.SupabaseStorageException;

class StorageExceptionHandlerTests {

    @Test
    void returnsSafeBadGatewayResponseForStorageFailures() {
        StorageExceptionHandler handler = new StorageExceptionHandler();

        ResponseEntity<Map<String, String>> response = handler.handleStorageException(
                new SupabaseStorageException(
                        "Cannot upload image to Supabase Storage",
                        new RuntimeException("secret provider detail")
                )
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(response.getBody()).isEqualTo(Map.of(
                "message",
                "Image storage is temporarily unavailable"
        ));
    }
}
