package com.rmsproject.restaurant_management_system.repository;

import com.rmsproject.restaurant_management_system.entity.DishIngredient;
import com.rmsproject.restaurant_management_system.entity.DishIngredientId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface DishIngredientRepository extends JpaRepository<DishIngredient, DishIngredientId> {

    @Query("SELECT di FROM DishIngredient di WHERE di.ingredient.ingredientId = :ingredientId")
    List<DishIngredient> findByIngredientId(@Param("ingredientId") UUID ingredientId);
}