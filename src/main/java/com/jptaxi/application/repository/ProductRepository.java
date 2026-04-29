package com.jptaxi.application.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
}
