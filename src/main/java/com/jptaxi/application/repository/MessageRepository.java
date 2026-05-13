package com.jptaxi.application.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.Message;

public interface MessageRepository extends JpaRepository<Message, String> {

    List<Message> findBySender_IdOrReceiver_IdOrderByCreatedAtAsc(String senderId, String receiverId);

    List<Message> findByConversation_IdOrderByCreatedAtAsc(String conversationId);
}
