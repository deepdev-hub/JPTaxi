package com.jptaxi.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

class LegacyImageMigrationRunnerTests {

    @TempDir
    Path tempDirectory;

    @Test
    void uploadsEachLegacyDirectoryAndUpdatesAllImageColumnsUsingLocalUrlPatterns() throws Exception {
        Path uploads = tempDirectory.resolve("uploads");
        Path restaurantImage = createImage(uploads.resolve("restaurants/restaurant-one.jpg"));
        Path menuImage = createImage(uploads.resolve("menu_items/menu-one.png"));
        Path reviewImage = createImage(uploads.resolve("reviews/review-one.webp"));
        SupabaseStorageService storageService = mock(SupabaseStorageService.class);
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(storageService.uploadExisting(restaurantImage, StorageImageType.RESTAURANT))
                .thenReturn("https://cdn/restaurants/restaurant-one.jpg");
        when(storageService.uploadExisting(menuImage, StorageImageType.MENU_ITEM))
                .thenReturn("https://cdn/menu-items/menu-one.png");
        when(storageService.uploadExisting(reviewImage, StorageImageType.REVIEW))
                .thenReturn("https://cdn/reviews/review-one.webp");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        LegacyImageMigrationRunner runner = new LegacyImageMigrationRunner(
                storageService,
                jdbcTemplate,
                uploads.toString()
        );

        runner.run(null);

        verify(storageService).uploadExisting(restaurantImage, StorageImageType.RESTAURANT);
        verify(storageService).uploadExisting(menuImage, StorageImageType.MENU_ITEM);
        verify(storageService).uploadExisting(reviewImage, StorageImageType.REVIEW);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate, times(5)).update(sqlCaptor.capture(), any(Object[].class));
        assertThat(sqlCaptor.getAllValues())
                .anyMatch(sql -> sql.contains("UPDATE restaurants SET cover_image"))
                .anyMatch(sql -> sql.contains("UPDATE restaurant_images SET image_url"))
                .anyMatch(sql -> sql.contains("UPDATE menu_items SET image"))
                .anyMatch(sql -> sql.contains("UPDATE review_images SET image_url"))
                .allMatch(sql -> sql.contains("LIKE"));
    }

    private Path createImage(Path path) throws Exception {
        Files.createDirectories(path.getParent());
        return Files.writeString(path, "image");
    }
}
