package com.jptaxi.application.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jptaxi.application.entity.PasswordResetToken;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    @Modifying
    @Query("""
            update PasswordResetToken token
            set token.used = true
            where lower(token.email) = lower(:email)
              and (token.used = false or token.used is null)
            """)
    int markUnusedTokensAsUsed(@Param("email") String email);
}
