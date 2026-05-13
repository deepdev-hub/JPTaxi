package com.jptaxi.application.controller;

import java.time.LocalDateTime;
import java.util.Comparator;
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
import com.jptaxi.application.dto.CreateConversationRequest;
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
                .sorted(Comparator.comparing(
                        participant -> conversationSortTime(participant.getConversation()),
                        Comparator.reverseOrder()
                ))
                .map(participant -> mapper.toConversationDto(participant.getConversation()))
                .toList();
    }

    @GetMapping("/messages")
    @Transactional(readOnly = true)
    public List<MessageDto> getMessages(
            @RequestParam String userId,
            @RequestParam(required = false) String conversationId
    ) {
        if (conversationId != null && !conversationId.isBlank()) {
            boolean isParticipant = conversationParticipantRepository.existsById(
                    new ConversationParticipantId(conversationId, userId)
            );
            if (!isParticipant) {
                return List.of();
            }

            return messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId)
                    .stream()
                    .map(mapper::toMessageDto)
                    .toList();
        }

        return messageRepository.findBySender_IdOrReceiver_IdOrderByCreatedAtAsc(userId, userId)
                .stream()
                .map(mapper::toMessageDto)
                .toList();
    }

    @PostMapping("/conversations")
    @Transactional
    public ResponseEntity<ConversationDto> createConversation(@RequestBody CreateConversationRequest request) {
        if (request.userId() == null || request.userId().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        User sender = userRepository.findById(request.userId()).orElse(null);
        Restaurant restaurant = null;
        User receiver = null;

        if (request.restaurantId() != null && !request.restaurantId().isBlank()) {
            restaurant = restaurantRepository.findById(request.restaurantId()).orElse(null);
            if (restaurant == null) {
                return ResponseEntity.badRequest().build();
            }
            receiver = restaurant.getOwner();
        }

        if (request.receiverId() != null && !request.receiverId().isBlank()) {
            receiver = userRepository.findById(request.receiverId()).orElse(null);
        }

        if (sender == null || receiver == null || sender.getId().equals(receiver.getId())) {
            return ResponseEntity.badRequest().build();
        }

        Conversation conversation = resolveConversation(null, sender, receiver, restaurant);
        return ResponseEntity.ok(mapper.toConversationDto(conversation));
    }

    @PostMapping("/messages")
    @Transactional
    public ResponseEntity<MessageDto> createMessage(@RequestBody CreateMessageRequest request) {
        if (request.senderId() == null || request.receiverId() == null
                || request.content() == null || request.content().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        User sender = userRepository.findById(request.senderId()).orElse(null);
        User receiver = userRepository.findById(request.receiverId()).orElse(null);

        if (sender == null || receiver == null) {
            return ResponseEntity.badRequest().build();
        }

        Restaurant restaurant = null;
        if (request.restaurantId() != null && !request.restaurantId().isBlank()) {
            restaurant = restaurantRepository.findById(request.restaurantId()).orElse(null);
        }

        Conversation conversation;
        try {
            conversation = resolveConversation(request.conversationId(), sender, receiver, restaurant);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().build();
        }

        Message message = new Message();
        message.setId("msg-" + UUID.randomUUID());
        message.setConversation(conversation);
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setRestaurant(restaurant);
        message.setContent(request.content().trim());
        message.setIsRead(false);

        Message savedMessage = messageRepository.saveAndFlush(message);
        conversation.setLastMessage(savedMessage.getContent());
        conversation.setLastMessageAt(savedMessage.getCreatedAt() == null ? LocalDateTime.now() : savedMessage.getCreatedAt());
        conversationRepository.save(conversation);

        return ResponseEntity.ok(mapper.toMessageDto(savedMessage));
    }

    private LocalDateTime conversationSortTime(Conversation conversation) {
        if (conversation.getLastMessageAt() != null) {
            return conversation.getLastMessageAt();
        }

        if (conversation.getUpdatedAt() != null) {
            return conversation.getUpdatedAt();
        }

        if (conversation.getCreatedAt() != null) {
            return conversation.getCreatedAt();
        }

        return LocalDateTime.MIN;
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

        addParticipant(conversation, sender);
        addParticipant(conversation, receiver);

        return conversationRepository.saveAndFlush(conversation);
    }

    private void addParticipant(Conversation conversation, User user) {
        boolean alreadyAdded = conversation.getParticipants()
                .stream()
                .anyMatch(participant -> user.getId().equals(participant.getUser().getId()));
        if (alreadyAdded) return;

        ConversationParticipant participant = new ConversationParticipant();
        participant.setId(new ConversationParticipantId(conversation.getId(), user.getId()));
        participant.setConversation(conversation);
        participant.setUser(user);
        conversation.getParticipants().add(participant);
    }
}
