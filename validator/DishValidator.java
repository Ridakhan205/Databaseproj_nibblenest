package com.rmsproject.restaurant_management_system.validatorCOR;

import com.rmsproject.restaurant_management_system.dto.DishAddRequest;
import java.util.List;

public abstract class DishValidator {
    protected DishValidator next;
    public void setNext(DishValidator next) { this.next = next; }
    public abstract boolean validate(DishAddRequest request, List<String> errors);
}