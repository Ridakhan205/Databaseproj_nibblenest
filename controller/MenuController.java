package com.rmsproject.restaurant_management_system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MenuController {

    // TODO: Add authentication check later
    @GetMapping("/menu")
    public String menuPage() {
        return "menu"; // maps to templates/menu.html
    }
}
