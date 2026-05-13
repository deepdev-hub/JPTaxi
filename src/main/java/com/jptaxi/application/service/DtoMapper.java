package com.jptaxi.application.service;

import java.util.List;

import org.springframework.stereotype.Component;

import com.jptaxi.application.dto.ConversationDto;
import com.jptaxi.application.dto.MenuItemDto;
import com.jptaxi.application.dto.MessageDto;
import com.jptaxi.application.dto.RestaurantDto;
import com.jptaxi.application.dto.ReviewDto;
import com.jptaxi.application.dto.UserDto;
import com.jptaxi.application.entity.Conversation;
import com.jptaxi.application.entity.MenuItem;
import com.jptaxi.application.entity.Message;
import com.jptaxi.application.entity.Restaurant;
import com.jptaxi.application.entity.RestaurantImage;
import com.jptaxi.application.entity.RestaurantTag;
import com.jptaxi.application.entity.Review;
import com.jptaxi.application.entity.ReviewImage;
import com.jptaxi.application.entity.ReviewReactionType;
import com.jptaxi.application.entity.User;

@Component
public class DtoMapper {

    public UserDto toUserDto(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getNameJp(),
                user.getEmail(),
                user.getPhone(),
                user.getAddress(),
                user.getRole(),
                user.getAvatar()
        );
    }

    public RestaurantDto toRestaurantDto(Restaurant restaurant) {
        return new RestaurantDto(
                restaurant.getId(),
                restaurant.getOwner().getId(),
                restaurant.getNameVn(),
                restaurant.getNameJp(),
                restaurant.getAddress(),
                restaurant.getAddressJp(),
                restaurant.getPhone(),
                restaurant.getDescription(),
                restaurant.getDescriptionJp(),
                restaurant.getCoverImage(),
                restaurant.getImages().stream().map(RestaurantImage::getImageUrl).toList(),
                restaurant.getMenuItems().stream().map(this::toMenuItemDto).toList(),
                restaurant.getOpenHours(),
                restaurant.getPriceRange(),
                restaurant.getAvgPrice(),
                restaurant.getTags().stream().map(RestaurantTag::getTagName).toList(),
                restaurant.getRating(),
                restaurant.getReviewCount(),
                null,
                restaurant.getStatus(),
                restaurant.getLat(),
                restaurant.getLng()
        );
    }

    public MenuItemDto toMenuItemDto(MenuItem menuItem) {
        return new MenuItemDto(
                menuItem.getId(),
                menuItem.getNameVn(),
                menuItem.getNameJp(),
                menuItem.getPrice(),
                menuItem.getDescription(),
                menuItem.getImage()
        );
    }

    public ReviewDto toReviewDto(Review review) {
        return toReviewDto(review, null);
    }

    public ReviewDto toReviewDto(Review review, String currentUserId) {
        boolean userLiked = false;
        boolean userDisliked = false;

        if (currentUserId != null && !currentUserId.isBlank()) {
            userLiked = review.getReactions()
                    .stream()
                    .anyMatch(reaction -> currentUserId.equals(reaction.getUser().getId())
                            && reaction.getReactionType() == ReviewReactionType.like);
            userDisliked = review.getReactions()
                    .stream()
                    .anyMatch(reaction -> currentUserId.equals(reaction.getUser().getId())
                            && reaction.getReactionType() == ReviewReactionType.dislike);
        }

        return new ReviewDto(
                review.getId(),
                review.getRestaurant().getId(),
                review.getUser().getId(),
                review.getUser().getName(),
                review.getUser().getAvatar(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt(),
                review.getImages().stream().map(ReviewImage::getImageUrl).toList(),
                review.getLikesCount(),
                review.getDislikesCount(),
                userLiked,
                userDisliked
        );
    }

    public MessageDto toMessageDto(Message message) {
        return new MessageDto(
                message.getId(),
                message.getSender().getId(),
                message.getReceiver() == null ? null : message.getReceiver().getId(),
                message.getRestaurant() == null ? null : message.getRestaurant().getId(),
                message.getContent(),
                message.getCreatedAt(),
                message.getIsRead()
        );
    }

    public ConversationDto toConversationDto(Conversation conversation) {
        List<String> participants = conversation.getParticipants()
                .stream()
                .map(participant -> participant.getUser().getId())
                .toList();

        return new ConversationDto(
                conversation.getId(),
                participants,
                conversation.getLastMessage(),
                conversation.getLastMessageAt(),
                conversation.getRestaurant() == null ? null : conversation.getRestaurant().getId(),
                conversation.getRestaurant() == null ? null : conversation.getRestaurant().getNameJp()
        );
    }
}
