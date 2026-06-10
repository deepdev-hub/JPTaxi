package com.jptaxi.application.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.jptaxi.application.config.SupabaseStorageProperties;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class SupabaseStorageService {

    public static final long MAX_IMAGE_SIZE_BYTES = 10L * 1024L * 1024L;
    public static final String PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";
    private static final List<String> ALLOWED_IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    private final S3Client s3Client;
    private final SupabaseStorageProperties properties;

    public SupabaseStorageService(S3Client s3Client, SupabaseStorageProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    public String upload(MultipartFile file, StorageImageType imageType) {
        validateImage(file);

        try {
            byte[] bytes = file.getBytes();
            return uploadBytes(
                    bytes,
                    normalizedContentType(file.getContentType()),
                    extensionFor(file.getOriginalFilename()),
                    imageType
            );
        } catch (IOException exception) {
            throw new SupabaseStorageException("Cannot read image data", exception);
        }
    }

    public List<String> uploadAll(
            List<MultipartFile> files,
            StorageImageType imageType,
            int maxCount,
            String tooManyImagesMessage
    ) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }

        List<MultipartFile> images = files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();
        if (images.size() > maxCount) {
            throw new ImageValidationException(tooManyImagesMessage);
        }

        List<String> uploadedUrls = new ArrayList<>();
        try {
            for (MultipartFile image : images) {
                uploadedUrls.add(upload(image, imageType));
            }
            return List.copyOf(uploadedUrls);
        } catch (RuntimeException exception) {
            try {
                deleteUrls(uploadedUrls);
            } catch (RuntimeException cleanupException) {
                exception.addSuppressed(cleanupException);
            }
            throw exception;
        }
    }

    public String uploadBase64Image(String dataUrl, StorageImageType imageType) {
        if (dataUrl == null || !dataUrl.startsWith("data:image/")) {
            throw new ImageValidationException("Invalid base64 image");
        }

        int commaIndex = dataUrl.indexOf(',');
        if (commaIndex < 0 || !dataUrl.substring(0, commaIndex).endsWith(";base64")) {
            throw new ImageValidationException("Invalid base64 image");
        }

        String contentType = normalizedContentType(dataUrl.substring("data:".length(), dataUrl.indexOf(';')));
        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new ImageValidationException("Only jpg, jpeg, png, and webp images are allowed");
        }

        try {
            byte[] bytes = Base64.getDecoder().decode(dataUrl.substring(commaIndex + 1));
            if (bytes.length > MAX_IMAGE_SIZE_BYTES) {
                throw new ImageValidationException("Each image must be 10MB or smaller");
            }
            return uploadBytes(bytes, contentType, extensionForContentType(contentType), imageType);
        } catch (IllegalArgumentException exception) {
            if (exception instanceof ImageValidationException) {
                throw exception;
            }
            throw new ImageValidationException("Invalid base64 image");
        }
    }

    public String publicUrlForKey(String key) {
        return properties.publicUrl() + "/" + key;
    }

    public void deleteUrls(Collection<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return;
        }

        urls.stream()
                .map(this::objectKeyFromPublicUrl)
                .filter(key -> key != null && !key.isBlank())
                .distinct()
                .forEach(this::deleteObject);
    }

    public boolean isManagedUrl(String url) {
        return objectKeyFromPublicUrl(url) != null;
    }

    private void putObject(String key, byte[] bytes, String contentType) {
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .contentType(contentType)
                    .cacheControl(PUBLIC_CACHE_CONTROL)
                    .build();
            s3Client.putObject(request, RequestBody.fromBytes(bytes));
        } catch (RuntimeException exception) {
            throw new SupabaseStorageException("Cannot upload image to Supabase Storage", exception);
        }
    }

    private void deleteObject(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .build());
        } catch (RuntimeException exception) {
            throw new SupabaseStorageException("Cannot delete image from Supabase Storage", exception);
        }
    }

    private String objectKeyFromPublicUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        String prefix = properties.publicUrl() + "/";
        if (!url.startsWith(prefix)) {
            return null;
        }

        String key = url.substring(prefix.length());
        if (key.isBlank() || key.contains("..") || key.contains("?") || key.contains("#")) {
            return null;
        }
        return key;
    }

    private String uploadBytes(
            byte[] bytes,
            String contentType,
            String extension,
            StorageImageType imageType
    ) {
        String key = imageType.directory()
                + "/"
                + imageType.filePrefix()
                + UUID.randomUUID()
                + extension;
        putObject(key, bytes, contentType);
        return publicUrlForKey(key);
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ImageValidationException("Image is required");
        }
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new ImageValidationException("Each image must be 10MB or smaller");
        }

        String contentType = normalizedContentType(file.getContentType());
        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new ImageValidationException("Only jpg, jpeg, png, and webp images are allowed");
        }

        extensionFor(file.getOriginalFilename());
    }

    private String normalizedContentType(String contentType) {
        return contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
    }

    private String extensionFor(String originalFilename) {
        String filename = originalFilename == null ? "" : originalFilename.toLowerCase(Locale.ROOT);
        if (filename.endsWith(".jpeg")) return ".jpeg";
        if (filename.endsWith(".jpg")) return ".jpg";
        if (filename.endsWith(".png")) return ".png";
        if (filename.endsWith(".webp")) return ".webp";
        throw new ImageValidationException("Only jpg, jpeg, png, and webp images are allowed");
    }

    private String extensionForContentType(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ImageValidationException("Only jpg, jpeg, png, and webp images are allowed");
        };
    }

}
