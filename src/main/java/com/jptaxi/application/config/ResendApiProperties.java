package com.jptaxi.application.config;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@ConfigurationProperties(prefix = "resend.api")
@Validated
public record ResendApiProperties(
        @NotBlank String key,
        @NotNull URI url,
        @NotNull Duration connectTimeout,
        @NotNull Duration readTimeout
) {

    public ResendApiProperties {
        key = key == null ? "" : key.trim();
        if (connectTimeout != null && (connectTimeout.isZero() || connectTimeout.isNegative())) {
            throw new IllegalArgumentException("Resend connect timeout must be positive");
        }
        if (readTimeout != null && (readTimeout.isZero() || readTimeout.isNegative())) {
            throw new IllegalArgumentException("Resend read timeout must be positive");
        }
    }
}
