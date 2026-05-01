package com.jptaxi.application.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ConversationDto(
        String id,
        List<String> participants,
        String lastMessage,
        LocalDateTime lastTimestamp,
        String restaurantId,
        String restaurantName
) {
}
