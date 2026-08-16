package com.rmsproject.restaurant_management_system.dto;

import java.math.BigDecimal;

public class IngredientInputDTO {
    private String name;
    private BigDecimal minQty;
    private String unit;

    // Default constructor (required for JSON deserialization)
    public IngredientInputDTO() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getMinQty() { return minQty; }
    public void setMinQty(BigDecimal minQty) { this.minQty = minQty; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
}