package com.jptaxi.application.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.ReviewImage;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {
}
