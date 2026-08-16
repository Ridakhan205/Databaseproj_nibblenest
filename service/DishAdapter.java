package com.rmsproject.restaurant_management_system.service;

import com.rmsproject.restaurant_management_system.dto.DishAddRequest;
import com.rmsproject.restaurant_management_system.entity.Dish;
import org.springframework.stereotype.Component;

@Component
public class DishAdapter {

    public Dish toEntity(DishAddRequest request) {
        Dish dish = new Dish();
        dish.setName(request.getName());
        dish.setPrice(request.getPrice());
        dish.setDescription(request.getDescription());
        dish.setCategory(request.getCategory());
        dish.setImagePath(request.getImagePath());
        dish.setAvailable(false);  // initially not available
        return dish;
    }
}