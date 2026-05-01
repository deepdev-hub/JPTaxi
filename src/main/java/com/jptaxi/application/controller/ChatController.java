package com.jptaxi.application.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jptaxi.application.dto.ConversationDto;
import com.jptaxi.application.dto.CreateMessageRequest;
import com.jptaxi.application.dto.MessageDto;
import com.jptaxi.application.entity.Conversation;
import com.jptaxi.application.entity.ConversationParticipant;
import com.jptaxi.application.entity.ConversationParticipantId;
import com.jptaxi.application.entity.ConversationType;
import com.jptaxi.application.entity.Message;
import com.jptaxi.application.entity.Restaurant;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.repository.ConversationParticipantRepository;
import com.jptaxi.application.repository.ConversationRepository;
import com.jptaxi.application.repository.MessageRepository;
import com.jptaxi.application.repository.RestaurantRepository;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ConversationParticipantRepository conversationParticipantRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RestaurantRepository restaurantRepository;
    private final DtoMapper mapper;

    public ChatController(
            ConversationParticipantRepository conversationParticipantRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserRepository userRepository,
            RestaurantRepository restaurantRepository,
            DtoMapper mapper
    ) {
        this.conversationParticipantRepository = conversationParticipantRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.restaurantRepository = restaurantRepository;
        this.mapper = mapper;
    }

    @GetMapping("/conversations")
    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations(@RequestParam String userId) {
        return conversationParticipantRepository.findByUser_Id(userId)
                .stream()
                .map(participant -> mapper.toConversationDto(participant.getConversation()))
                .toList();
    }

    @GetMapping("/messages")
    @Transactional(readOnly = true)
    public List<MessageDto> getMessages(@RequestParam String userId) {
        return messageRepository.findBySender_IdOrReceiver_IdOrderByCreatedAtAsc(userId, userId)
                .stream()
                .map(mapper::toMessageDto)
                .toList();
    }

    @PostMapping("/messages")
    @Transactional
    public ResponseEntity<MessageDto> createMessage(@RequestBody CreateMessageRequest request) {
        User sender = userRepository.findById(request.senderId()).orElse(null);
        User receiver = userRepository.findById(request.receiverId()).orElse(null);

        if (sender == null || receiver == null) {
            return ResponseEntity.badRequest().build();
        }

        Restaurant restaurant = null;
        if (request.restaurantId() != null && !request.restaurantId().isBlank()) {
            restaurant = restaurantRepository.findById(request.restaurantId()).orElse(null);
        }

        Conversation conversation = resolveConversation(request.conversationId(), sender, receiver, restaurant);

        Message message = new Message();
        message.setId("msg-" + UUID.randomUUID());
        message.setConversation(conversation);
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setRestaurant(restaurant);
        message.setContent(request.content());
        message.setIsRead(false);

        Message savedMessage = messageRepository.save(message);
        conversation.setLastMessage(savedMessage.getContent());
        conversation.setLastMessageAt(savedMessage.getCreatedAt());

        return ResponseEntity.ok(mapper.toMessageDto(savedMessage));
    }

    private Conversation resolveConversation(String conversationId, User sender, User receiver, Restaurant restaurant) {
        if (conversationId != null && !conversationId.isBlank()) {
            return conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        }

        String restaurantId = restaurant == null ? null : restaurant.getId();
        return conversationRepository.findConversationForMessage(sender.getId(), receiver.getId(), restaurantId)
                .orElseGet(() -> createConversation(sender, receiver, restaurant));
    }

    private Conversation createConversation(User sender, User receiver, Restaurant restaurant) {
        Conversation conversation = new Conversation();
        conversation.setId("conv-" + UUID.randomUUID());
        conversation.setConversationType(restaurant == null ? ConversationType.direct : ConversationType.restaurant);
        conversation.setRestaurant(restaurant);
        Conversation savedConversation = conversationRepository.save(conversation);

        addParticipant(savedConversation, sender);
        addParticipant(savedConversation, receiver);

        return savedConversation;
    }

    private void addParticipant(Conversation conversation, User user) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setId(new ConversationParticipantId(conversation.getId(), user.getId()));
        participant.setConversation(conversation);
        participant.setUser(user);
        conversationParticipantRepository.save(participant);
        conversation.getParticipants().add(participant);
    }
}
