package com.rmsproject.restaurant_management_system.service;

import com.rmsproject.restaurant_management_system.entity.User;
import com.rmsproject.restaurant_management_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;


// ============================================================
// CustomUserDetailsService.java
// Called by Spring Security's AuthenticationManager during login
// Loads user from DB by email and checks:
//   1. User exists
//   2. User is ACTIVE (not banned/deactivated)
// Returns UserDetails with role — Spring Security uses this
// to verify password and set authentication in session
// ============================================================

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        // Find user by email
        // SQL: SELECT * FROM users WHERE email = ?
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("No account found with email: " + email)
                );

        // Block INACTIVE users from logging in
        // Admin deactivates accounts → they cannot login
        // Returns DisabledException which login.js catches as "Account is inactive"
        if ("INACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new DisabledException("Account is inactive. Contact admin.");
        }

        // Build Spring Security UserDetails
        // .roles() automatically adds ROLE_ prefix
        // So role "CUSTOMER" becomes "ROLE_CUSTOMER"
        // This matches SecurityConfig .hasRole("CUSTOMER") check
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())   // BCrypt hash from DB
                .roles(user.getRole().toUpperCase().trim()) // ROLE_CUSTOMER etc
                .build();
    }
}