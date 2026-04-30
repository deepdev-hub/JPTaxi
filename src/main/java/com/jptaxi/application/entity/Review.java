package com.jptaxi.application.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
        name = "reviews",
        indexes = {
                @Index(name = "idx_reviews_restaurant_id", columnList = "restaurant_id"),
                @Index(name = "idx_reviews_user_id", columnList = "user_id")
        }
)
public class Review {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "user_name", nullable = false)
    private String userName;

    @Column(name = "user_avatar", columnDefinition = "TEXT")
    private String userAvatar;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "comment", nullable = false, columnDefinition = "TEXT")
    private String comment;

    @Column(name = "review_date", nullable = false)
    private LocalDate reviewDate;

    @Column(name = "likes", nullable = false)
    private Integer likes = 0;

    @Column(name = "dislikes", nullable = false)
    private Integer dislikes = 0;

    @Column(name = "user_liked")
    private Boolean userLiked = false;

    @Column(name = "user_disliked")
    private Boolean userDisliked = false;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReviewImage> images = new ArrayList<>();
}
