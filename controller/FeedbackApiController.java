package com.rmsproject.restaurant_management_system.controller;

import com.rmsproject.restaurant_management_system.entity.WebsiteFeedback;
import com.rmsproject.restaurant_management_system.repository.WebsiteFeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackApiController {

    @Autowired
    private WebsiteFeedbackRepository feedbackRepository;

    @PostMapping("/submit")
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        String email = (String) payload.get("email");
        String feedbackText = (String) payload.get("feedback");
        Integer rating = (Integer) payload.get("rating");

        if (name == null || email == null || feedbackText == null || rating == null) {
            return ResponseEntity.badRequest().body("All fields are required.");
        }
        if (rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().body("Rating must be between 1 and 5.");
        }

        WebsiteFeedback fb = new WebsiteFeedback();
        fb.setName(name);
        fb.setEmail(email);
        fb.setFeedbackText(feedbackText);
        fb.setRating(rating);
        feedbackRepository.save(fb);

        return ResponseEntity.ok(Map.of("message", "Thank you for your feedback!"));
    }
}