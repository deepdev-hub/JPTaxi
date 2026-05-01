package com.jptaxi.application.dto;

public record CreateMessageRequest(
        String conversationId,
        String senderId,
        String receiverId,
        String restaurantId,
        String content
) {
}
