package com.rmsproject.restaurant_management_system.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserResponseDTO {
    private String userId;  // actual UUID as string
    private String id;      // formatted "CUST-xxxx"
    private String name;
    private String email;
    private String phone;
    private String joined;      // formatted date
    private long totalOrders;
    private String status;


    public UserResponseDTO(UUID userId, String name, String email, String phone, LocalDateTime createdAt, long totalOrders, String status) {
        this.userId = userId.toString();
        this.id = "CUST-" + userId.toString().substring(0, 4);
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.joined = createdAt.toLocalDate().toString(); // yyyy-mm-dd
        this.totalOrders = totalOrders;
        this.status = status.toLowerCase();
    }


    // Getters and setters (generate via IDE or Lombok)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public void setUserId(String userId) {
        this.userId = userId;
    }
    public String getUserId() {
        return userId;
    }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getJoined() { return joined; }
    public void setJoined(String joined) { this.joined = joined; }
    public long getTotalOrders() { return totalOrders; }
    public void setTotalOrders(long totalOrders) { this.totalOrders = totalOrders; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}