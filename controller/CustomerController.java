package com.rmsproject.restaurant_management_system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CustomerController {

    @GetMapping("/customer/dashboard")
    public String customerDashboard() {
        return "dashboards/customer"; // maps to templates/dashboards/customer.html
    }
}