package com.rmsproject.restaurant_management_system.controller;

import com.rmsproject.restaurant_management_system.entity.User;
import com.rmsproject.restaurant_management_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

// ============================================================
// CUSTOMER API CONTROLLER
// This file handles all operations for logged-in customers:
//   - View their own profile
//   - Update their profile (name, email, phone, date of birth)
// Only customers can call these APIs (secured by SecurityConfig).
// ============================================================

@RestController
@RequestMapping("/api/customer")
public class CustomerApiController {

    @Autowired
    private UserRepository userRepository;   // to get and save user data from database

    // ========== GET PROFILE ==========
    // Returns the logged-in customer's full profile:
    // name, email, phone, date of birth, role, status, join date, total orders.
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        // Get the logged-in user's email from Spring Security
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();   // the email of the logged-in user

        // Find the user in the database by email
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        // Build a response map with all profile fields
        Map<String, Object> profile = new HashMap<>();
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("phone", user.getPhone());
        profile.put("dob", user.getDateOfBirth() != null ? user.getDateOfBirth().toString() : null);
        profile.put("role", user.getRole().toLowerCase());
        profile.put("status", user.getStatus().toLowerCase());
        profile.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate().toString() : null);
        profile.put("totalOrders", 0L);   // will be updated when order system is built

        return ResponseEntity.ok(profile);
    }

    // ========== UPDATE PROFILE ==========
    // Allows the logged-in customer to change:
    // name, email, phone, date of birth.
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload) {
        // Get the logged-in user's email
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        // Find the user in the database
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        // Get the new values from the request body (if provided)
        String newName = payload.get("name");
        String newEmail = payload.get("email");
        String newPhone = payload.get("phone");
        String newDob = payload.get("dob");

        // Update only the fields that are not empty
        if (newName != null && !newName.trim().isEmpty()) {
            user.setName(newName.trim());
        }
        if (newEmail != null && !newEmail.trim().isEmpty()) {
            user.setEmail(newEmail.trim());
        }
        if (newPhone != null && !newPhone.trim().isEmpty()) {
            user.setPhone(newPhone.trim());
        }
        if (newDob != null && !newDob.trim().isEmpty()) {
            // Convert the date string (yyyy-MM-dd) to LocalDate
            user.setDateOfBirth(LocalDate.parse(newDob, DateTimeFormatter.ISO_LOCAL_DATE));
        }

        // Save the updated user back to the database
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
    }
}