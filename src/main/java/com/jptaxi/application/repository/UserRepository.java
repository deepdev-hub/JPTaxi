package com.jptaxi.application.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.User;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmailIgnoreCase(String email);
}
