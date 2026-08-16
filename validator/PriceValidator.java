package com.rmsproject.restaurant_management_system.validatorCOR;

import com.rmsproject.restaurant_management_system.dto.DishAddRequest;
import java.math.BigDecimal;
import java.util.List;

public class PriceValidator extends DishValidator {
    @Override
    public boolean validate(DishAddRequest request, List<String> errors) {
        if (request.getPrice() == null || request.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            errors.add("Price must be greater than 0");
            return false;
        }
        return next == null || next.validate(request, errors);
    }
}