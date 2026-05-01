package com.jptaxi.application.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.jptaxi.application.entity.Conversation;

public interface ConversationRepository extends JpaRepository<Conversation, String> {

    @Query("""
            select conversation
            from Conversation conversation
            join conversation.participants senderParticipant
            join conversation.participants receiverParticipant
            where senderParticipant.user.id = :senderId
              and receiverParticipant.user.id = :receiverId
              and (:restaurantId is null or conversation.restaurant.id = :restaurantId)
            """)
    Optional<Conversation> findConversationForMessage(String senderId, String receiverId, String restaurantId);
}
