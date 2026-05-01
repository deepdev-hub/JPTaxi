package com.jptaxi.application.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jptaxi.application.entity.ShareLink;

public interface ShareLinkRepository extends JpaRepository<ShareLink, String> {

    Optional<ShareLink> findByShareToken(String shareToken);
}
