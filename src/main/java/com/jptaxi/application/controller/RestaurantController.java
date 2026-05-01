package com.jptaxi.application.controller;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jptaxi.application.dto.MenuItemDto;
import com.jptaxi.application.dto.RestaurantDto;
import com.jptaxi.application.dto.SaveRestaurantRequest;
import com.jptaxi.application.entity.MenuItem;
import com.jptaxi.application.entity.Restaurant;
import com.jptaxi.application.entity.RestaurantImage;
import com.jptaxi.application.entity.RestaurantStatus;
import com.jptaxi.application.entity.RestaurantTag;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.repository.RestaurantRepository;
import com.jptaxi.application.repository.RestaurantTagRepository;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantRepository restaurantRepository;
    private final RestaurantTagRepository restaurantTagRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;

    public RestaurantController(
            RestaurantRepository restaurantRepository,
            RestaurantTagRepository restaurantTagRepository,
            UserRepository userRepository,
            DtoMapper mapper
    ) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantTagRepository = restaurantTagRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<RestaurantDto> getRestaurants(@RequestParam(required = false) String ownerId) {
        if (ownerId != null && !ownerId.isBlank()) {
            return restaurantRepository.findByOwner_IdOrderByNameJpAsc(ownerId)
                    .stream()
                    .map(mapper::toRestaurantDto)
                    .toList();
        }

        return restaurantRepository.findAll().stream().map(mapper::toRestaurantDto).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<RestaurantDto> getRestaurant(@PathVariable String id) {
        return restaurantRepository.findById(id)
                .map(mapper::toRestaurantDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/tags")
    @Transactional(readOnly = true)
    public List<String> getTags() {
        return restaurantTagRepository.findDistinctTagNames();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<RestaurantDto> createRestaurant(@RequestBody SaveRestaurantRequest request) {
        if (request.ownerId() == null || request.ownerId().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        User owner = userRepository.findById(request.ownerId()).orElse(null);
        if (owner == null) {
            return ResponseEntity.badRequest().build();
        }

        Restaurant restaurant = new Restaurant();
        restaurant.setId("r-" + UUID.randomUUID());
        restaurant.setOwner(owner);
        applyRestaurantRequest(restaurant, request);

        return ResponseEntity.ok(mapper.toRestaurantDto(restaurantRepository.save(restaurant)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<RestaurantDto> updateRestaurant(
            @PathVariable String id,
            @RequestBody SaveRestaurantRequest request
    ) {
        return restaurantRepository.findById(id)
                .map(restaurant -> {
                    applyRestaurantRequest(restaurant, request);
                    return ResponseEntity.ok(mapper.toRestaurantDto(restaurantRepository.save(restaurant)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void applyRestaurantRequest(Restaurant restaurant, SaveRestaurantRequest request) {
        restaurant.setNameVn(valueOrDefault(request.nameVn(), "Untitled restaurant"));
        restaurant.setNameJp(valueOrDefault(request.nameJp(), restaurant.getNameVn()));
        restaurant.setAddress(valueOrDefault(request.address(), ""));
        restaurant.setAddressJp(request.addressJp());
        restaurant.setPhone(valueOrDefault(request.phone(), ""));
        restaurant.setDescription(valueOrDefault(request.description(), ""));
        restaurant.setDescriptionJp(request.descriptionJp());
        restaurant.setOpenHours(valueOrDefault(request.openHours(), "10:00 - 21:00"));
        restaurant.setAvgPrice(request.avgPrice() == null ? BigDecimal.ZERO : request.avgPrice());
        restaurant.setPriceRange(valueOrDefault(request.priceRange(), priceRangeFromAverage(restaurant.getAvgPrice())));
        restaurant.setStatus(request.status() == null ? RestaurantStatus.closed : request.status());
        restaurant.setLat(request.lat() == null ? new BigDecimal("21.027764") : request.lat());
        restaurant.setLng(request.lng() == null ? new BigDecimal("105.834160") : request.lng());

        List<String> images = request.images() == null ? List.of() : request.images();
        String coverImage = valueOrDefault(request.coverImage(), firstNonBlank(images));
        restaurant.setCoverImage(valueOrDefault(
                coverImage,
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=500&fit=crop"
        ));

        replaceImages(restaurant, images);
        replaceTags(restaurant, request.tags());
        replaceMenu(restaurant, request.menu());
    }

    private void replaceImages(Restaurant restaurant, List<String> imageUrls) {
        restaurant.getImages().clear();
        List<String> normalizedUrls = imageUrls == null ? List.of() : imageUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .map(String::trim)
                .toList();

        for (int i = 0; i < normalizedUrls.size(); i++) {
            RestaurantImage image = new RestaurantImage();
            image.setRestaurant(restaurant);
            image.setImageUrl(normalizedUrls.get(i));
            image.setSortOrder(i + 1);
            restaurant.getImages().add(image);
        }
    }

    private void replaceTags(Restaurant restaurant, List<String> tags) {
        LinkedHashSet<String> desiredTags = tags == null
                ? new LinkedHashSet<>()
                : tags.stream()
                .filter(tag -> tag != null && !tag.isBlank())
                .map(String::trim)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        restaurant.getTags().removeIf(tag -> !desiredTags.contains(tag.getTagName()));

        LinkedHashSet<String> existingTags = restaurant.getTags()
                .stream()
                .map(RestaurantTag::getTagName)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        desiredTags.stream()
                .filter(tagName -> !existingTags.contains(tagName))
                .forEach(tagName -> {
                    RestaurantTag tag = new RestaurantTag();
                    tag.setRestaurant(restaurant);
                    tag.setTagName(tagName);
                    restaurant.getTags().add(tag);
                });
    }

    private void replaceMenu(Restaurant restaurant, List<MenuItemDto> menu) {
        restaurant.getMenuItems().clear();
        if (menu == null) return;

        for (MenuItemDto itemDto : menu) {
            if (itemDto == null || itemDto.nameVn() == null || itemDto.nameVn().isBlank()) continue;

            MenuItem item = new MenuItem();
            item.setId("m-" + UUID.randomUUID());
            item.setRestaurant(restaurant);
            item.setNameVn(itemDto.nameVn());
            item.setNameJp(valueOrDefault(itemDto.nameJp(), itemDto.nameVn()));
            item.setPrice(itemDto.price() == null ? BigDecimal.ZERO : itemDto.price());
            item.setDescription(itemDto.description());
            item.setImage(itemDto.image());
            item.setIsAvailable(true);
            restaurant.getMenuItems().add(item);
        }
    }

    private String valueOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private String firstNonBlank(List<String> values) {
        if (values == null) return null;
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private String priceRangeFromAverage(BigDecimal avgPrice) {
        if (avgPrice == null) return "0đ";
        return new java.text.DecimalFormat("#,###").format(avgPrice) + " VND/person";
    }
}
