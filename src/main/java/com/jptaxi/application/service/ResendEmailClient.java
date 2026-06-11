package com.jptaxi.application.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.jptaxi.application.config.MailProperties;
import com.jptaxi.application.config.ResendApiProperties;

@Service
public class ResendEmailClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(ResendEmailClient.class);

    private final RestClient restClient;
    private final ResendApiProperties apiProperties;
    private final MailProperties mailProperties;

    public ResendEmailClient(
            @Qualifier("resendRestClient") RestClient restClient,
            ResendApiProperties apiProperties,
            MailProperties mailProperties
    ) {
        this.restClient = restClient;
        this.apiProperties = apiProperties;
        this.mailProperties = mailProperties;
    }

    public String send(String recipient, String subject, String html, String text) {
        ResendSendResponse response;
        try {
            response = restClient.post()
                    .uri(apiProperties.url())
                    .body(new ResendSendRequest(
                            mailProperties.from(),
                            List.of(recipient),
                            subject,
                            html,
                            text
                    ))
                    .retrieve()
                    .body(ResendSendResponse.class);
        } catch (RestClientResponseException exception) {
            LOGGER.warn("Resend email request failed with HTTP status {}", exception.getStatusCode().value());
            throw new ResendEmailException("Cannot send email through Resend");
        } catch (RestClientException exception) {
            LOGGER.warn("Resend email request failed before a valid response was received");
            throw new ResendEmailException("Cannot send email through Resend");
        }

        if (response == null || response.id() == null || response.id().isBlank()) {
            throw new ResendEmailException("Resend did not return an email id");
        }
        return response.id();
    }

    private record ResendSendRequest(
            String from,
            List<String> to,
            String subject,
            String html,
            String text
    ) {
    }

    private record ResendSendResponse(String id) {
    }
}
