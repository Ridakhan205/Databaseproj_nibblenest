package com.rmsproject.restaurant_management_system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CashierController {

    @GetMapping("/cashier/dashboard")
    public String cashierDashboard() {
        return "dashboards/cashier";

    }
}