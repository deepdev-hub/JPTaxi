package com.jptaxi.application.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jptaxi.application.dto.CreateReviewRequest;
import com.jptaxi.application.dto.ReviewDto;
import com.jptaxi.application.entity.Restaurant;
import com.jptaxi.application.entity.Review;
import com.jptaxi.application.entity.ReviewImage;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.repository.RestaurantRepository;
import com.jptaxi.application.repository.ReviewRepository;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;

    public ReviewController(
            ReviewRepository reviewRepository,
            RestaurantRepository restaurantRepository,
            UserRepository userRepository,
            DtoMapper mapper
    ) {
        this.reviewRepository = reviewRepository;
        this.restaurantRepository = restaurantRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ReviewDto> getReviews(@RequestParam(required = false) String restaurantId) {
        if (restaurantId != null && !restaurantId.isBlank()) {
            return reviewRepository.findByRestaurant_IdOrderByCreatedAtDesc(restaurantId)
                    .stream()
                    .map(mapper::toReviewDto)
                    .toList();
        }

        return reviewRepository.findAll().stream().map(mapper::toReviewDto).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ReviewDto> createReview(@RequestBody CreateReviewRequest request) {
        Restaurant restaurant = restaurantRepository.findById(request.restaurantId()).orElse(null);
        User user = userRepository.findById(request.userId()).orElse(null);

        if (restaurant == null || user == null) {
            return ResponseEntity.badRequest().build();
        }

        Review review = new Review();
        review.setId("rev-" + UUID.randomUUID());
        review.setRestaurant(restaurant);
        review.setUser(user);
        review.setRating(request.rating());
        review.setComment(request.comment());
        review.setLikesCount(0);
        review.setDislikesCount(0);

        List<String> images = request.images() == null ? List.of() : request.images();
        for (int i = 0; i < images.size(); i++) {
            ReviewImage image = new ReviewImage();
            image.setReview(review);
            image.setImageUrl(images.get(i));
            image.setSortOrder(i + 1);
            review.getImages().add(image);
        }

        return ResponseEntity.ok(mapper.toReviewDto(reviewRepository.save(review)));
    }
}
