package com.jptaxi.application.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.jptaxi.application.service.SupabaseStorageException;

@RestControllerAdvice
public class StorageExceptionHandler {

    @ExceptionHandler(SupabaseStorageException.class)
    public ResponseEntity<Map<String, String>> handleStorageException(SupabaseStorageException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("message", "Image storage is temporarily unavailable"));
    }
}
