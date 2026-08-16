package com.rmsproject.restaurant_management_system.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "dish_ingredients")
public class DishIngredient {
    @EmbeddedId
    private DishIngredientId id;

    @ManyToOne
    @MapsId("dishId")
    @JoinColumn(name = "dish_id")
    private Dish dish;

    @ManyToOne
    @MapsId("ingredientId")
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    @Column(name = "quantity_required", nullable = false)
    private BigDecimal quantityRequired = BigDecimal.ONE;

    @Column(name = "is_main_ingredient")
    private boolean mainIngredient = true;

    // Getters and setters
    public DishIngredientId getId() { return id; }
    public void setId(DishIngredientId id) { this.id = id; }
    public Dish getDish() { return dish; }
    public void setDish(Dish dish) { this.dish = dish; }
    public Ingredient getIngredient() { return ingredient; }
    public void setIngredient(Ingredient ingredient) { this.ingredient = ingredient; }
    public BigDecimal getQuantityRequired() { return quantityRequired; }
    public void setQuantityRequired(BigDecimal quantityRequired) { this.quantityRequired = quantityRequired; }
    public boolean isMainIngredient() { return mainIngredient; }
    public void setMainIngredient(boolean mainIngredient) { this.mainIngredient = mainIngredient; }
}