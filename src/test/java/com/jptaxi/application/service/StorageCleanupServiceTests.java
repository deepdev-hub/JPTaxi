package com.jptaxi.application.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class StorageCleanupServiceTests {

    @AfterEach
    void clearSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void deletesRemovedUrlsOnlyAfterTransactionCommit() {
        SupabaseStorageService storageService = mock(SupabaseStorageService.class);
        StorageCleanupService cleanupService = new StorageCleanupService(storageService);
        List<String> removedUrls = List.of(
                "https://project.supabase.co/storage/v1/object/public/images/restaurants/old.jpg"
        );
        TransactionSynchronizationManager.initSynchronization();

        cleanupService.deleteAfterCommit(removedUrls);

        verify(storageService, never()).deleteUrls(removedUrls);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(TransactionSynchronization::afterCommit);
        verify(storageService).deleteUrls(removedUrls);
    }

    @Test
    void doesNotDeleteWhenThereIsNoTransactionCommitToObserve() {
        SupabaseStorageService storageService = mock(SupabaseStorageService.class);
        StorageCleanupService cleanupService = new StorageCleanupService(storageService);

        cleanupService.deleteAfterCommit(List.of(
                "https://project.supabase.co/storage/v1/object/public/images/restaurants/old.jpg"
        ));

        verifyNoInteractions(storageService);
    }
}
