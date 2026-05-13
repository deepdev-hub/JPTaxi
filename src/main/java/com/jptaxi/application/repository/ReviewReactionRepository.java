package com.jptaxi.application.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.ReviewReaction;

public interface ReviewReactionRepository extends JpaRepository<ReviewReaction, Long> {

    Optional<ReviewReaction> findByReview_IdAndUser_Id(String reviewId, String userId);
}
