package com.jptaxi.application.service;

import java.util.Collection;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class StorageCleanupService {

    private static final Logger LOGGER = LoggerFactory.getLogger(StorageCleanupService.class);

    private final SupabaseStorageService storageService;

    public StorageCleanupService(SupabaseStorageService storageService) {
        this.storageService = storageService;
    }

    public void deleteAfterCommit(Collection<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return;
        }

        List<String> urlsToDelete = urls.stream()
                .filter(url -> url != null && !url.isBlank())
                .distinct()
                .toList();
        if (urlsToDelete.isEmpty()) {
            return;
        }

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            LOGGER.warn("Skipping obsolete storage cleanup because no transaction synchronization is active");
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(urlsToDelete);
            }
        });
    }

    private void deleteQuietly(List<String> urls) {
        try {
            storageService.deleteUrls(urls);
        } catch (SupabaseStorageException exception) {
            LOGGER.warn("Database commit succeeded, but obsolete storage objects could not be deleted", exception);
        }
    }
}
