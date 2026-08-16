package com.rmsproject.restaurant_management_system.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class EmployeeResponseDTO {
    private String userId;      // actual UUID as string
    private String employeeId;  // formatted "EMP-XXXX"
    private String name;
    private String email;
    private String phone;
    private String role;
    private String shift;
    private String joined;      // formatted date
    private String status;

    public EmployeeResponseDTO(UUID userId, String employeeId, String name, String email,
                               String phone, String role, String shift,
                               LocalDateTime createdAt, String status) {
        this.userId = userId.toString();
        this.employeeId = employeeId != null ? employeeId : ("EMP-" + userId.toString().substring(0, 4).toUpperCase());
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.role = role.toLowerCase();
        this.shift = shift;
        this.joined = createdAt.toLocalDate().toString();
        this.status = status.toLowerCase();
    }

    // Getters and setters (generate or use Lombok)
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getShift() { return shift; }
    public void setShift(String shift) { this.shift = shift; }
    public String getJoined() { return joined; }
    public void setJoined(String joined) { this.joined = joined; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}