package com.jptaxi.application.dto;

public record CreateConversationRequest(
        String userId,
        String receiverId,
        String restaurantId
) {
}
