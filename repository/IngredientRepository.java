package com.rmsproject.restaurant_management_system.repository;

import com.rmsproject.restaurant_management_system.entity.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface IngredientRepository extends JpaRepository<Ingredient, UUID> {
    // ADD THIS METHOD
    Optional<Ingredient> findByIngredientName(String ingredientName);
}