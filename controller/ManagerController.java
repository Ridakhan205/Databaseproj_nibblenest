package com.rmsproject.restaurant_management_system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ManagerController {

    @GetMapping("/manager/dashboard")
    public String managerDashboard() {
        return "dashboards/manager";
    }

    // AUTH: Add session check — if not logged in redirect to /login
    // AUTH: If role != manager redirect to correct dashboard

    // TODO REST APIs to add in a @RestController:

    // ── REPORTS ──────────────────────────────────────────────
    // GET  /api/reports/sales?from={}&to={}
    //      → SELECT DATE(created_at), SUM(total), COUNT(*)
    //        FROM payments WHERE status='confirmed' AND created_at BETWEEN ? AND ?
    //        GROUP BY DATE(created_at)
    //
    // GET  /api/reports/orders?from={}&to={}
    //      → SELECT dish_name, COUNT(*) FROM order_items JOIN orders
    //        WHERE orders.created_at BETWEEN ? AND ? GROUP BY dish_name
    //
    // GET  /api/reports/feedback?from={}&to={}
    //      → SELECT rating, comment, dish_name, created_at FROM feedback
    //        WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC
    //
    // GET  /api/reports/inventory
    //      → SELECT ingredient_name, current_stock, minimum_threshold, unit
    //        FROM inventory ORDER BY status priority
    //
    // GET  /api/reports/cashier-performance?from={}&to={}
    //      → SELECT cashier_id, name, COUNT(*), quick, average, late, avg_time
    //        FROM payments JOIN users WHERE created_at BETWEEN ? AND ? GROUP BY cashier_id
    //
    // GET  /api/reports/chef-performance?from={}&to={}
    //      → SELECT chef_id, name, COUNT(*) total, top dish
    //        FROM orders JOIN users WHERE created_at BETWEEN ? AND ? GROUP BY chef_id

    // ── ALERTS ───────────────────────────────────────────────
    // GET  /api/manager/alerts
    //      → Aggregates: critical inventory, low feedback avg, late cashier rate

    // ── SUMMARY REPORT ───────────────────────────────────────
    // POST /api/reports/send-to-admin
    //      Body: { managerId, period, dateFrom, dateTo, reportData: JSON }
    //      → INSERT INTO manager_reports
    //      → INSERT INTO notifications for admin
    //
    // GET  /api/reports/sent-history?managerId={}
    //      → SELECT * FROM manager_reports WHERE manager_id=? ORDER BY sent_at DESC
    //
    // GET  /api/reports/download-pdf?managerId={}&from={}&to={}
    //      → Generate PDF from report data (JasperReports or iText)

    // ── INVENTORY FLAG ────────────────────────────────────────
    // POST /api/notifications/send
    //      Body: { role: 'admin', type: 'inventory_alert', message, managerId }
    //      → INSERT INTO notifications (user_id=adminId, ...)

    // ── PROFILE ──────────────────────────────────────────────
    // GET  /api/manager/profile
    //      → SELECT * FROM users WHERE user_id=? AND role='manager'
}