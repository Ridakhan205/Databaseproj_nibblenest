package com.rmsproject.restaurant_management_system.controller;

// ============================================================
// ADMIN API CONTROLLER
// This file handles all admin operations:
//   - Manage users (view, activate, deactivate, delete)
//   - Manage employees (hire, edit, deactivate, delete)
//   - Manage inventory (view, restock, delete ingredient)
//   - Manage menu (add dish with image, edit price, delete dish)
//   - View and delete website feedback
// ============================================================

//-----------------------------FACTORY PATTERN USED------------------------------------
//-------------------------CHAIN OF RESPONSIBILITY PATTERN-------------------------------
//-----------------------------OBSERVER PATTERN-----------------------------------------

import com.rmsproject.restaurant_management_system.dto.*;
import com.rmsproject.restaurant_management_system.entity.*;
import com.rmsproject.restaurant_management_system.repository.*;
import com.rmsproject.restaurant_management_system.service.DishAdapter;
import com.rmsproject.restaurant_management_system.service.UserFactory;
import com.rmsproject.restaurant_management_system.validatorCOR.DishValidator;
import com.rmsproject.restaurant_management_system.validatorCOR.IngredientsValidator;
import com.rmsproject.restaurant_management_system.validatorCOR.NameValidator;
import com.rmsproject.restaurant_management_system.validatorCOR.PriceValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")   // Only admin users can call any method in this controller
public class AdminApiController {

    // -------------------- DATABASE HELPERS (Repositories) --------------------
    @Autowired private UserRepository userRepository;               // for users table
    @Autowired private PasswordEncoder passwordEncoder;             // for hashing passwords
    @Autowired private DishRepository dishRepository;               // for dishes table
    @Autowired private IngredientRepository ingredientRepository;   // for ingredients table
    @Autowired private DishIngredientRepository dishIngredientRepository; // for dish-ingredient links
    @Autowired private WebsiteFeedbackRepository websiteFeedbackRepository; // for website feedback

    // -------------------- DESIGN PATTERN HELPERS --------------------
    @Autowired private UserFactory userFactory;   // Factory pattern – creates user objects
    @Autowired private DishAdapter dishAdapter;   // Adapter pattern – converts DTO to Dish entity

    // ============================================================
    // 1. FEEDBACK MANAGEMENT (Admin can view and delete website feedback)
    // ============================================================

    // Get all feedback from the website_feedback table
    @GetMapping("/feedbacks")
    public ResponseEntity<Map<String, List<WebsiteFeedback>>> getAllFeedbacks() {
        List<WebsiteFeedback> websiteFeedbacks = websiteFeedbackRepository.findAll();
        Map<String, List<WebsiteFeedback>> response = new HashMap<>();
        response.put("website", websiteFeedbacks);
        response.put("order", new ArrayList<>()); // placeholder for future order feedback
        return ResponseEntity.ok(response);
    }


    // Delete a specific feedback by its ID
    @DeleteMapping("/feedbacks/{feedbackId}")
    public ResponseEntity<?> deleteFeedback(@PathVariable UUID feedbackId) {
        WebsiteFeedback feedback = websiteFeedbackRepository.findById(feedbackId).orElse(null);
        if (feedback == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Feedback not found");
        }
        websiteFeedbackRepository.delete(feedback);
        return ResponseEntity.ok(Map.of("message", "Feedback deleted"));
    }

    // ============================================================
    // 2. MANAGE USERS (Customers)
    //    View all customers, activate/deactivate, delete
    // ============================================================

