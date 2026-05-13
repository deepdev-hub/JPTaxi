package com.jptaxi.application.dto;

import com.jptaxi.application.entity.ReviewReactionType;

public record ReviewReactionRequest(
        String userId,
        ReviewReactionType reactionType
) {
}
