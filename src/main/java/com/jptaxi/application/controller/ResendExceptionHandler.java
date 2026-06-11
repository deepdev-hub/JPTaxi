package com.jptaxi.application.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.jptaxi.application.service.ResendEmailException;

@RestControllerAdvice
public class ResendExceptionHandler {

    @ExceptionHandler(ResendEmailException.class)
    public ResponseEntity<Map<String, String>> handleResendException(ResendEmailException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("message", "Email delivery is temporarily unavailable"));
    }
}