    // Show all customers (role = CUSTOMER) with basic info
    @GetMapping("/users")
    public ResponseEntity<List<UserResponseDTO>> getAllCustomers() {
        List<User> customers = userRepository.findByRole("CUSTOMER");
        List<UserResponseDTO> response = customers.stream()
                .map(user -> new UserResponseDTO(
                        user.getUserId(),
                        user.getName(),
                        user.getEmail(),
                        user.getPhone() != null ? user.getPhone() : "",
                        user.getCreatedAt(),
                        0L,   // total orders (not implemented yet)
                        user.getStatus()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // Change customer status (ACTIVE / INACTIVE)
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable UUID userId, @RequestBody Map<String, String> payload) {
        String newStatus = payload.get("status");
        if (newStatus == null || (!newStatus.equalsIgnoreCase("ACTIVE") && !newStatus.equalsIgnoreCase("INACTIVE"))) {
            return ResponseEntity.badRequest().body("Invalid status. Must be 'ACTIVE' or 'INACTIVE'");
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        if (!user.getRole().equals("CUSTOMER")) {
            return ResponseEntity.badRequest().body("Only customer accounts can be deactivated/activated");
        }
        user.setStatus(newStatus.toUpperCase());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User status updated to " + newStatus));
    }

    // Permanently delete a customer account
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        if (!"CUSTOMER".equals(user.getRole())) {
            return ResponseEntity.badRequest().body("Only customer accounts can be deleted");
        }
        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // ============================================================
    // 3. MANAGE EMPLOYEES (Chef, Cashier, Manager)
    //    View, hire (with auto-generated ID & password), edit, deactivate, delete
    // ============================================================

    // Show all employees (roles: CHEF, CASHIER, MANAGER)
    @GetMapping("/employees")
    public ResponseEntity<List<EmployeeResponseDTO>> getAllEmployees() {
        List<String> roles = Arrays.asList("CHEF", "CASHIER", "MANAGER");
        List<User> employees = userRepository.findByRoleIn(roles);
        List<EmployeeResponseDTO> response = employees.stream()
                .map(user -> new EmployeeResponseDTO(
                        user.getUserId(),
                        user.getEmployeeId(),
                        user.getName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole(),
                        user.getShift(),
                        user.getCreatedAt(),
                        user.getStatus()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // Hire a new employee – creates an employee account with random password
    @PostMapping("/employees/add")
    public ResponseEntity<?> hireEmployee(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String email = payload.get("email");
        String phone = payload.get("phone");
        String role = payload.get("role");
        String shift = payload.get("shift");
        // Basic validation
        if (name == null || email == null || phone == null || role == null || shift == null) {
            return ResponseEntity.badRequest().body("All fields are required");
        }
        String upperRole = role.toUpperCase();
        if (!Arrays.asList("CHEF", "CASHIER", "MANAGER").contains(upperRole)) {
            return ResponseEntity.badRequest().body("Invalid role");
        }
        // Manager limit: only 2 active managers allowed
        if ("MANAGER".equals(upperRole)) {
            long activeManagers = userRepository.countByRoleAndStatus("MANAGER", "ACTIVE");
            if (activeManagers >= 2) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Maximum 2 active managers allowed");
            }
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered");
        }
        // Generate employee ID and random password
        String employeeId = generateUniqueEmployeeId();
        String plainPassword = generateRandomPassword();
        String encodedPassword = passwordEncoder.encode(plainPassword);

        // ===== FACTORY PATTERN =====
        // Use UserFactory to create the employee object (sets all fields at once)
        User employee = userFactory.createEmployee(name, email, phone, role, shift, employeeId, encodedPassword);
        userRepository.save(employee);

        System.out.println("Employee hired: " + email + " | Emp ID: " + employeeId + " | Temp Password: " + plainPassword);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Employee hired successfully");
        response.put("employeeId", employeeId);
        return ResponseEntity.ok(response);
    }

    // Edit employee details (only name, email, phone – role and shift are fixed)
    @PutMapping("/employees/{userId}")
    public ResponseEntity<?> updateEmployee(@PathVariable UUID userId, @RequestBody Map<String, String> payload) {
        User employee = userRepository.findById(userId).orElse(null);
        if (employee == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Employee not found");
        String newName = payload.get("name");
        String newEmail = payload.get("email");
        String newPhone = payload.get("phone");
        if (newName != null && !newName.trim().isEmpty()) employee.setName(newName.trim());
        if (newEmail != null && !newEmail.trim().isEmpty()) employee.setEmail(newEmail.trim());
        if (newPhone != null && !newPhone.trim().isEmpty()) employee.setPhone(newPhone.trim());
        userRepository.save(employee);
        return ResponseEntity.ok(Map.of("message", "Employee updated"));
    }

    // Activate or deactivate an employee account
    @PutMapping("/employees/{userId}/status")
    public ResponseEntity<?> updateEmployeeStatus(@PathVariable UUID userId, @RequestBody Map<String, String> payload) {
        String newStatus = payload.get("status");
        if (newStatus == null || (!newStatus.equalsIgnoreCase("ACTIVE") && !newStatus.equalsIgnoreCase("INACTIVE"))) {
            return ResponseEntity.badRequest().body("Invalid status");
        }
        User employee = userRepository.findById(userId).orElse(null);
        if (employee == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Employee not found");
        String role = employee.getRole();
        if (!Arrays.asList("CHEF", "CASHIER", "MANAGER").contains(role)) {
            return ResponseEntity.badRequest().body("Only employee accounts can be deactivated/activated");
        }
        employee.setStatus(newStatus.toUpperCase());
        userRepository.save(employee);
        return ResponseEntity.ok(Map.of("message", "Employee status updated"));
    }

    // Permanently delete an employee account
    @DeleteMapping("/employees/{userId}")
    public ResponseEntity<?> deleteEmployee(@PathVariable UUID userId) {
        User employee = userRepository.findById(userId).orElse(null);
        if (employee == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Employee not found");
        String role = employee.getRole();
        if (!Arrays.asList("CHEF", "CASHIER", "MANAGER").contains(role)) {
            return ResponseEntity.badRequest().body("Only employee accounts can be deleted");
        }
        userRepository.delete(employee);
        return ResponseEntity.ok(Map.of("message", "Employee deleted successfully"));
    }

    // ============================================================
    // 4. MANAGE INVENTORY (Ingredients)
    //    View all ingredients, restock, delete (if not used in any dish)
    // ============================================================

    // Show all ingredients with current stock, min threshold, unit, last restock
    @GetMapping("/inventory")
    public ResponseEntity<List<InventoryItemDTO>> getInventory() {
        List<Ingredient> ingredients = ingredientRepository.findAll();
        List<InventoryItemDTO> result = new ArrayList<>();
        for (Ingredient ing : ingredients) {
            InventoryItemDTO dto = new InventoryItemDTO();
            dto.setIngredientId(ing.getIngredientId());
            dto.setIngredientName(ing.getIngredientName());
            dto.setCurrentStock(ing.getCurrentStock());
            dto.setMinimumThreshold(ing.getMinimumThreshold());
            dto.setUnit(ing.getUnit());
            dto.setLastRestocked(ing.getLastRestocked());
            // Optional: get the first dish that uses this ingredient (for display)
            List<DishIngredient> links = dishIngredientRepository.findByIngredientId(ing.getIngredientId());
            if (!links.isEmpty()) {
                dto.setDishId(links.get(0).getDish().getDishId());
                dto.setDishName(links.get(0).getDish().getName());
            }
            result.add(dto);
        }
        return ResponseEntity.ok(result);
    }

    // Restock an ingredient – add quantity to current stock
    @PutMapping("/inventory/{ingredientId}/restock")
    public ResponseEntity<?> restockIngredient(@PathVariable UUID ingredientId,
                                               @RequestBody Map<String, BigDecimal> payload) {
        BigDecimal addQty = payload.get("addQty");
        if (addQty == null || addQty.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Invalid quantity");
        }
        Ingredient ingredient = ingredientRepository.findById(ingredientId).orElse(null);
        if (ingredient == null) return ResponseEntity.notFound().build();
        ingredient.setCurrentStock(ingredient.getCurrentStock().add(addQty));
        ingredient.setLastRestocked(LocalDateTime.now());
        ingredientRepository.save(ingredient);

        // ===== OBSERVER PATTERN =====
        // Notify all dishes that use this ingredient to update their availability
        updateDishAvailabilityForIngredient(ingredientId);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Stock updated");
        response.put("newStock", ingredient.getCurrentStock());
        return ResponseEntity.ok(response);
    }

    // Helper method: for each dish that uses the ingredient, check if all ingredients are sufficient
    private void updateDishAvailabilityForIngredient(UUID ingredientId) {
        List<DishIngredient> dishLinks = dishIngredientRepository.findByIngredientId(ingredientId);
        for (DishIngredient di : dishLinks) {
            Dish dish = di.getDish();
            boolean allSufficient = true;
            for (DishIngredient req : dish.getDishIngredients()) {
                Ingredient ing = req.getIngredient();
                if (ing.getCurrentStock().compareTo(req.getQuantityRequired()) < 0) {
                    allSufficient = false;
                    break;
                }
            }
            dish.setAvailable(allSufficient);
            dishRepository.save(dish);
        }
    }

    // Delete an ingredient – only if it is not used in any dish
    @DeleteMapping("/inventory/{ingredientId}")
    public ResponseEntity<?> deleteIngredient(@PathVariable UUID ingredientId) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId).orElse(null);
        if (ingredient == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Ingredient not found");
        }
        List<DishIngredient> dishLinks = dishIngredientRepository.findByIngredientId(ingredientId);
        if (!dishLinks.isEmpty()) {
            return ResponseEntity.badRequest().body("Cannot delete ingredient because it is used in one or more dishes.");
        }
        ingredientRepository.delete(ingredient);
        return ResponseEntity.ok(Map.of("message", "Ingredient deleted successfully"));
    }

    // ============================================================
    // 5. MANAGE MENU (Dishes)
    //    View all dishes, add new dish with image, update price, delete dish
    // ============================================================

    // Show all dishes with their ingredients and stock info
    @GetMapping("/menu")
    public ResponseEntity<List<DishResponseDTO>> getAllDishes() {
        List<Dish> dishes = dishRepository.findAll();
        List<DishResponseDTO> result = new ArrayList<>();
        for (Dish dish : dishes) {
            List<IngredientStockDTO> ingredients = new ArrayList<>();
            for (DishIngredient di : dish.getDishIngredients()) {
                Ingredient ing = di.getIngredient();
                ingredients.add(new IngredientStockDTO(
                        ing.getIngredientName(),
                        ing.getCurrentStock(),
                        ing.getMinimumThreshold(),
                        ing.getUnit()
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
            result.add(dto);
        }
        return ResponseEntity.ok(result);
    }

    // Add a new dish – receives name, price, description, category, optional image, and ingredients list
    @PostMapping("/menu/add")
    public ResponseEntity<?> addDish(
            @RequestParam("name") String name,
            @RequestParam("price") BigDecimal price,
            @RequestParam("description") String description,
            @RequestParam("category") String category,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam("ingredients") String ingredientsJson) {

        try {
            // Parse the JSON string into a list of IngredientInputDTO objects
            ObjectMapper mapper = new ObjectMapper();
            List<IngredientInputDTO> ingredients = mapper.readValue(ingredientsJson,
                    new TypeReference<List<IngredientInputDTO>>() {});
            // Save the uploaded image to the uploads/dishes folder
            String imagePath = null;
            if (image != null && !image.isEmpty()) {
                String projectRoot = System.getProperty("user.dir");
                String uploadDir = projectRoot + File.separator + "uploads" + File.separator + "dishes" + File.separator;
                File dir = new File(uploadDir);
                if (!dir.exists()) dir.mkdirs();
                String fileName = UUID.randomUUID().toString() + "_" + image.getOriginalFilename();
                File dest = new File(uploadDir + fileName);
                image.transferTo(dest);
                imagePath = "/uploads/dishes/" + fileName;
            }
            // Build a DishAddRequest DTO from the parameters (used for validation)
            DishAddRequest request = new DishAddRequest();
            request.setName(name);
            request.setPrice(price);
            request.setDescription(description);
            request.setCategory(category);
            request.setImagePath(imagePath);
            request.setIngredients(ingredients);

            // ===== CHAIN OF RESPONSIBILITY PATTERN =====
            // Create a chain of validators: Name -> Price -> Ingredients
            // Each validator checks one thing; if it fails, the chain stops and returns error
            DishValidator nameValidator = new NameValidator();
            DishValidator priceValidator = new PriceValidator();
            DishValidator ingredientsValidator = new IngredientsValidator();
            nameValidator.setNext(priceValidator);
            priceValidator.setNext(ingredientsValidator);

            List<String> errors = new ArrayList<>();
            if (!nameValidator.validate(request, errors)) {
                return ResponseEntity.badRequest().body(String.join(", ", errors));
            }
            // ===== End of Chain of Responsibility =====

            // ===== ADAPTER PATTERN =====
            // Convert DishAddRequest DTO to Dish entity using the adapter
            Dish dish = dishAdapter.toEntity(request);
            dish = dishRepository.save(dish);

            // Process each ingredient: find existing or create new, then link to dish
            for (IngredientInputDTO ingDto : ingredients) {
                Ingredient ingredient = ingredientRepository.findByIngredientName(ingDto.getName())
                        .orElseGet(() -> {
                            Ingredient newIng = new Ingredient();
                            newIng.setIngredientName(ingDto.getName());
                            newIng.setMinimumThreshold(ingDto.getMinQty());
                            newIng.setUnit(ingDto.getUnit());
                            newIng.setCurrentStock(BigDecimal.ZERO);
                            return ingredientRepository.save(newIng);
                        });
                // Create the link between dish and ingredient
                DishIngredient di = new DishIngredient();
                DishIngredientId id = new DishIngredientId(dish.getDishId(), ingredient.getIngredientId());
                di.setId(id);
                di.setDish(dish);
                di.setIngredient(ingredient);
                di.setQuantityRequired(BigDecimal.ONE);
                di.setMainIngredient(true);
                dishIngredientRepository.save(di);
            }
            return ResponseEntity.ok(Map.of("message", "Dish added", "dishId", dish.getDishId()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to add dish: " + e.getMessage());
        }
    }

    // Update only the price of a dish
    @PutMapping("/menu/{dishId}")
    public ResponseEntity<?> updateDishPrice(@PathVariable UUID dishId,
                                             @RequestBody Map<String, BigDecimal> payload) {
        BigDecimal newPrice = payload.get("price");
        if (newPrice == null || newPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Invalid price");
        }
        Dish dish = dishRepository.findById(dishId).orElse(null);
        if (dish == null) return ResponseEntity.notFound().build();
        dish.setPrice(newPrice);
        dishRepository.save(dish);
        return ResponseEntity.ok(Map.of("message", "Price updated"));
    }

    // Delete a dish – cascade deletes dish_ingredients links
    @DeleteMapping("/menu/{dishId}")
    public ResponseEntity<?> deleteDish(@PathVariable UUID dishId) {
        Dish dish = dishRepository.findById(dishId).orElse(null);
        if (dish == null) return ResponseEntity.notFound().build();
        dishRepository.delete(dish);   // this also deletes the dish_ingredients records (ON DELETE CASCADE)
        return ResponseEntity.ok(Map.of("message", "Dish removed"));
    }

    // ============================================================
    // HELPER METHODS (used internally)
    // ============================================================

    // Generate a unique employee ID in format EMP-XXXX (4 random uppercase chars)
    private String generateUniqueEmployeeId() {
        String id;
        do {
            String random = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            id = "EMP-" + random;
        } while (userRepository.findByEmployeeId(id).isPresent());
        return id;
    }


    // Generate a random 8-character alphanumeric password (for new employees)
    private String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        Random rnd = new Random();
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return sb.toString();
    }
}