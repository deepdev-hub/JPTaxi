package com.jptaxi.application.controller;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

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
import com.jptaxi.application.service.ImageValidationException;
import com.jptaxi.application.service.StorageCleanupService;
import com.jptaxi.application.service.StorageImageType;
import com.jptaxi.application.service.SupabaseStorageService;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private static final int MAX_RESTAURANT_IMAGES = 8;

    private final RestaurantRepository restaurantRepository;
    private final RestaurantTagRepository restaurantTagRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;
    private final SupabaseStorageService storageService;
    private final StorageCleanupService cleanupService;

    public RestaurantController(
            RestaurantRepository restaurantRepository,
            RestaurantTagRepository restaurantTagRepository,
            UserRepository userRepository,
            DtoMapper mapper,
            SupabaseStorageService storageService,
            StorageCleanupService cleanupService
    ) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantTagRepository = restaurantTagRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
        this.storageService = storageService;
        this.cleanupService = cleanupService;
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

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadRestaurantImages(
            @RequestParam(value = "images", required = false) List<MultipartFile> images
    ) {
        try {
            return ResponseEntity.ok(storageService.uploadAll(
                    images,
                    StorageImageType.RESTAURANT,
                    MAX_RESTAURANT_IMAGES,
                    "A restaurant can include up to 8 images"
            ));
        } catch (ImageValidationException exception) {
            return badRequest(exception.getMessage());
        }
    }

    @PostMapping(value = "/menu-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMenuImage(
            @RequestParam("image") MultipartFile image
    ) {
        try {
            String url = storageService.upload(image, StorageImageType.MENU_ITEM);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (ImageValidationException exception) {
            return badRequest(exception.getMessage());
        }
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createRestaurant(@RequestBody SaveRestaurantRequest request) {
        String validationError = validateCreateRestaurantRequest(request);
        if (validationError != null) {
            return badRequest(validationError);
        }

        if (request.ownerId() == null || request.ownerId().isBlank()) {
            return badRequest("Owner is required");
        }

        User owner = userRepository.findById(request.ownerId()).orElse(null);
        if (owner == null) {
            return badRequest("Owner is invalid");
        }

        Restaurant restaurant = new Restaurant();
        restaurant.setId("r-" + UUID.randomUUID());
        restaurant.setOwner(owner);
        applyRestaurantRequest(restaurant, request);

        return ResponseEntity.ok(mapper.toRestaurantDto(restaurantRepository.save(restaurant)));
    }

    private String validateCreateRestaurantRequest(SaveRestaurantRequest request) {
        if (request == null) return "Restaurant data is required";
        if (isBlank(request.nameVn())) return "Restaurant Vietnamese name is required";
        if (isBlank(request.nameJp())) return "Restaurant Japanese name is required";
        if (isBlank(request.address())) return "Restaurant address is required";
        if (isBlank(request.phone())) return "Restaurant phone is required";
        if (isBlank(request.description())) return "Restaurant Vietnamese description is required";
        if (isBlank(request.descriptionJp())) return "Restaurant Japanese description is required";
        if (isBlank(request.openHours())) return "Restaurant open hours are required";
        if (request.avgPrice() == null || request.avgPrice().compareTo(BigDecimal.ZERO) <= 0) {
            return "Restaurant average price must be greater than 0";
        }
        if (request.images() == null || request.images().stream().noneMatch(image -> !isBlank(image))) {
            return "At least one restaurant image is required";
        }
        if (request.tags() == null || request.tags().stream().noneMatch(tag -> !isBlank(tag))) {
            return "At least one restaurant tag is required";
        }
        if (request.menu() == null || request.menu().isEmpty()) {
            return "At least one menu item is required";
        }

        for (int index = 0; index < request.menu().size(); index++) {
            MenuItemDto item = request.menu().get(index);
            if (item == null) return "Menu item data is required";
            if (isBlank(item.nameVn())) return "Menu item Vietnamese name is required";
            if (isBlank(item.nameJp())) return "Menu item Japanese name is required";
            if (item.price() == null || item.price().compareTo(BigDecimal.ZERO) <= 0) {
                return "Menu item price must be greater than 0";
            }
            if (isBlank(item.description())) return "Menu item description is required";
            if (isBlank(item.image())) return "Menu item image is required";
        }

        return null;
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<RestaurantDto> updateRestaurant(
            @PathVariable String id,
            @RequestBody SaveRestaurantRequest request
    ) {
        return restaurantRepository.findById(id)
                .map(restaurant -> {
                    Set<String> previousImageUrls = collectImageUrls(restaurant);
                    applyRestaurantRequest(restaurant, request);
                    Restaurant savedRestaurant = restaurantRepository.save(restaurant);
                    Set<String> removedImageUrls = new HashSet<>(previousImageUrls);
                    removedImageUrls.removeAll(collectImageUrls(savedRestaurant));
                    cleanupService.deleteAfterCommit(removedImageUrls);
                    return ResponseEntity.ok(mapper.toRestaurantDto(savedRestaurant));
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
            
            String imageUrl = itemDto.image();
            if (imageUrl != null && imageUrl.startsWith("data:image/")) {
                imageUrl = storageService.uploadBase64Image(imageUrl, StorageImageType.MENU_ITEM);
            }
            item.setImage(imageUrl);
            
            item.setIsAvailable(true);
            restaurant.getMenuItems().add(item);
        }
    }

    private Set<String> collectImageUrls(Restaurant restaurant) {
        Set<String> imageUrls = new HashSet<>();
        if (restaurant.getCoverImage() != null && !restaurant.getCoverImage().isBlank()) {
            imageUrls.add(restaurant.getCoverImage());
        }
        restaurant.getImages().stream()
                .map(RestaurantImage::getImageUrl)
                .filter(url -> url != null && !url.isBlank())
                .forEach(imageUrls::add);
        restaurant.getMenuItems().stream()
                .map(MenuItem::getImage)
                .filter(url -> url != null && !url.isBlank())
                .forEach(imageUrls::add);
        return imageUrls;
    }

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        String safeMessage = message == null || message.isBlank() ? "Invalid restaurant image request" : message;
        return ResponseEntity.badRequest().body(Map.of("message", safeMessage));
    }

    private String valueOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
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
