package com.rmsproject.restaurant_management_system.controller;

import com.rmsproject.restaurant_management_system.dto.DishResponseDTO;
import com.rmsproject.restaurant_management_system.dto.IngredientStockDTO;
import com.rmsproject.restaurant_management_system.entity.Dish;
import com.rmsproject.restaurant_management_system.entity.DishIngredient;
import com.rmsproject.restaurant_management_system.repository.DishRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
public class PublicMenuController {

    @Autowired
    private DishRepository dishRepository;

    @GetMapping("/menu")
    public ResponseEntity<List<DishResponseDTO>> getPublicMenu() {
        List<Dish> dishes = dishRepository.findAll();
        List<DishResponseDTO> result = dishes.stream().map(dish -> {
            List<IngredientStockDTO> ingredients = new ArrayList<>();
            for (DishIngredient di : dish.getDishIngredients()) {
                ingredients.add(new IngredientStockDTO(
                        di.getIngredient().getIngredientName(),
                        di.getIngredient().getCurrentStock(),
                        di.getIngredient().getMinimumThreshold(),
                        di.getIngredient().getUnit()
                ));
            }
            DishResponseDTO dto = new DishResponseDTO();
            dto.setDishId(dish.getDishId());
            dto.setName(dish.getName());
            dto.setPrice(dish.getPrice());
            dto.setDescription(dish.getDescription());
            dto.setCategory(dish.getCategory());
            dto.setImagePath(dish.getImagePath());
            dto.setAvailable(dish.isAvailable());
            dto.setIngredients(ingredients);
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}