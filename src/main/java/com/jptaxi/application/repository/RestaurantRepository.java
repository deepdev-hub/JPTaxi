package com.jptaxi.application.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.Restaurant;

public interface RestaurantRepository extends JpaRepository<Restaurant, String> {

    List<Restaurant> findByOwner_IdOrderByNameJpAsc(String ownerId);
}
