package com.jptaxi.application.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.jptaxi.application.entity.RestaurantTag;

public interface RestaurantTagRepository extends JpaRepository<RestaurantTag, Long> {

    @Query("select distinct tag.tagName from RestaurantTag tag order by tag.tagName")
    List<String> findDistinctTagNames();
}
