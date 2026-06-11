package com.jptaxi.application.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jptaxi.application.entity.PasswordResetToken;
import com.jptaxi.application.repository.PasswordResetTokenRepository;

@Service
public class PasswordResetTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private final PasswordResetTokenRepository tokenRepository;
    private final long expirationMinutes;

    public PasswordResetTokenService(
            PasswordResetTokenRepository tokenRepository,
            @Value("${app.password-reset.expiration-minutes:30}") long expirationMinutes
    ) {
        this.tokenRepository = tokenRepository;
        this.expirationMinutes = expirationMinutes;
    }

    @Transactional
    public String createToken(String email) {
        String normalizedEmail = normalizeEmail(email);
        tokenRepository.markUnusedTokensAsUsed(normalizedEmail);

        String rawToken = generateToken();

        PasswordResetToken passwordResetToken = new PasswordResetToken();
        passwordResetToken.setEmail(normalizedEmail);
        passwordResetToken.setToken(hashToken(rawToken));
        passwordResetToken.setExpiredAt(LocalDateTime.now().plusMinutes(expirationMinutes));
        passwordResetToken.setUsed(false);
        tokenRepository.saveAndFlush(passwordResetToken);

        return rawToken;
    }

    @Transactional
    public Optional<String> consumeTokenAndGetEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }

        Optional<PasswordResetToken> token = tokenRepository.findByToken(hashToken(rawToken.trim()));
        if (token.isEmpty()) {
            return Optional.empty();
        }

        PasswordResetToken passwordResetToken = token.get();
        if (Boolean.TRUE.equals(passwordResetToken.getUsed())
                || passwordResetToken.getExpiredAt().isBefore(LocalDateTime.now())) {
            passwordResetToken.setUsed(true);
            tokenRepository.save(passwordResetToken);
            return Optional.empty();
        }

        passwordResetToken.setUsed(true);
        tokenRepository.save(passwordResetToken);
        return Optional.of(passwordResetToken.getEmail());
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot hash password reset token", ex);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
