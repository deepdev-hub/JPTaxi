package com.jptaxi.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetEmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final long expirationMinutes;

    public PasswordResetEmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@chikaimise.local}") String fromAddress,
            @Value("${app.password-reset.expiration-minutes:30}") long expirationMinutes
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.expirationMinutes = expirationMinutes;
    }

    public void sendResetLink(String email, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setTo(email);
        message.setSubject("Reset mat khau ChikaiMise");
        message.setText("""
                Xin chao,

                Ban vua yeu cau reset mat khau cho tai khoan ChikaiMise.
                Vui long mo link sau de dat mat khau moi:

                %s

                Link nay se het han sau %d phut va chi su dung duoc mot lan.
                Neu ban khong yeu cau reset mat khau, hay bo qua email nay.
                """.formatted(resetLink, expirationMinutes));
        mailSender.send(message);
    }
}
