package com.jptaxi.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
public class PasswordResetEmailService {

    private static final String SUBJECT = "Đặt lại mật khẩu Restaurant Finder";

    private final ResendEmailClient resendEmailClient;
    private final long expirationMinutes;

    public PasswordResetEmailService(
            ResendEmailClient resendEmailClient,
            @Value("${app.password-reset.expiration-minutes:30}") long expirationMinutes
    ) {
        this.resendEmailClient = resendEmailClient;
        this.expirationMinutes = expirationMinutes;
    }

    public void sendResetLink(String email, String resetLink) {
        String safeResetLink = HtmlUtils.htmlEscape(resetLink);
        String html = """
                <!doctype html>
                <html lang="vi">
                <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033">
                  <div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border-radius:16px">
                    <h1 style="font-size:24px;margin:0 0 16px">Đặt lại mật khẩu</h1>
                    <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Restaurant Finder.</p>
                    <p style="margin:28px 0">
                      <a href="%s" style="display:inline-block;padding:12px 20px;background:#0066cc;color:#ffffff;text-decoration:none;border-radius:10px">
                        Đặt lại mật khẩu
                      </a>
                    </p>
                    <p>Liên kết này sẽ hết hạn sau %d phút và chỉ sử dụng được một lần.</p>
                    <p>Nếu nút không hoạt động, hãy mở liên kết sau:</p>
                    <p style="word-break:break-all"><a href="%s">%s</a></p>
                    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
                  </div>
                </body>
                </html>
                """.formatted(safeResetLink, expirationMinutes, safeResetLink, safeResetLink);
        String text = """
                Xin chào,

                Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Restaurant Finder.
                Mở liên kết sau để đặt mật khẩu mới:

                %s

                Liên kết này sẽ hết hạn sau %d phút và chỉ sử dụng được một lần.
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                """.formatted(resetLink, expirationMinutes);

        resendEmailClient.send(email, SUBJECT, html, text);
    }
}
