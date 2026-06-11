package com.jptaxi.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.jptaxi.application.entity.PasswordResetToken;
import com.jptaxi.application.repository.PasswordResetTokenRepository;

class PasswordResetTokenServiceTests {

    @Test
    void flushesHashedTokenBeforeReturningRawToken() {
        PasswordResetTokenRepository repository = mock(PasswordResetTokenRepository.class);
        when(repository.saveAndFlush(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        PasswordResetTokenService service = new PasswordResetTokenService(repository, 30);
        LocalDateTime before = LocalDateTime.now().plusMinutes(29);

        String rawToken = service.createToken(" User@Example.com ");

        verify(repository).markUnusedTokensAsUsed("user@example.com");
        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(repository).saveAndFlush(tokenCaptor.capture());
        PasswordResetToken savedToken = tokenCaptor.getValue();
        assertThat(rawToken).isNotBlank();
        assertThat(savedToken.getToken()).isNotEqualTo(rawToken);
        assertThat(savedToken.getEmail()).isEqualTo("user@example.com");
        assertThat(savedToken.getExpiredAt()).isAfter(before);
        assertThat(savedToken.getUsed()).isFalse();
    }
}
