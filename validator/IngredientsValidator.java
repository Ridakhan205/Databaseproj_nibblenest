package com.rmsproject.restaurant_management_system.validatorCOR;

import com.rmsproject.restaurant_management_system.dto.DishAddRequest;
import com.rmsproject.restaurant_management_system.dto.IngredientInputDTO;

import java.math.BigDecimal;
import java.util.List;

public class IngredientsValidator extends DishValidator {
    @Override
    public boolean validate(DishAddRequest request, List<String> errors) {
        if (request.getIngredients() == null || request.getIngredients().isEmpty()) {
            errors.add("At least one ingredient is required");
            return false;
        }
        for (IngredientInputDTO ing : request.getIngredients()) {
            if (ing.getName() == null || ing.getName().trim().isEmpty()) {
                errors.add("Ingredient name is required");
                return false;
            }
            if (ing.getMinQty() == null || ing.getMinQty().compareTo(BigDecimal.ZERO) <= 0) {
                errors.add("Minimum stock for " + ing.getName() + " must be positive");
                return false;
            }
        }
        return next == null || next.validate(request, errors);
    }
}