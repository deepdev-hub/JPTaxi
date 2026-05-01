package com.jptaxi.application.dto;

import java.math.BigDecimal;

public record MenuItemDto(
        String id,
        String nameVn,
        String nameJp,
        BigDecimal price,
        String description,
        String image
) {
}
