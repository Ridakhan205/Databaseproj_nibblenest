package com.rmsproject.restaurant_management_system.service;



//-------------------------FACTORY PATTERN---------------------------



import com.rmsproject.restaurant_management_system.entity.User;
import com.rmsproject.restaurant_management_system.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private UserFactory userFactory;   // <-- ADD THIS

    // Helper to validate phone number (10 digits, starting with 6-9)
    private boolean isValidPhone(String phone) {
        String cleaned = phone.replaceAll("[\\s\\-]", "");
        return cleaned != null && (cleaned.matches("^03\\d{9}$") || cleaned.matches("^92\\d{10}$"));
    }

    @PostConstruct
    public void createDefaultAdmin() {
        String adminEmail = "admin@rms.com";
        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            User admin = new User();
            admin.setName("Admin");
            admin.setEmail(adminEmail);
            admin.setPhone("1234567890");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin.setStatus("ACTIVE");
            userRepository.save(admin);
            System.out.println("Default admin created: admin@rms.com / admin123");
        }
    }

    // ── SIGNUP ────────────────────────────────────────────────
    public String signup(User user) {
        // Check if email already registered
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return "email_taken";
        }
        // Hash password
        String encodedPassword = passwordEncoder.encode(user.getPassword());





        // UsING ---FACTORY--- to create customer
        User newUser = userFactory.createCustomer(
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                encodedPassword
        );





        userRepository.save(newUser);
        return "success";
    }

    // ── LOGIN (unchanged) ─────────────────────────────────────
    public String login(String email, String password,
                        HttpServletRequest request) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return "invalid";
        if ("INACTIVE".equalsIgnoreCase(user.getStatus())) return "inactive";
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            HttpSession session = request.getSession(true);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
            return user.getRole().trim().toLowerCase();
        } catch (DisabledException e) {
            return "inactive";
        } catch (BadCredentialsException e) {
            return "invalid";
        } catch (Exception e) {
            return "invalid";
        }
    }

    // ── GENERATE UNIQUE          EMPLOYEE ID         (unchanged) ────────────────
    public String generateUniqueEmployeeId() {
        String id;
        do {
            String random = java.util.UUID.randomUUID()
                    .toString().replace("-", "")
                    .substring(0, 4).toUpperCase();
            id = "EMP-" + random;
        } while (userRepository.findByEmployeeId(id).isPresent());
        return id;
    }

    // ──           GENERATE RANDOM PASSWORD          (unchanged) ───────────────────
    public String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder();
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}