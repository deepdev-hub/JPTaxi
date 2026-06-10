package com.jptaxi.application.service;

public enum StorageImageType {
    RESTAURANT("restaurants", "restaurant-"),
    MENU_ITEM("menu-items", "menu-"),
    REVIEW("reviews", "review-");

    private final String directory;
    private final String filePrefix;

    StorageImageType(String directory, String filePrefix) {
        this.directory = directory;
        this.filePrefix = filePrefix;
    }

    public String directory() {
        return directory;
    }

    public String filePrefix() {
        return filePrefix;
    }
}
