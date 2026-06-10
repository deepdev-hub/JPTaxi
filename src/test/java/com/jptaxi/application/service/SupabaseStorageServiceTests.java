package com.jptaxi.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import com.jptaxi.application.config.SupabaseStorageProperties;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

class SupabaseStorageServiceTests {

    @TempDir
    Path tempDirectory;

    @Test
    void uploadsRestaurantImageWithPublicCachingAndReturnsPublicUrl() {
        S3Client s3Client = mock(S3Client.class);
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());
        SupabaseStorageProperties properties = new SupabaseStorageProperties(
                "https://project.storage.supabase.co/storage/v1/s3",
                "ap-southeast-1",
                "access",
                "secret",
                "images",
                "https://project.supabase.co/storage/v1/object/public/images"
        );
        SupabaseStorageService service = new SupabaseStorageService(s3Client, properties);
        MockMultipartFile image = new MockMultipartFile(
                "images",
                "food.png",
                "image/png",
                "image-data".getBytes(StandardCharsets.UTF_8)
        );

        String url = service.upload(image, StorageImageType.RESTAURANT);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));
        PutObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo("images");
        assertThat(request.key()).matches("restaurants/restaurant-[0-9a-f-]+\\.png");
        assertThat(request.contentType()).isEqualTo("image/png");
        assertThat(request.cacheControl()).isEqualTo("public, max-age=31536000, immutable");
        assertThat(url).isEqualTo(
                "https://project.supabase.co/storage/v1/object/public/images/" + request.key()
        );
    }

    @Test
    void deletesOnlyObjectsOwnedByTheConfiguredPublicBucket() {
        S3Client s3Client = mock(S3Client.class);
        SupabaseStorageService service = new SupabaseStorageService(s3Client, properties());

        service.deleteUrls(List.of(
                "https://project.supabase.co/storage/v1/object/public/images/restaurants/one.jpg",
                "https://images.unsplash.com/photo.jpg",
                "https://another.supabase.co/storage/v1/object/public/images/reviews/two.jpg"
        ));

        ArgumentCaptor<DeleteObjectRequest> requestCaptor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(requestCaptor.capture());
        assertThat(requestCaptor.getValue().bucket()).isEqualTo("images");
        assertThat(requestCaptor.getValue().key()).isEqualTo("restaurants/one.jpg");
        verify(s3Client, never()).deleteObject(DeleteObjectRequest.builder()
                .bucket("images")
                .key("reviews/two.jpg")
                .build());
    }

    @Test
    void uploadsBase64MenuImageToMenuItemsPrefix() {
        S3Client s3Client = mock(S3Client.class);
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());
        SupabaseStorageService service = new SupabaseStorageService(s3Client, properties());
        String dataUrl = "data:image/webp;base64,"
                + java.util.Base64.getEncoder().encodeToString("menu-image".getBytes(StandardCharsets.UTF_8));

        String url = service.uploadBase64Image(dataUrl, StorageImageType.MENU_ITEM);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));
        assertThat(requestCaptor.getValue().key()).matches("menu-items/menu-[0-9a-f-]+\\.webp");
        assertThat(requestCaptor.getValue().contentType()).isEqualTo("image/webp");
        assertThat(url).endsWith("/" + requestCaptor.getValue().key());
    }

    @Test
    void migrationUploadPreservesFilenameAndOverwritesTheSameObjectKey() throws Exception {
        S3Client s3Client = mock(S3Client.class);
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());
        SupabaseStorageService service = new SupabaseStorageService(s3Client, properties());
        Path image = tempDirectory.resolve("restaurant-existing.png");
        Files.writeString(image, "existing", StandardCharsets.UTF_8);

        String firstUrl = service.uploadExisting(image, StorageImageType.RESTAURANT);
        String secondUrl = service.uploadExisting(image, StorageImageType.RESTAURANT);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client, org.mockito.Mockito.times(2))
                .putObject(requestCaptor.capture(), any(RequestBody.class));
        assertThat(requestCaptor.getAllValues())
                .extracting(PutObjectRequest::key)
                .containsOnly("restaurants/restaurant-existing.png");
        assertThat(secondUrl).isEqualTo(firstUrl);
    }

    @Test
    void rejectsUnsupportedImageTypesBeforeCallingS3() {
        S3Client s3Client = mock(S3Client.class);
        SupabaseStorageService service = new SupabaseStorageService(s3Client, properties());
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "dish.gif",
                "image/gif",
                "gif-data".getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> service.upload(image, StorageImageType.MENU_ITEM))
                .isInstanceOf(ImageValidationException.class)
                .hasMessage("Only jpg, jpeg, png, and webp images are allowed");
        verifyNoInteractions(s3Client);
    }

    @Test
    void rejectsImagesLargerThanTenMegabytesBeforeCallingS3() {
        S3Client s3Client = mock(S3Client.class);
        SupabaseStorageService service = new SupabaseStorageService(s3Client, properties());
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "large.jpg",
                "image/jpeg",
                new byte[(int) SupabaseStorageService.MAX_IMAGE_SIZE_BYTES + 1]
        );

        assertThatThrownBy(() -> service.upload(image, StorageImageType.REVIEW))
                .isInstanceOf(ImageValidationException.class)
                .hasMessage("Each image must be 10MB or smaller");
        verifyNoInteractions(s3Client);
    }

    private SupabaseStorageProperties properties() {
        return new SupabaseStorageProperties(
                "https://project.storage.supabase.co/storage/v1/s3",
                "ap-southeast-1",
                "access",
                "secret",
                "images",
                "https://project.supabase.co/storage/v1/object/public/images"
        );
    }
}
