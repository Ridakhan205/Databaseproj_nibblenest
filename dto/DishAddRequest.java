package com.rmsproject.restaurant_management_system.dto;

import java.math.BigDecimal;
import java.util.List;

public class DishAddRequest {
    private String name;
    private BigDecimal price;
    private String description;
    private String category;
    private String imagePath;
    private List<IngredientInputDTO> ingredients;   // now referencing public class

    // getters and setters
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
    public List<IngredientInputDTO> getIngredients() { return ingredients; }
    public void setIngredients(List<IngredientInputDTO> ingredients) { this.ingredients = ingredients; }
}