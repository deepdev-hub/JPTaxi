package com.jptaxi.application.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, String> {

    List<Review> findByRestaurant_IdOrderByCreatedAtDesc(String restaurantId);

    List<Review> findByUser_IdOrderByCreatedAtDesc(String userId);
}
