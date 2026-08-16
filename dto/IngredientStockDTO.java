package com.rmsproject.restaurant_management_system.dto;

import java.math.BigDecimal;

public class IngredientStockDTO {
    private String ingredientName;
    private BigDecimal currentStock;
    private BigDecimal minimumThreshold;
    private String unit;

    public IngredientStockDTO() {}
    public IngredientStockDTO(String ingredientName, BigDecimal currentStock, BigDecimal minimumThreshold, String unit) {
        this.ingredientName = ingredientName;
        this.currentStock = currentStock;
        this.minimumThreshold = minimumThreshold;
        this.unit = unit;
    }
    // getters and setters
    public String getIngredientName() { return ingredientName; }
    public void setIngredientName(String ingredientName) { this.ingredientName = ingredientName; }
    public BigDecimal getCurrentStock() { return currentStock; }
    public void setCurrentStock(BigDecimal currentStock) { this.currentStock = currentStock; }
    public BigDecimal getMinimumThreshold() { return minimumThreshold; }
    public void setMinimumThreshold(BigDecimal minimumThreshold) { this.minimumThreshold = minimumThreshold; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
}