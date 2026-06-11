package com.jptaxi.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class PasswordResetEmailServiceTests {

    @Test
    void sendsHtmlAndPlainTextResetEmail() {
        ResendEmailClient resendEmailClient = mock(ResendEmailClient.class);
        PasswordResetEmailService service = new PasswordResetEmailService(resendEmailClient, 30);
        String resetLink = "http://localhost:5173/reset-password?token=token-value";

        service.sendResetLink("user@example.com", resetLink);

        ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> textCaptor = ArgumentCaptor.forClass(String.class);
        verify(resendEmailClient).send(
                org.mockito.ArgumentMatchers.eq("user@example.com"),
                subjectCaptor.capture(),
                htmlCaptor.capture(),
                textCaptor.capture()
        );
        assertThat(subjectCaptor.getValue()).isEqualTo("Đặt lại mật khẩu Restaurant Finder");
        assertThat(htmlCaptor.getValue())
                .contains(resetLink)
                .contains("30 phút")
                .contains("Đặt lại mật khẩu");
        assertThat(textCaptor.getValue())
                .contains(resetLink)
                .contains("30 phút");
    }
}
