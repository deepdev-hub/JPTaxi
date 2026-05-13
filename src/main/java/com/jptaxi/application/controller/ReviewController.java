package com.jptaxi.application.controller;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.jptaxi.application.dto.CreateReviewRequest;
import com.jptaxi.application.dto.ReviewDto;
import com.jptaxi.application.dto.ReviewReactionRequest;
import com.jptaxi.application.entity.Restaurant;
import com.jptaxi.application.entity.Review;
import com.jptaxi.application.entity.ReviewImage;
import com.jptaxi.application.entity.ReviewReaction;
import com.jptaxi.application.entity.ReviewReactionType;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.repository.RestaurantRepository;
import com.jptaxi.application.repository.ReviewReactionRepository;
import com.jptaxi.application.repository.ReviewRepository;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private static final long MAX_IMAGE_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final int MAX_REVIEW_IMAGES = 3;
    private static final List<String> ALLOWED_IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    private final ReviewRepository reviewRepository;
    private final ReviewReactionRepository reviewReactionRepository;
    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;
    private final Path reviewUploadRoot;

    public ReviewController(
            ReviewRepository reviewRepository,
            ReviewReactionRepository reviewReactionRepository,
            RestaurantRepository restaurantRepository,
            UserRepository userRepository,
            DtoMapper mapper,
            @Value("${app.upload.review-dir:uploads/reviews}") String reviewUploadDir
    ) {
        this.reviewRepository = reviewRepository;
        this.reviewReactionRepository = reviewReactionRepository;
        this.restaurantRepository = restaurantRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
        this.reviewUploadRoot = Paths.get(reviewUploadDir).toAbsolutePath().normalize();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ReviewDto> getReviews(
            @RequestParam(required = false) String restaurantId,
            @RequestParam(required = false) String userId
    ) {
        if (restaurantId != null && !restaurantId.isBlank()) {
            return reviewRepository.findByRestaurant_IdOrderByCreatedAtDesc(restaurantId)
                    .stream()
                    .map(review -> mapper.toReviewDto(review, userId))
                    .toList();
        }

        return reviewRepository.findAll()
                .stream()
                .map(review -> mapper.toReviewDto(review, userId))
                .toList();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public ResponseEntity<?> createReview(@RequestBody CreateReviewRequest request) {
        String validationError = validateReviewRequest(
                request.restaurantId(),
                request.userId(),
                request.rating(),
                request.comment()
        );
        if (validationError != null) {
            return badRequest(validationError);
        }

        Restaurant restaurant = restaurantRepository.findById(request.restaurantId()).orElse(null);
        User user = userRepository.findById(request.userId()).orElse(null);

        if (restaurant == null || user == null) {
            return badRequest("Restaurant or user does not exist");
        }

        List<String> images = request.images() == null ? List.of() : request.images();
        if (images.size() > MAX_REVIEW_IMAGES) {
            return badRequest("A review can include up to 3 images");
        }

        Review savedReview = saveReview(restaurant, user, request.rating(), request.comment(), images);
        return ResponseEntity.ok(mapper.toReviewDto(savedReview, request.userId()));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> createReviewWithImages(
            @RequestParam String restaurantId,
            @RequestParam String userId,
            @RequestParam Integer rating,
            @RequestParam String comment,
            @RequestParam(value = "images", required = false) List<MultipartFile> images
    ) {
        String validationError = validateReviewRequest(restaurantId, userId, rating, comment);
        if (validationError != null) {
            return badRequest(validationError);
        }

        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);

        if (restaurant == null || user == null) {
            return badRequest("Restaurant or user does not exist");
        }

        List<String> imageUrls;
        try {
            imageUrls = storeUploadedImages(images);
        } catch (IllegalArgumentException | IOException exception) {
            return badRequest(exception.getMessage());
        }

        Review savedReview = saveReview(restaurant, user, rating, comment, imageUrls);
        return ResponseEntity.ok(mapper.toReviewDto(savedReview, userId));
    }

    @PostMapping("/{reviewId}/reaction")
    @Transactional
    public ResponseEntity<ReviewDto> reactToReview(
            @PathVariable String reviewId,
            @RequestBody ReviewReactionRequest request
    ) {
        if (request.userId() == null || request.userId().isBlank() || request.reactionType() == null) {
            return ResponseEntity.badRequest().build();
        }

        Review review = reviewRepository.findById(reviewId).orElse(null);
        User user = userRepository.findById(request.userId()).orElse(null);

        if (review == null || user == null) {
            return ResponseEntity.badRequest().build();
        }

        reviewReactionRepository.findByReview_IdAndUser_Id(reviewId, user.getId())
                .ifPresentOrElse(existingReaction -> {
                    if (existingReaction.getReactionType() == request.reactionType()) {
                        review.getReactions().removeIf(reaction -> existingReaction.getId().equals(reaction.getId()));
                        reviewReactionRepository.delete(existingReaction);
                    } else {
                        existingReaction.setReactionType(request.reactionType());
                        reviewReactionRepository.save(existingReaction);
                    }
                }, () -> {
                    ReviewReaction reaction = new ReviewReaction();
                    reaction.setReview(review);
                    reaction.setUser(user);
                    reaction.setReactionType(request.reactionType());
                    ReviewReaction savedReaction = reviewReactionRepository.save(reaction);
                    review.getReactions().add(savedReaction);
                });

        syncReactionCounts(review);
        return ResponseEntity.ok(mapper.toReviewDto(reviewRepository.saveAndFlush(review), user.getId()));
    }

    @GetMapping("/images/{fileName:.+}")
    public ResponseEntity<Resource> getReviewImage(@PathVariable String fileName) throws MalformedURLException {
        Path imagePath = reviewUploadRoot.resolve(fileName).normalize();
        if (!imagePath.startsWith(reviewUploadRoot)) {
            return ResponseEntity.badRequest().build();
        }

        Resource resource = new UrlResource(imagePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        String contentType;
        try {
            contentType = Files.probeContentType(imagePath);
        } catch (IOException exception) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : contentType))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000")
                .body(resource);
    }

    private Review saveReview(Restaurant restaurant, User user, Integer rating, String comment, List<String> images) {
        Review review = reviewRepository.findByRestaurant_IdAndUser_Id(restaurant.getId(), user.getId())
                .orElseGet(() -> {
                    Review newReview = new Review();
                    newReview.setId("rev-" + UUID.randomUUID());
                    newReview.setRestaurant(restaurant);
                    newReview.setUser(user);
                    newReview.setLikesCount(0);
                    newReview.setDislikesCount(0);
                    return newReview;
                });

        review.setRating(rating);
        review.setComment(comment.trim());

        List<String> imageUrls = images == null ? List.of() : images;
        review.getImages().clear();
        for (int i = 0; i < imageUrls.size(); i++) {
            ReviewImage image = new ReviewImage();
            image.setReview(review);
            image.setImageUrl(imageUrls.get(i));
            image.setSortOrder(i + 1);
            review.getImages().add(image);
        }

        Review savedReview = reviewRepository.saveAndFlush(review);
        refreshRestaurantStats(restaurant);
        return savedReview;
    }

    private List<String> storeUploadedImages(List<MultipartFile> files) throws IOException {
        if (files == null || files.isEmpty()) {
            return List.of();
        }

        if (files.stream().filter(file -> file != null && !file.isEmpty()).count() > MAX_REVIEW_IMAGES) {
            throw new IllegalArgumentException("Too many review images");
        }

        Files.createDirectories(reviewUploadRoot);

        return files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .map(this::storeUploadedImage)
                .toList();
    }

    private String storeUploadedImage(MultipartFile file) {
        validateImage(file);

        String extension = extensionFor(file);
        String fileName = "review-" + UUID.randomUUID() + extension;
        Path destination = reviewUploadRoot.resolve(fileName).normalize();

        try {
            Files.copy(file.getInputStream(), destination);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Cannot store review image", exception);
        }

        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/reviews/images/")
                .path(fileName)
                .toUriString();
    }

    private void validateImage(MultipartFile file) {
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException("Each image must be 10MB or smaller");
        }

        String contentType = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT);

        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only jpg, jpeg, png, and webp images are allowed");
        }

        String filename = file.getOriginalFilename() == null
                ? ""
                : file.getOriginalFilename().toLowerCase(Locale.ROOT);

        if (!(filename.endsWith(".jpg")
                || filename.endsWith(".jpeg")
                || filename.endsWith(".png")
                || filename.endsWith(".webp"))) {
            throw new IllegalArgumentException("Only jpg, jpeg, png, and webp images are allowed");
        }
    }

    private String extensionFor(MultipartFile file) {
        String filename = file.getOriginalFilename() == null
                ? ""
                : file.getOriginalFilename().toLowerCase(Locale.ROOT);

        if (filename.endsWith(".jpeg")) return ".jpeg";
        if (filename.endsWith(".png")) return ".png";
        if (filename.endsWith(".webp")) return ".webp";
        return ".jpg";
    }

    private String validateReviewRequest(
            String restaurantId,
            String userId,
            Integer rating,
            String comment
    ) {
        if (restaurantId == null || restaurantId.isBlank()) {
            return "Restaurant is required";
        }

        if (userId == null || userId.isBlank()) {
            return "User is required";
        }

        if (rating == null || rating < 1 || rating > 5) {
            return "Rating must be between 1 and 5";
        }

        if (comment == null || comment.isBlank()) {
            return "Review content is required";
        }

        return null;
    }

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        String safeMessage = message == null || message.isBlank() ? "Invalid review request" : message;
        return ResponseEntity.badRequest().body(Map.of("message", safeMessage));
    }

    private void syncReactionCounts(Review review) {
        review.setLikesCount((int) review.getReactions()
                .stream()
                .filter(reaction -> reaction.getReactionType() == ReviewReactionType.like)
                .count());
        review.setDislikesCount((int) review.getReactions()
                .stream()
                .filter(reaction -> reaction.getReactionType() == ReviewReactionType.dislike)
                .count());
    }

    private void refreshRestaurantStats(Restaurant restaurant) {
        List<Review> restaurantReviews = reviewRepository.findByRestaurant_IdOrderByCreatedAtDesc(restaurant.getId());
        restaurant.setReviewCount(restaurantReviews.size());

        BigDecimal averageRating = restaurantReviews.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(restaurantReviews.stream()
                        .mapToInt(Review::getRating)
                        .average()
                        .orElse(0))
                .setScale(1, RoundingMode.HALF_UP);

        restaurant.setRating(averageRating);
        restaurantRepository.save(restaurant);
    }
}
