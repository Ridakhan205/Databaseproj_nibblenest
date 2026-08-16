package com.rmsproject.restaurant_management_system.config;

import com.rmsproject.restaurant_management_system.service.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

// ============================================================
// THIS FILE IS THE MAIN SECURITY CONTROLLER.
// It decides:
//   - Who can login (authentication)
//   - What pages/APIs each role can see (authorization)
//   - How many sessions per user
//   - What happens on logout
//   - What happens if someone tries to access without permission
// ============================================================

@Configuration               // "I am a setup class for Spring"
@EnableWebSecurity           // "Turn on Spring Security"
@EnableMethodSecurity        // "Allow @PreAuthorize in controllers"
public class SecurityConfig {

    // This is our custom class that loads user from database by email.
    private final CustomUserDetailsService customUserDetailsService;

    // This tool scrambles passwords so they are never stored as plain text.
    private final PasswordEncoder passwordEncoder;

    // Constructor: Spring gives us our custom user loader.
    public SecurityConfig(CustomUserDetailsService customUserDetailsService) {
        this.customUserDetailsService = customUserDetailsService;
        // 12 = how strong the scrambling is. Higher = more secure but slower.
        this.passwordEncoder = new BCryptPasswordEncoder(12);
    }

    // ============================================================
    // 1. AUTHENTICATION MANAGER
    // This is the "login checker engine".
    // It takes email + password, finds user from DB, and checks password.
    // ============================================================
    @Bean
    public AuthenticationManager authManager(HttpSecurity http) throws Exception {
        AuthenticationManagerBuilder builder = http.getSharedObject(AuthenticationManagerBuilder.class);
        builder
                .userDetailsService(customUserDetailsService) // "Go to our DB to find the user"
                .passwordEncoder(passwordEncoder);            // "Use BCrypt to match the password"
        return builder.build();
    }

    // This is a backup way for Spring to give the authentication manager.
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // ============================================================
    // 2. MAIN SECURITY RULES (The "Filter Chain")
    // This is a list of rules that Spring checks for every request.
    // It decides:
    //   - Which URLs are public (no login needed)
    //   - Which URLs need a specific role
    //   - Which URLs need any login
    // ============================================================
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                //We disabled CSRF because we use REST APIs with JSON data and session cookies.
                // This makes our frontend code simpler and is still safe because we check roles
                // and sessions.
                .csrf(csrf -> csrf.disable())

                // -------- URL ACCESS RULES --------
                .authorizeHttpRequests(auth -> auth

                        // 1. PUBLIC PAGES – anyone can see these without logging in.
                        .requestMatchers("/", "/login", "/signup", "/menu", "/feedback",
                                "/css/**", "/js/**", "/images/**",
                                "/api/auth/login", "/api/auth/signup",
                                "/api/menu/public", "/api/settings/contact","/api/public/**", "/api/feedback/submit").permitAll()

                        // 2. WEB PAGES – only specific roles can enter.
                        .requestMatchers("/customer/**").hasRole("CUSTOMER")   // Only customers
                        .requestMatchers("/chef/**").hasRole("CHEF")           // Only chefs
                        .requestMatchers("/cashier/**").hasRole("CASHIER")     // Only cashiers
                        .requestMatchers("/manager/**").hasRole("MANAGER")     // Only managers
                        .requestMatchers("/admin/**").hasRole("ADMIN")         // Only admins

                        // 3. REST APIs – also need specific roles.
                        .requestMatchers("/api/customer/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/chef/**").hasRole("CHEF")
                        .requestMatchers("/api/cashier/**").hasRole("CASHIER")
                        .requestMatchers("/api/manager/**").hasRole("MANAGER")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // 4. OTHER APIs – any logged-in user can access.
                        .requestMatchers("/api/orders/**").authenticated()
                        .requestMatchers("/api/payments/**").authenticated()
                        .requestMatchers("/api/cart/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/feedback/**").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()

                        // 5. ANY OTHER URL – also needs login.
                        .anyRequest().authenticated()
                )

                // We are NOT using Spring's default login page. We made our own.
                .formLogin(form -> form.disable())

                // Only one active session per user at a time.
                .sessionManagement(session -> session.maximumSessions(1))

                // -------- WHAT HAPPENS IF ACCESS IS DENIED? --------
                .exceptionHandling(ex -> ex
                        // If the request comes from JavaScript (AJAX) and user is not logged in,
                        // return a 401 error with a JSON message.
                        .authenticationEntryPoint((request, response, authException) -> {
                            if ("XMLHttpRequest".equals(request.getHeader("X-Requested-With"))) {
                                response.setStatus(401);
                                response.getWriter().write("{\"error\":\"Not authenticated\"}");
                            } else {
                                // For normal web page requests, send the user to the login page.
                                response.sendRedirect("/login");
                            }
                        })
                        // If the user is logged in but does NOT have the right role,
                        // also send them to the login page.
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.sendRedirect("/login");
                        })
                )

                // -------- LOGOUT --------
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")          // Send POST to this URL to logout.
                        .logoutSuccessUrl("/login")             // After logout, go to login page.
                        .invalidateHttpSession(true)            // Delete the session.
                        .clearAuthentication(true)              // Remove security info.
                        .deleteCookies("JSESSIONID")            // Delete the cookie from browser.
                );

        return http.build();
    }

    // ============================================================
    // 3. PASSWORD ENCODER (BCrypt)
    // This tool scrambles passwords before saving to the database.
    // Also used to check if the typed password matches the stored one.
    // ============================================================
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}