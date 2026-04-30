package com.jptaxi.application.entity;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class ConversationParticipantId implements Serializable {

    @Column(name = "conversation_id", length = 50)
    private String conversationId;

    @Column(name = "user_id", length = 50)
    private String userId;
}
