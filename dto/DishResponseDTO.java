package com.rmsproject.restaurant_management_system.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class DishResponseDTO {
    private UUID dishId;
    private String name;
    private BigDecimal price;
    private String description;
    private String category;
    private String imagePath;
    private boolean isAvailable;
    private List<IngredientStockDTO> ingredients;

    // getters and setters
    public UUID getDishId() { return dishId; }
    public void setDishId(UUID dishId) { this.dishId = dishId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getImagePath() { return imagePath; }
    public void setImagePath(String imagePath) { this.imagePath = imagePath; }
    public boolean isAvailable() { return isAvailable; }
    public void setAvailable(boolean available) { isAvailable = available; }
    public List<IngredientStockDTO> getIngredients() { return ingredients; }
    public void setIngredients(List<IngredientStockDTO> ingredients) { this.ingredients = ingredients; }
}