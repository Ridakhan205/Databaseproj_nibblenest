package com.rmsproject.restaurant_management_system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

// ============================================================
// LoginController.java
// Serves the login and signup HTML pages
// These are public routes — no auth needed (in SecurityConfig)
//
// Spring Security handles the protection:
// - If user tries /customer/dashboard without session
//   → SecurityConfig redirects to /login automatically
// - No manual session check needed in controllers
//   Spring Security does it at the filter level before
//   the request even reaches any controller
// ============================================================

@Controller
public class LoginController {

    // Serves login page
    // GET /login
    @GetMapping("/login")
    public String loginPage() {
        return "login"; // templates/login.html
    }

    // Serves signup page
    // GET /signup
    @GetMapping("/signup")
    public String signupPage() {
        return "signup"; // templates/signup.html
    }
}