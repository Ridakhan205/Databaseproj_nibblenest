package com.rmsproject.restaurant_management_system.controller;


import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.servlet.http.HttpServletResponse;   // <-- add this import


@Controller
public class AdminController {

    @GetMapping("/admin/dashboard")
    public String adminDashboard(HttpServletResponse response) {
        // Prevent browser from caching the admin page
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
        return "dashboards/admin";
    }

    }