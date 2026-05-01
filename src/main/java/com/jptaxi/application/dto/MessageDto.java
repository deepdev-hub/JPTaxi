package com.jptaxi.application.dto;

import java.time.LocalDateTime;

public record MessageDto(
        String id,
        String senderId,
        String receiverId,
        String restaurantId,
        String content,
        LocalDateTime timestamp,
        Boolean read
) {
}
