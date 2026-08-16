package com.rmsproject.restaurant_management_system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FeedbackController {

    @GetMapping("/feedback")
    public String feedbackPage() {
        return "feedback"; // maps to templates/feedback.html
    }

}
