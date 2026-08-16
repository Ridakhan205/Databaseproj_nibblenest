package com.rmsproject.restaurant_management_system.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class InventoryItemDTO {
    private UUID ingredientId;
    private String ingredientName;
    private BigDecimal currentStock;
    private BigDecimal minimumThreshold;
    private String unit;
    private LocalDateTime lastRestocked;
    private UUID dishId;          // for reference (not shown in table, but may be used)
    private String dishName;      // optional


    // constructor, getters, setters

    public UUID getIngredientId() {
        return ingredientId;
    }

    public String getIngredientName() {
        return ingredientName;
    }

    public BigDecimal getCurrentStock() {
        return currentStock;
    }

    public BigDecimal getMinimumThreshold() {
        return minimumThreshold;
    }

    public String getUnit() {
        return unit;
    }

    public LocalDateTime getLastRestocked() {
        return lastRestocked;
    }

    public UUID getDishId() {
        return dishId;
    }

    public String getDishName() {
        return dishName;
    }

    public void setIngredientId(UUID ingredientId) {
        this.ingredientId = ingredientId;
    }

    public void setIngredientName(String ingredientName) {
        this.ingredientName = ingredientName;
    }

    public void setCurrentStock(BigDecimal currentStock) {
        this.currentStock = currentStock;
    }

    public void setMinimumThreshold(BigDecimal minimumThreshold) {
        this.minimumThreshold = minimumThreshold;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public void setLastRestocked(LocalDateTime lastRestocked) {
        this.lastRestocked = lastRestocked;
    }

    public void setDishId(UUID dishId) {
        this.dishId = dishId;
    }

    public void setDishName(String dishName) {
        this.dishName = dishName;
    }
}