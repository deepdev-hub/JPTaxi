package com.jptaxi.application.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.storage.migration.enabled", havingValue = "true")
public class LegacyImageMigrationRunner implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(LegacyImageMigrationRunner.class);

    private final SupabaseStorageService storageService;
    private final JdbcTemplate jdbcTemplate;
    private final Path uploadsRoot;

    public LegacyImageMigrationRunner(
            SupabaseStorageService storageService,
            JdbcTemplate jdbcTemplate,
            @Value("${app.storage.migration.root:uploads}") String uploadsRoot
    ) {
        this.storageService = storageService;
        this.jdbcTemplate = jdbcTemplate;
        this.uploadsRoot = Paths.get(uploadsRoot).toAbsolutePath().normalize();
    }

    @Override
    public void run(ApplicationArguments args) {
        MigrationStats stats = new MigrationStats();
        migrateDirectory("restaurants", StorageImageType.RESTAURANT, stats);
        migrateDirectory("menu_items", StorageImageType.MENU_ITEM, stats);
        migrateDirectory("reviews", StorageImageType.REVIEW, stats);

        LOGGER.info(
                "Legacy image migration finished: {} files uploaded, {} database rows updated, {} errors",
                stats.uploadedFiles,
                stats.updatedRows,
                stats.errors
        );
    }

    private void migrateDirectory(String directoryName, StorageImageType imageType, MigrationStats stats) {
        Path directory = uploadsRoot.resolve(directoryName).normalize();
        if (!directory.startsWith(uploadsRoot) || !Files.isDirectory(directory)) {
            LOGGER.info("Legacy image directory does not exist, skipping: {}", directory);
            return;
        }

        for (Path image : listImages(directory)) {
            try {
                String publicUrl = storageService.uploadExisting(image, imageType);
                stats.uploadedFiles++;
                stats.updatedRows += updateDatabaseReferences(imageType, image.getFileName().toString(), publicUrl);
            } catch (RuntimeException exception) {
                stats.errors++;
                LOGGER.error("Failed to migrate legacy image {}", image, exception);
            }
        }
    }

    private List<Path> listImages(Path directory) {
        try (var paths = Files.list(directory)) {
            return paths
                    .filter(Files::isRegularFile)
                    .filter(this::hasSupportedExtension)
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        } catch (IOException exception) {
            throw new SupabaseStorageException("Cannot scan legacy image directory " + directory, exception);
        }
    }

    private boolean hasSupportedExtension(Path path) {
        String filename = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return filename.endsWith(".jpg")
                || filename.endsWith(".jpeg")
                || filename.endsWith(".png")
                || filename.endsWith(".webp");
    }

    private int updateDatabaseReferences(StorageImageType imageType, String filename, String publicUrl) {
        return switch (imageType) {
            case RESTAURANT -> updateRestaurantReferences(filename, publicUrl);
            case MENU_ITEM -> updateMenuReferences(filename, publicUrl, "menu_items");
            case REVIEW -> updateColumn(
                    "UPDATE review_images SET image_url = ? "
                            + "WHERE (image_url LIKE ? OR image_url LIKE ? OR image_url = ?)",
                    publicUrl,
                    "%/api/reviews/images/" + filename,
                    "%/uploads/reviews/" + filename,
                    "uploads/reviews/" + filename
            );
        };
    }

    private int updateRestaurantReferences(String filename, String publicUrl) {
        int updatedRows = updateColumn(
                "UPDATE restaurants SET cover_image = ? "
                        + "WHERE (cover_image LIKE ? OR cover_image LIKE ? OR cover_image = ?)",
                publicUrl,
                "%/api/restaurants/images/" + filename,
                "%/uploads/restaurants/" + filename,
                "uploads/restaurants/" + filename
        );
        updatedRows += updateColumn(
                "UPDATE restaurant_images SET image_url = ? "
                        + "WHERE (image_url LIKE ? OR image_url LIKE ? OR image_url = ?)",
                publicUrl,
                "%/api/restaurants/images/" + filename,
                "%/uploads/restaurants/" + filename,
                "uploads/restaurants/" + filename
        );

        // Older frontend code uploaded menu images through the restaurant image endpoint.
        updatedRows += updateMenuReferences(filename, publicUrl, "restaurants");
        return updatedRows;
    }

    private int updateMenuReferences(String filename, String publicUrl, String legacyDirectory) {
        String endpoint = legacyDirectory.equals("restaurants")
                ? "%/api/restaurants/images/" + filename
                : "%/api/restaurants/menu-images/" + filename;
        return updateColumn(
                "UPDATE menu_items SET image = ? "
                        + "WHERE (image LIKE ? OR image LIKE ? OR image = ?)",
                publicUrl,
                endpoint,
                "%/uploads/" + legacyDirectory + "/" + filename,
                "uploads/" + legacyDirectory + "/" + filename
        );
    }

    private int updateColumn(String sql, Object... arguments) {
        return jdbcTemplate.update(sql, arguments);
    }

    private static final class MigrationStats {
        private int uploadedFiles;
        private int updatedRows;
        private int errors;
    }
}
