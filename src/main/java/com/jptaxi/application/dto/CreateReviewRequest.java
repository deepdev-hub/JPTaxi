package com.jptaxi.application.dto;

import java.util.List;

public record CreateReviewRequest(
        String restaurantId,
        String userId,
        Integer rating,
        String comment,
        List<String> images
) {
}
