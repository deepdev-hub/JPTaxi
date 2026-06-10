package com.jptaxi.application.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import com.jptaxi.application.entity.Restaurant;
import com.jptaxi.application.entity.Review;
import com.jptaxi.application.entity.ReviewImage;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.repository.RestaurantRepository;
import com.jptaxi.application.repository.ReviewReactionRepository;
import com.jptaxi.application.repository.ReviewRepository;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;
import com.jptaxi.application.service.StorageCleanupService;
import com.jptaxi.application.service.StorageImageType;
import com.jptaxi.application.service.SupabaseStorageService;

class ReviewControllerUploadTests {

    @Test
    void multipartReviewUploadsImagesToReviewStoragePrefix() {
        ReviewRepository reviewRepository = mock(ReviewRepository.class);
        RestaurantRepository restaurantRepository = mock(RestaurantRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        SupabaseStorageService storageService = mock(SupabaseStorageService.class);
        Restaurant restaurant = new Restaurant();
        restaurant.setId("r1");
        User user = new User();
        user.setId("u1");
        MockMultipartFile image = new MockMultipartFile(
                "images",
                "review.png",
                "image/png",
                "review".getBytes(StandardCharsets.UTF_8)
        );
        List<MultipartFile> images = List.of(image);
        when(restaurantRepository.findById("r1")).thenReturn(Optional.of(restaurant));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(reviewRepository.findByRestaurant_IdAndUser_Id("r1", "u1")).thenReturn(Optional.empty());
        when(storageService.uploadAll(
                images,
                StorageImageType.REVIEW,
                3,
                "A review can include up to 3 images"
        )).thenReturn(List.of("https://project.supabase.co/storage/v1/object/public/images/reviews/review.png"));
        when(reviewRepository.saveAndFlush(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewRepository.findByRestaurant_IdOrderByCreatedAtDesc("r1")).thenReturn(List.of());

        ReviewController controller = new ReviewController(
                reviewRepository,
                mock(ReviewReactionRepository.class),
                restaurantRepository,
                userRepository,
                mock(DtoMapper.class),
                storageService,
                mock(StorageCleanupService.class)
        );

        ResponseEntity<?> response = controller.createReviewWithImages("r1", "u1", 5, "Great", images);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(storageService).uploadAll(
                images,
                StorageImageType.REVIEW,
                3,
                "A review can include up to 3 images"
        );
    }

    @Test
    void updatingReviewSchedulesOnlyRemovedImagesForCleanup() {
        ReviewRepository reviewRepository = mock(ReviewRepository.class);
        RestaurantRepository restaurantRepository = mock(RestaurantRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        StorageCleanupService cleanupService = mock(StorageCleanupService.class);
        Restaurant restaurant = new Restaurant();
        restaurant.setId("r1");
        User user = new User();
        user.setId("u1");
        Review review = new Review();
        review.setId("review-1");
        review.setRestaurant(restaurant);
        review.setUser(user);
        review.setLikesCount(0);
        review.setDislikesCount(0);
        String retained = "https://cdn/reviews/retained.jpg";
        String removed = "https://cdn/reviews/removed.jpg";
        review.getImages().add(reviewImage(review, retained));
        review.getImages().add(reviewImage(review, removed));
        when(restaurantRepository.findById("r1")).thenReturn(Optional.of(restaurant));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(reviewRepository.findByRestaurant_IdAndUser_Id("r1", "u1")).thenReturn(Optional.of(review));
        when(reviewRepository.saveAndFlush(review)).thenReturn(review);
        when(reviewRepository.findByRestaurant_IdOrderByCreatedAtDesc("r1")).thenReturn(List.of(review));
        ReviewController controller = new ReviewController(
                reviewRepository,
                mock(ReviewReactionRepository.class),
                restaurantRepository,
                userRepository,
                mock(DtoMapper.class),
                mock(SupabaseStorageService.class),
                cleanupService
        );

        controller.createReview(new com.jptaxi.application.dto.CreateReviewRequest(
                "r1",
                "u1",
                4,
                "Updated",
                List.of(retained)
        ));

        verify(cleanupService).deleteAfterCommit(Set.of(removed));
    }

    private ReviewImage reviewImage(Review review, String url) {
        ReviewImage image = new ReviewImage();
        image.setReview(review);
        image.setImageUrl(url);
        return image;
    }
}
