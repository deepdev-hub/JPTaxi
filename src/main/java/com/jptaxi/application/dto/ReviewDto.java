package com.jptaxi.application.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ReviewDto(
        String id,
        String restaurantId,
        String userId,
        String userName,
        String userAvatar,
        Integer rating,
        String comment,
        LocalDateTime date,
        List<String> images,
        Integer likes,
        Integer dislikes,
        Boolean userLiked,
        Boolean userDisliked
) {
}
