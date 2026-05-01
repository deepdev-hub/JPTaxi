package com.jptaxi.application.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.ReviewReaction;

public interface ReviewReactionRepository extends JpaRepository<ReviewReaction, Long> {
}
