package com.rmsproject.restaurant_management_system.repository;

import com.rmsproject.restaurant_management_system.entity.WebsiteFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface WebsiteFeedbackRepository extends JpaRepository<WebsiteFeedback, UUID> {
}