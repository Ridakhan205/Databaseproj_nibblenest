package com.rmsproject.restaurant_management_system.controller;

import com.rmsproject.restaurant_management_system.entity.User;
import com.rmsproject.restaurant_management_system.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// ============================================================
// AuthController.java
// REST endpoints for login, signup, logout, password reset
// All public — no auth required (in SecurityConfig permitAll)
//
// NOTE: Logout is handled by Spring Security directly at
//       POST /api/auth/logout (configured in SecurityConfig)
//       No separate logout endpoint needed here
// ============================================================

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    // ── SIGNUP ────────────────────────────────────────────────
    // POST /api/auth/signup
    // Body: { name, email, phone, password }
    // Response: "success" | "email_taken" | "error"
    //
    // Only creates CUSTOMER accounts
    // Role + status set by AuthService, not from request body
    // DB: INSERT INTO users (uuid, name, email, phone, bcrypt_pwd,
    //     role='CUSTOMER', status='ACTIVE', created_at=NOW())
    @PostMapping("/signup")
    public String signup(@RequestBody User user) {
        try {
            return authService.signup(user);
        } catch (Exception e) {
            return "error";
        }
    }

    // ── LOGIN ─────────────────────────────────────────────────
    // POST /api/auth/login
    // Body: { email, password }
    // Response: "customer" | "chef" | "cashier" | "manager" |
    //           "admin" | "invalid" | "inactive"
    //
    // login.js uses the response to redirect to correct dashboard
    // HttpServletRequest passed to AuthService to save session
    //
    // "invalid"  → wrong email or wrong password
    // "inactive" → account deactivated by admin
    @PostMapping("/login")
    public String login(@RequestBody User user,
                        HttpServletRequest request) {
        try {
            return authService.login(
                    user.getEmail(),
                    user.getPassword(),
                    request
            );
        } catch (Exception e) {
            return "invalid";
        }
    }

    // GET /api/auth/check
// Returns authenticated status + role (if logged in)
    @GetMapping("/check")
    public ResponseEntity<?> checkAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() &&
                !(auth.getPrincipal() instanceof String && auth.getPrincipal().equals("anonymousUser"))) {

            // Extract role from authorities (Spring adds ROLE_ prefix)
            String role = auth.getAuthorities().stream()
                    .findFirst()
                    .map(granted -> granted.getAuthority().replace("ROLE_", "").toLowerCase())
                    .orElse("unknown");

            return ResponseEntity.ok(Map.of("authenticated", true, "role", role));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("authenticated", false));
    }

    // ── PASSWORD RESET REQUEST ────────────────────────────────
    // POST /api/auth/request-password-reset
    // Body: { email }
    // Response: "success" | "not_found"
    //
    // Called from:
    //   - Login page "Forgot Password?" link
    //   - Customer profile section
    //   - All employee profile cards (chef/cashier/manager)
    //
    // DB:  INSERT INTO password_reset_requests
    //      (request_id=UUID, user_id, role, email,
    //       requested_at=NOW(), status='PENDING')
    //      INSERT INTO notifications (user_id=adminId,
    //       type='password_reset_request')
    // TODO: Implement when PasswordResetRequest entity is ready
    @PostMapping("/request-password-reset")
    public String requestPasswordReset(@RequestBody java.util.Map<String, String> body) {
        // TODO: Implement in Phase 2
        // String email = body.get("email");
        // return passwordResetService.requestReset(email);
        return "success";
    }
}