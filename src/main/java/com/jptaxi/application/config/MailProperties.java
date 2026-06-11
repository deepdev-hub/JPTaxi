package com.jptaxi.application.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties(prefix = "app.mail")
@Validated
public record MailProperties(
        @NotBlank String from
) {

    public MailProperties {
        from = from == null ? "" : from.trim();
    }
}
