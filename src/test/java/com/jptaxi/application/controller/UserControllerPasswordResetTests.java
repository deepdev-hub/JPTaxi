package com.jptaxi.application.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import com.jptaxi.application.dto.ForgotPasswordRequest;
import com.jptaxi.application.entity.User;
import com.jptaxi.application.repository.UserRepository;
import com.jptaxi.application.service.DtoMapper;
import com.jptaxi.application.service.PasswordResetEmailService;
import com.jptaxi.application.service.PasswordResetTokenService;
import com.jptaxi.application.service.ResendEmailException;

class UserControllerPasswordResetTests {

    @Test
    void enabledAccountCreatesTokenAndSendsResetLink() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordResetTokenService tokenService = mock(PasswordResetTokenService.class);
        PasswordResetEmailService emailService = mock(PasswordResetEmailService.class);
        User user = enabledUser();
        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
        when(tokenService.createToken("user@example.com")).thenReturn("token-value");
        UserController controller = controller(userRepository, tokenService, emailService);

        var response = controller.forgotPassword(new ForgotPasswordRequest(" user@example.com "));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().message())
                .isEqualTo("If this email exists, password reset instructions have been sent.");
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendResetLink(
                org.mockito.ArgumentMatchers.eq("user@example.com"),
                linkCaptor.capture()
        );
        assertThat(linkCaptor.getValue())
                .isEqualTo("http://localhost:5173/reset-password?token=token-value");
    }

    @Test
    void unknownOrDisabledAccountsReturnGenericSuccessWithoutSending() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordResetTokenService tokenService = mock(PasswordResetTokenService.class);
        PasswordResetEmailService emailService = mock(PasswordResetEmailService.class);
        User disabledUser = enabledUser();
        disabledUser.setEnabled(false);
        when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("disabled@example.com"))
                .thenReturn(Optional.of(disabledUser));
        UserController controller = controller(userRepository, tokenService, emailService);

        assertThat(controller.forgotPassword(new ForgotPasswordRequest("missing@example.com")).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(controller.forgotPassword(new ForgotPasswordRequest("disabled@example.com")).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        verify(tokenService, never()).createToken(org.mockito.ArgumentMatchers.anyString());
        verify(emailService, never()).sendResetLink(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString()
        );
    }

    @Test
    void resendFailureEscapesAsRuntimeExceptionForTransactionRollback() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordResetTokenService tokenService = mock(PasswordResetTokenService.class);
        PasswordResetEmailService emailService = mock(PasswordResetEmailService.class);
        User user = enabledUser();
        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
        when(tokenService.createToken("user@example.com")).thenReturn("token-value");
        org.mockito.Mockito.doThrow(new ResendEmailException("Cannot send email through Resend"))
                .when(emailService)
                .sendResetLink(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        UserController controller = controller(userRepository, tokenService, emailService);

        assertThatThrownBy(() -> controller.forgotPassword(new ForgotPasswordRequest("user@example.com")))
                .isInstanceOf(ResendEmailException.class);
    }

    private UserController controller(
            UserRepository userRepository,
            PasswordResetTokenService tokenService,
            PasswordResetEmailService emailService
    ) {
        return new UserController(
                userRepository,
                mock(DtoMapper.class),
                tokenService,
                emailService,
                "http://localhost:5173/reset-password"
        );
    }

    private User enabledUser() {
        User user = new User();
        user.setEmail("user@example.com");
        user.setEnabled(true);
        return user;
    }
}
