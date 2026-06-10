package com.jptaxi.application.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties(prefix = "supabase.storage")
@Validated
public record SupabaseStorageProperties(
        @NotBlank String endpoint,
        @NotBlank String region,
        @NotBlank String accessKey,
        @NotBlank String secretKey,
        @NotBlank String bucket,
        @NotBlank String publicUrl
) {

    public SupabaseStorageProperties {
        endpoint = normalize(endpoint);
        region = normalize(region);
        accessKey = normalize(accessKey);
        secretKey = normalize(secretKey);
        bucket = normalize(bucket);
        publicUrl = trimTrailingSlashes(normalize(publicUrl));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private static String trimTrailingSlashes(String value) {
        int end = value.length();
        while (end > 0 && value.charAt(end - 1) == '/') {
            end--;
        }
        return value.substring(0, end);
    }
}
