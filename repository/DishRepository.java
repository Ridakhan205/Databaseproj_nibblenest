package com.rmsproject.restaurant_management_system.repository;

import com.rmsproject.restaurant_management_system.entity.Dish;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DishRepository extends JpaRepository<Dish, UUID> {
}