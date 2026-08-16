package com.rmsproject.restaurant_management_system.validatorCOR;

import com.rmsproject.restaurant_management_system.dto.DishAddRequest;
import java.util.List;

public class NameValidator extends DishValidator {
    @Override
    public boolean validate(DishAddRequest request, List<String> errors) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            errors.add("Dish name is required");
            return false;
        }
        return next == null || next.validate(request, errors);
    }
}