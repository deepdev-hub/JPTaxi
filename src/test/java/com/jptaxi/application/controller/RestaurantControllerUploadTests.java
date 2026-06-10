package com.jptaxi.application.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import com.jptaxi.application.dto.MenuItemDto;
import com.jptaxi.application.dto.SaveRestaurantRequest;
import com.jptaxi.application.entity.MenuItem;
import com.jptaxi.application.entity.Restaurant;
import com.jptaxi.application.entity.RestaurantImage;
import com.jptaxi.application.entity.RestaurantStatus;
import com.jptaxi.application.repository.RestaurantRepository;
import com.jptaxi.application.repository.RestaurantTagRepository;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;
import com.jptaxi.application.service.StorageCleanupService;
import com.jptaxi.application.service.StorageImageType;
import com.jptaxi.application.service.SupabaseStorageService;

class RestaurantControllerUploadTests {

    @Test
    void menuUploadKeepsResponseContractAndUsesMenuItemsStoragePrefix() {
        SupabaseStorageService storageService = mock(SupabaseStorageService.class);
        RestaurantController controller = new RestaurantController(
                mock(RestaurantRepository.class),
                mock(RestaurantTagRepository.class),
                mock(UserRepository.class),
                mock(DtoMapper.class),
                storageService,
                mock(StorageCleanupService.class)
        );
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "dish.png",
                "image/png",
                "dish".getBytes(StandardCharsets.UTF_8)
        );
        String expectedUrl = "https://project.supabase.co/storage/v1/object/public/images/menu-items/menu-id.png";
        when(storageService.upload(image, StorageImageType.MENU_ITEM)).thenReturn(expectedUrl);

        ResponseEntity<?> response = controller.uploadMenuImage(image);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(Map.of("url", expectedUrl));
        verify(storageService).upload(image, StorageImageType.MENU_ITEM);
    }

    @Test
    void updateDeletesOnlyUrlsNoLongerReferencedByRestaurantCoverGalleryOrMenu() {
        RestaurantRepository restaurantRepository = mock(RestaurantRepository.class);
        StorageCleanupService cleanupService = mock(StorageCleanupService.class);
        Restaurant restaurant = new Restaurant();
        restaurant.setId("r1");
        String retainedCover = "https://cdn/restaurants/retained.jpg";
        String removedGallery = "https://cdn/restaurants/removed.jpg";
        String retainedMenu = "https://cdn/menu-items/retained.png";
        restaurant.setCoverImage(retainedCover);
        restaurant.getImages().add(restaurantImage(restaurant, retainedCover));
        restaurant.getImages().add(restaurantImage(restaurant, removedGallery));
        restaurant.getMenuItems().add(menuItem(restaurant, retainedMenu));
        when(restaurantRepository.findById("r1")).thenReturn(Optional.of(restaurant));
        when(restaurantRepository.save(restaurant)).thenReturn(restaurant);
        RestaurantController controller = new RestaurantController(
                restaurantRepository,
                mock(RestaurantTagRepository.class),
                mock(UserRepository.class),
                mock(DtoMapper.class),
                mock(SupabaseStorageService.class),
                cleanupService
        );
        SaveRestaurantRequest request = new SaveRestaurantRequest(
                "u1",
                "Name",
                "Name JP",
                "Address",
                null,
                "0123",
                "Description",
                "Description JP",
                retainedCover,
                List.of(retainedCover),
                List.of(new MenuItemDto("m1", "Dish", "Dish JP", BigDecimal.TEN, "Desc", retainedMenu)),
                "10:00 - 20:00",
                null,
                BigDecimal.TEN,
                List.of("tag"),
                RestaurantStatus.open,
                BigDecimal.ONE,
                BigDecimal.ONE
        );

        controller.updateRestaurant("r1", request);

        verify(cleanupService).deleteAfterCommit(Set.of(removedGallery));
    }

    private RestaurantImage restaurantImage(Restaurant restaurant, String url) {
        RestaurantImage image = new RestaurantImage();
        image.setRestaurant(restaurant);
        image.setImageUrl(url);
        return image;
    }

    private MenuItem menuItem(Restaurant restaurant, String url) {
        MenuItem item = new MenuItem();
        item.setId("m-old");
        item.setRestaurant(restaurant);
        item.setNameVn("Dish");
        item.setPrice(BigDecimal.TEN);
        item.setImage(url);
        return item;
    }
}
