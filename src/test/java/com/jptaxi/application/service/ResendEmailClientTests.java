package com.jptaxi.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.jptaxi.application.config.MailProperties;
import com.jptaxi.application.config.ResendApiProperties;
import com.jptaxi.application.config.ResendConfig;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

class ResendEmailClientTests {

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void sendsAuthorizedJsonRequestAndReturnsEmailId() throws Exception {
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<String> userAgent = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        startServer(exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            userAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, "{\"id\":\"email-123\"}");
        });
        ResendEmailClient client = client(Duration.ofSeconds(1));

        String emailId = client.send(
                "user@example.com",
                "Reset subject",
                "<p>Reset HTML</p>",
                "Reset text"
        );

        assertThat(emailId).isEqualTo("email-123");
        assertThat(authorization.get()).isEqualTo("Bearer test-api-key");
        assertThat(userAgent.get()).isEqualTo("restaurant-finder/1.0");
        assertThat(requestBody.get())
                .contains("\"from\":\"Restaurant Finder <noreply@links.luongvanhungnet.xyz>\"")
                .contains("\"to\":[\"user@example.com\"]")
                .contains("\"subject\":\"Reset subject\"")
                .contains("\"html\":\"<p>Reset HTML</p>\"")
                .contains("\"text\":\"Reset text\"");
    }

    @Test
    void convertsProviderErrorsToSafeApplicationException() throws Exception {
        startServer(exchange -> respond(
                exchange,
                403,
                "{\"message\":\"provider detail that must not reach the client\"}"
        ));

        assertThatThrownBy(() -> client(Duration.ofSeconds(1)).send(
                "user@example.com",
                "Subject",
                "<p>HTML</p>",
                "Text"
        ))
                .isInstanceOf(ResendEmailException.class)
                .hasMessage("Cannot send email through Resend")
                .hasNoCause();
    }

    @Test
    void convertsProviderServerErrorsToSafeApplicationException() throws Exception {
        startServer(exchange -> respond(exchange, 500, "{\"message\":\"temporary provider failure\"}"));

        assertThatThrownBy(() -> client(Duration.ofSeconds(1)).send(
                "user@example.com",
                "Subject",
                "<p>HTML</p>",
                "Text"
        ))
                .isInstanceOf(ResendEmailException.class)
                .hasMessage("Cannot send email through Resend")
                .hasNoCause();
    }

    @Test
    void rejectsSuccessfulResponsesWithoutAnEmailId() throws Exception {
        startServer(exchange -> respond(exchange, 200, "{}"));

        assertThatThrownBy(() -> client(Duration.ofSeconds(1)).send(
                "user@example.com",
                "Subject",
                "<p>HTML</p>",
                "Text"
        ))
                .isInstanceOf(ResendEmailException.class)
                .hasMessage("Resend did not return an email id");
    }

    @Test
    void convertsReadTimeoutsToSafeApplicationException() throws Exception {
        startServer(exchange -> {
            try {
                Thread.sleep(500);
                respond(exchange, 200, "{\"id\":\"too-late\"}");
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        });

        assertThatThrownBy(() -> client(Duration.ofMillis(100)).send(
                "user@example.com",
                "Subject",
                "<p>HTML</p>",
                "Text"
        ))
                .isInstanceOf(ResendEmailException.class)
                .hasMessage("Cannot send email through Resend")
                .hasNoCause();
    }

    private ResendEmailClient client(Duration readTimeout) {
        ResendApiProperties apiProperties = new ResendApiProperties(
                "test-api-key",
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/emails"),
                Duration.ofSeconds(1),
                readTimeout
        );
        MailProperties mailProperties = new MailProperties(
                "Restaurant Finder <noreply@links.luongvanhungnet.xyz>"
        );
        return new ResendEmailClient(
                new ResendConfig().resendRestClient(apiProperties),
                apiProperties,
                mailProperties
        );
    }

    private void startServer(com.sun.net.httpserver.HttpHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/emails", handler);
        server.start();
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] responseBytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, responseBytes.length);
        exchange.getResponseBody().write(responseBytes);
        exchange.close();
    }
}
