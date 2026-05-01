package com.jptaxi.application.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.ConversationParticipant;
import com.jptaxi.application.entity.ConversationParticipantId;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, ConversationParticipantId> {

    List<ConversationParticipant> findByUser_Id(String userId);
}
