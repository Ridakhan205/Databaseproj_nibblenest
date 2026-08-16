package com.rmsproject.restaurant_management_system.repository;

import com.rmsproject.restaurant_management_system.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

// ============================================================
// UserRepository.java
// Spring Data JPA — auto-generates SQL from method names
// DB Table: users
// ============================================================

public interface UserRepository extends JpaRepository<User, UUID> {

    // ── LOGIN ─────────────────────────────────────────────────
    // Find user by email for login
    // Used by: CustomUserDetailsService, AuthService
    // SQL: SELECT * FROM users WHERE email = ?
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);
    Optional<User> findByEmailAndStatus(String email, String status);

    // Find all users with roles in given list
    List<User> findByRoleIn(List<String> roles);

    // Count active managers (for limit check)
    long countByRoleAndStatus(String role, String status);

    // Find by employeeId (already exists)
    Optional<User> findByEmployeeId(String employeeId);

    // ── PASSWORD RESET ────────────────────────────────────────
    // Find user by email for password reset flow
    // SQL: SELECT * FROM users WHERE email = ?
    // (reuses findByEmail above)



    // ── CUSTOMER SEARCH (admin) ───────────────────────────────
    // Search customers by name or email
    // SQL: SELECT * FROM users WHERE role='CUSTOMER'
    //      AND (name LIKE ? OR email LIKE ?)
    @Query("SELECT u FROM User u WHERE u.role = 'CUSTOMER' " +
            "AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<User> searchCustomers(@Param("query") String query);
}