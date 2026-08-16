package com.rmsproject.restaurant_management_system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// ============================================================
// WEB CONFIG - This file tells Spring where to find uploaded files.
// When the browser asks for /uploads/dishes/...,
// Spring looks inside the "uploads" folder on the computer.
// ============================================================

@Configuration  // This is a setup class for Spring.
public class WebConfig implements WebMvcConfigurer {

    @Override
    // This function tells Spring: "When someone asks for /uploads/...,
    // go and get the file from the 'uploads' folder on the disk."
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        // If browser asks for: /uploads/dishes/pic.jpg
        // Spring will look for: uploads/dishes/pic.jpg (inside project folder)
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}