package com.jptaxi.application.entity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "restaurants",
        indexes = {
                @Index(name = "idx_restaurants_owner_id", columnList = "owner_id"),
                @Index(name = "idx_restaurants_status", columnList = "status"),
                @Index(name = "idx_restaurants_rating", columnList = "rating")
        }
)
public class Restaurant {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "name_vn", nullable = false)
    private String nameVn;

    @Column(name = "name_jp", nullable = false)
    private String nameJp;

    @Column(name = "address", nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(name = "address_jp", columnDefinition = "TEXT")
    private String addressJp;

    @Column(name = "phone", nullable = false, length = 50)
    private String phone;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_jp", columnDefinition = "TEXT")
    private String descriptionJp;

    @Column(name = "cover_image", nullable = false, columnDefinition = "TEXT")
    private String coverImage;

    @Column(name = "open_hours", nullable = false, length = 100)
    private String openHours;

    @Column(name = "price_range", nullable = false, length = 100)
    private String priceRange;

    @Column(name = "avg_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal avgPrice;

    @Column(name = "rating", precision = 2, scale = 1)
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    @Column(name = "distance", precision = 8, scale = 2)
    private BigDecimal distance;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "restaurant_status")
    private RestaurantStatus status = RestaurantStatus.closed;

    @Column(name = "lat", nullable = false, precision = 10, scale = 6)
    private BigDecimal lat;

    @Column(name = "lng", nullable = false, precision = 10, scale = 6)
    private BigDecimal lng;

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RestaurantImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RestaurantTag> tags = new ArrayList<>();

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MenuItem> menuItems = new ArrayList<>();

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Review> reviews = new ArrayList<>();
}
