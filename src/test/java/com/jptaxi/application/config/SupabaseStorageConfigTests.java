package com.jptaxi.application.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;

import org.junit.jupiter.api.Test;

import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

class SupabaseStorageConfigTests {

    @Test
    void createsPathStyleClientWithEndpointRegionAndRequiredChecksums() {
        SupabaseStorageConfig config = new SupabaseStorageConfig();
        SupabaseStorageProperties properties = new SupabaseStorageProperties(
                "https://project.storage.supabase.co/storage/v1/s3",
                "ap-southeast-1",
                "access",
                "secret",
                "images",
                "https://project.supabase.co/storage/v1/object/public/images"
        );

        try (S3Client client = config.supabaseS3Client(properties)) {
            assertThat(client.serviceClientConfiguration().endpointOverride())
                    .contains(URI.create(properties.endpoint()));
            assertThat(client.serviceClientConfiguration().region()).isEqualTo(Region.AP_SOUTHEAST_1);
            assertThat(client.serviceClientConfiguration().requestChecksumCalculation())
                    .isEqualTo(RequestChecksumCalculation.WHEN_REQUIRED);
            assertThat(client.serviceClientConfiguration().responseChecksumValidation())
                    .isEqualTo(ResponseChecksumValidation.WHEN_REQUIRED);
            assertThat(config.s3Configuration().pathStyleAccessEnabled()).isTrue();
        }
    }
}
