package com.jptaxi.application.service;

public class SupabaseStorageException extends RuntimeException {

    public SupabaseStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
