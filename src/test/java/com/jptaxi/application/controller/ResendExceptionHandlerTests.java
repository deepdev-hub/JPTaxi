package com.jptaxi.application.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.jptaxi.application.service.ResendEmailException;

class ResendExceptionHandlerTests {

    @Test
    void returnsSafeBadGatewayResponseForResendFailures() {
        ResendExceptionHandler handler = new ResendExceptionHandler();

        ResponseEntity<Map<String, String>> response = handler.handleResendException(
                new ResendEmailException("provider detail")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(response.getBody()).isEqualTo(Map.of(
                "message",
                "Email delivery is temporarily unavailable"
        ));
    }
}
