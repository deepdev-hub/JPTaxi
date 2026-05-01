package com.jptaxi.application.dto;

import java.math.BigDecimal;
import java.util.List;

import com.jptaxi.application.entity.RestaurantStatus;

public record RestaurantDto(
        String id,
        String ownerId,
        String nameVn,
        String nameJp,
        String address,
        String addressJp,
        String phone,
        String description,
        String descriptionJp,
        String coverImage,
        List<String> images,
        List<MenuItemDto> menu,
        String openHours,
        String priceRange,
        BigDecimal avgPrice,
        List<String> tags,
        BigDecimal rating,
        Integer reviewCount,
        BigDecimal distance,
        RestaurantStatus status,
        BigDecimal lat,
        BigDecimal lng
) {
}
