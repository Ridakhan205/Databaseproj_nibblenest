package com.rmsproject.restaurant_management_system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ChefController {

    @GetMapping("/chef/dashboard")
    public String chefDashboard() {
        return "dashboards/chef"; // maps to templates/dashboards/chef.html

    }}