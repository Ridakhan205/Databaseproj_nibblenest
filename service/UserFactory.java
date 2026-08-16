package com.rmsproject.restaurant_management_system.service;

import com.rmsproject.restaurant_management_system.entity.User;
import org.springframework.stereotype.Component;

// this is Factory Pattern because I have a single method that creates
// and returns a complete User object in one step. Builder Pattern would
// require chained setter methods and a final .build() call,
// which I don't have here. I centralize object creation to avoid
// using 'new User()' everywhere, which is the main purpose of Factory Pattern.

@Component
public class UserFactory {

    public User createCustomer(String name, String email, String phone, String encodedPassword) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPassword(encodedPassword);
        user.setRole("CUSTOMER");
        user.setStatus("ACTIVE");
        return user;
    }

    public User createEmployee(String name, String email, String phone, String role, String shift, String employeeId, String encodedPassword) {
        User emp = new User();
        emp.setName(name);
        emp.setEmail(email);
        emp.setPhone(phone);
        emp.setPassword(encodedPassword);
        emp.setRole(role.toUpperCase());
        emp.setStatus("ACTIVE");
        emp.setShift(shift);
        emp.setEmployeeId(employeeId);
        return emp;
    }
}