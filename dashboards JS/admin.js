// ============================================================
// admin.js — Admin Dashboard
// ============================================================
// SEARCH TAGS:
//   DB:       → SQL Server table/query needed
//   API:      → Spring Boot REST endpoint needed
//   AUTH:     → Session/login check needed
//   REALTIME: → WebSocket or polling needed
//   TODO:     → Uncomment or implement when backend is ready
//   TAX:      → Tax value used here — keep in sync with settings
// ============================================================
//
// CROSS-DASHBOARD CONNECTIONS:
//
//   TAX (currentTax / PKR 50):
//     → cashier.js:  const TAX = 50
//                    FIX: Replace with API: GET /api/settings/tax on load
//                    Used in: generateBill(), receipt totals
//     → customer.js: cartTax calculation in updateCartUI()
//                    FIX: Replace with API: GET /api/settings/tax on load
//                    Used in: cart sidebar totals, placeOrder()
//     → When admin saves new tax here → REALTIME push to cashier + customer
//        via WebSocket event: { type: 'tax_updated', taxAmount: N }
//        Both dashboards listen and update their local TAX value
//
//   DISH AVAILABILITY (isAvailable):
//     → customer.js:  dishes marked unavailable show faded + "Not Available"
//                     on menu grid and dish card modal
//                     DB:  dishes.is_available = 0
//                     REALTIME: WebSocket event { type: 'dish_availability',
//                               dishId, isAvailable }
//                               Customer dashboard listens → updates menu grid
//     → chef.js:      preparing checklist only shows main ingredients
//                     (dish_ingredients WHERE is_main_ingredient=1)
//                     REALTIME: WebSocket event { type: 'ingredient_stock',
//                               ingredientId, newStock }
//                               Chef dashboard updates ingredient checklist
//     → website menu page: same WebSocket event → dish fades out/in
//
//   PASSWORD RESET REQUESTS:
//     Source buttons are in these files — all send to admin settings:
//     → login page:     "Forgot Password?" link
//                       API: POST /api/auth/request-password-reset
//     → customer.html:  Profile section → "Forgot Password" button
//                       (below Save Changes button in section-profile)
//                       API: POST /api/auth/request-password-reset
//     → cashier.html:   Profile card modal → below Logout button
//                       (inside .profile-btn-row in profileCardModal)
//                       API: POST /api/auth/request-password-reset
//     → chef.html:      Profile card modal → below Logout button
//                       (inside .profile-btn-row in profileCardModal)
//                       API: POST /api/auth/request-password-reset
//     → manager.html:   Profile card modal → below Logout button
//                       (inside .profile-btn-row in profileCardModal)
//                       API: POST /api/auth/request-password-reset
//     All requests: INSERT INTO password_reset_requests + notify admin
//

//   EMPLOYEE HIRED:
//     → After POST /api/admin/employees/add succeeds:
//       REALTIME: Their dashboard becomes accessible (session can be created)
//       Email sent with employee_id + temp password
//
//   MANAGER REPORT RECEIVED:
//     → manager.js sendReportToAdmin() → POST /api/reports/send-to-admin
//       REALTIME: WebSocket push to admin → badge updates + reports table refreshes
//       admin.js WebSocket listener → renderReports()
// ============================================================


// ============================================================
// STATE
// ============================================================


// All IDs in this system are auto-generated (UUID) by Spring Boot
// DB: user_id, employee_id, customer_id, dish_id, ingredient_id,
//     order_id, payment_id, report_id, request_id
//     — all UUID.randomUUID() or auto-increment, never manual

// TAX: Loaded from DB on page init
// DB:  Table: settings WHERE key='tax_amount'
// API: GET /api/settings/tax
// REALTIME: When updated here → push to cashier.js + customer.js
//   WebSocket event: { type: 'tax_updated', taxAmount: N }
//   cashier.js: update const TAX — used in generateBill() + receipt
//   customer.js: update cart tax calculation in updateCartUI()
let currentTax = 50;
// FOOTER CONTACT: Loaded from DB on page init
// DB:  Table: settings WHERE key='footer_contact'
// API: GET /api/settings/footer-contact
// Used by website footer on all pages
let footerContact = '+92 300 1234567';

// ── MOCK DATA ─────────────────────────────────────────────────
// REMOVE ALL MOCK DATA BEFORE GOING LIVE
// Replace each with the real API call shown in comments above it


// DB:  Table: dishes JOIN dish_ingredients JOIN inventory

// DB:  Table: manager_reports
// API: GET /api/admin/reports
// Duplicate periods grouped — both manager names in one row
let mockReports = [
    {
        id: 'RPT-001', period: 'May 2026',
        managers: ['Manager Zara'],
        dateSent: '01 Jun 2026',
        data: { revenue: 108800, orders: 153, avgRating: 4.2, criticalItems: 2, cashierAvgTime: '3.8 min', chefOrders: 153 }
    },
    {
        id: 'RPT-002', period: 'April 2026',
        managers: ['Manager Zara', 'Manager Ali'],
        dateSent: '02 May 2026',
        data: { revenue: 95400, orders: 131, avgRating: 4.0, criticalItems: 1, cashierAvgTime: '4.1 min', chefOrders: 131 }
    }
];

// DB:  Table: password_reset_requests
// API: GET /api/admin/reset-requests
// These requests come from:
//   login page + customer profile + all employee profile cards
let mockResetRequests = [
    { id: 'REQ-001', name: 'Ahmed Khan',   role: 'customer', email: 'ahmed@example.com', requestedAt: '06 Jun 2026 · 09:12 AM', status: 'pending'  },
    { id: 'REQ-002', name: 'Chef Bilal',   role: 'chef',     email: 'bilal@rms.com',     requestedAt: '06 Jun 2026 · 11:34 AM', status: 'pending'  },
    { id: 'REQ-003', name: 'Cashier Hira', role: 'cashier',  email: 'hira@rms.com',      requestedAt: '05 Jun 2026 · 03:45 PM', status: 'resolved' }
];

// DB: website_feedback
// API: GET /api/admin/feedbacks/website
let mockWebsiteFeedback = [
    {
        name: 'Ahmed Khan',
        email: 'ahmed@example.com',
        rating: 5,
        comment: 'Very easy website to use.',
        date: '06 Jun 2026'
    },
    {
        name: 'Sara Ali',
        email: 'sara@example.com',
        rating: 4,
        comment: 'Menu looks great.',
        date: '05 Jun 2026'
    }
];

// DB: order_feedback
// API: GET /api/admin/feedbacks/orders
let mockOrderFeedback = [
    {
        customer: 'Ahmed Khan',
        orderId: 'ORD-101',
        dish: 'Classic Burger',
        rating: 5,
        comment: 'Excellent taste.',
        date: '06 Jun 2026'
    }
];

// ── END MOCK DATA ─────────────────────────────────────────────


// admin.js – Hardened session check

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/check', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data.authenticated || data.role !== 'admin') throw new Error();
        return true;
    } catch (err) {
        // Redirect immediately, don't keep the dashboard page in history
        window.location.replace('/login');
        return false;
    }
}

function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => window.location.replace('/login'))
        .catch(() => window.location.replace('/login'));
}

// Immediately hide the page (before DOMContentLoaded)
document.documentElement.style.visibility = 'hidden';

// Wait for DOM to be ready, then check auth
window.addEventListener('DOMContentLoaded', async () => {
    // Keep page hidden until auth check completes
    document.documentElement.style.visibility = 'hidden';

    const authenticated = await checkAuth();
    if (!authenticated) return;

    // Auth passed – show the page
    document.documentElement.style.visibility = '';

    // Load data for both sections
    if (typeof renderUsers === 'function') {
        renderUsers();
    }
    if (typeof renderEmployees === 'function') {
        renderEmployees();
    }

    console.log("Admin dashboard ready");
});


async function deleteUser(userId) {
    showConfirm(
        'Remove Customer',
        'Are you sure you want to permanently delete this customer? This action cannot be undone.',
        'danger',
        async () => {
            try {
                const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(await res.text());
                await renderUsers(document.getElementById('userSearchInput')?.value || '');
                showNotification('Customer removed successfully', 'notif-success');
            } catch (err) {
                showNotification(err.message || 'Failed to delete user', 'notif-error');
            }
        }
    );
}

async function deleteEmployee(userId) {
    showConfirm(
        'Remove Employee',
        'Are you sure you want to permanently delete this employee? This action cannot be undone.',
        'danger',
        async () => {
            try {
                const res = await fetch(`/api/admin/employees/${userId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(await res.text());
                await renderEmployees();
                showNotification('Employee removed successfully', 'notif-success');
            } catch (err) {
                showNotification(err.message || 'Failed to delete employee', 'notif-error');
            }
        }
    );
}

async function renderUsers(filter = '') {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        let users = await response.json();

        if (filter) {
            users = users.filter(u =>
                u.name.toLowerCase().includes(filter.toLowerCase()) ||
                u.email.toLowerCase().includes(filter.toLowerCase())
            );
        }

        const tbody = document.getElementById('usersTableBody');
        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No customers found.</td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td><code style="font-size:12px;color:#9e7a5a;">${escapeHtml(u.id)}</code></td>
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.phone)}</td>
                <td>${escapeHtml(u.joined)}</td>
                <td>${u.totalOrders}</td>
                <td><span class="badge badge-${u.status}">${u.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="td-actions">
                        <button class="danger-btn" onclick="deleteUser('${u.userId}')">Remove</button>
                        ${u.status === 'active'
            ? `<button class="danger-btn" onclick="toggleUserStatus('${u.userId}', 'inactive')">Deactivate</button>`
            : `<button class="success-btn" onclick="toggleUserStatus('${u.userId}', 'active')">Activate</button>`
        }
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
        showNotification('Failed to load users', 'notif-error');
    }
}

// Helper to escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function filterUsers(val) { renderUsers(val); }

async function toggleUserStatus(userId, newStatus) {
    const action = newStatus === 'inactive' ? 'deactivate' : 'activate';
    showConfirm(
        `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
        `Are you sure you want to ${action} this customer account?`,
        newStatus === 'inactive' ? 'danger' : 'normal',
        async () => {
            try {
                const response = await fetch(`/api/admin/users/${userId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus.toUpperCase() })
                });
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error);
                }
                // Reload the user list
                await renderUsers(document.getElementById('userSearchInput')?.value || '');
                showNotification(`Customer ${action}d successfully.`, newStatus === 'inactive' ? 'notif-warn' : 'notif-success');
            } catch (err) {
                console.error(err);
                showNotification(`Failed to ${action} user: ${err.message}`, 'notif-error');
            }
        }
    );
}




function showSection(name, btn) {
    document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + name);
    if (target) target.classList.add('active');

    if (name === 'users')     renderUsers();
    if (name === 'employees') renderEmployees();
    if (name === 'menu')      renderMenu();
    if (name === 'inventory') renderInventory();
    if (name === 'reports')   renderReports();
    if (name === 'settings')  renderSettings();
    if (name === 'feedbacks') renderFeedbacks();
}





// ============================================================
// MANAGE EMPLOYEES


async function renderEmployees() {
    try {
        const res = await fetch('/api/admin/employees');
        if (!res.ok) throw new Error();
        const employees = await res.json();
        const tbody = document.getElementById('employeesTableBody');
        if (!employees.length) {
            tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No employees hired yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = employees.map(e => `
            <tr>
                <td><code style="font-size:12px;color:#9e7a5a;">${escapeHtml(e.employeeId)}</code></td>
                <td><strong>${escapeHtml(e.name)}</strong></td>
                <td><span class="badge badge-${e.role}">${e.role.charAt(0).toUpperCase() + e.role.slice(1)}</span></td>
                <td>${escapeHtml(e.email)}</td>
                <td>${escapeHtml(e.phone)}</td>
                <td>${escapeHtml(e.shift)}</td>
                <td>${escapeHtml(e.joined)}</td>
                <td><span class="badge badge-${e.status}">${e.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="td-actions">
                        <button class="ghost-btn-sm" onclick="openEditEmployee('${e.userId}')">Edit</button>
                        <button class="danger-btn" onclick="deleteEmployee('${e.userId}')">Remove</button>
                        ${e.status === 'active'
            ? `<button class="danger-btn" onclick="toggleEmployeeStatus('${e.userId}', 'inactive')">Deactivate</button>`
            : `<button class="success-btn" onclick="toggleEmployeeStatus('${e.userId}', 'active')">Activate</button>`
        }
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
        showNotification('Failed to load employees', 'notif-error');
    }
}

async function openHireForm() {
    document.getElementById('hireFormWrapper').style.display = 'block';
    document.getElementById('hireFormWrapper').scrollIntoView({ behavior: 'smooth' });
    // Fetch current employees to check manager count
    try {
        const res = await fetch('/api/admin/employees');
        const employees = await res.json();
        const managerCount = employees.filter(e => e.role === 'manager' && e.status === 'active').length;
        const managerOpt = document.getElementById('hireeRole').querySelector('option[value="manager"]');
        if (managerCount >= 2) {
            managerOpt.disabled = true;
            managerOpt.textContent = 'Manager (limit reached — max 2)';
        } else {
            managerOpt.disabled = false;
            managerOpt.textContent = 'Manager';
        }
    } catch (err) {
        console.error('Failed to check manager limit');
    }
}

function closeHireForm() {
    document.getElementById('hireFormWrapper').style.display = 'none';
    ['hireeName','hireeEmail','hireePhone'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('hireeRole').value  = '';
    document.getElementById('hireeShift').value = '';
}

function isValidPhone(phone) {
    const cleaned = phone.replace(/[\s\-]/g, '');
    const phoneRegex = /^(03\d{9}|92\d{10})$/;  // supports 03... or 92...
    return phoneRegex.test(cleaned);
}

// Hire new employee

async function hireEmployee() {
    const name = document.getElementById('hireeName').value.trim();
    const email = document.getElementById('hireeEmail').value.trim();
    const phone = document.getElementById('hireePhone').value.trim();
    const role = document.getElementById('hireeRole').value;
    const shift = document.getElementById('hireeShift').value;

    if (!name || !email || !phone || !role || !shift) {
        showNotification('Please fill all fields.', 'notif-warn');
        return;
    }

    // Phone validation (same as customer)
    if (!isValidPhone(phone)) {
        showNotification('Invalid phone number (10 digits, starts with 03 or 92 format)', 'notif-warn');
        return;
    }

    try {
        const res = await fetch('/api/admin/employees/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, role, shift })
        });
        if (!res.ok) {
            const error = await res.text();
            throw new Error(error);
        }
        const data = await res.json();
        closeHireForm();
        await renderEmployees();
        showNotification(`${name} hired as ${role}.`, 'notif-success');
    } catch (err) {
        console.error(err);
        showNotification(err.message || 'Failed to hire employee', 'notif-error');
    }
}

// Toggle employee active/inactive
async function toggleEmployeeStatus(userId, newStatus) {
    const action = newStatus === 'inactive' ? 'deactivate' : 'activate';
    showConfirm(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Employee`,
        `Are you sure you want to ${action} this employee?`,
        newStatus === 'inactive' ? 'danger' : 'normal',
        async () => {
            try {
                const res = await fetch(`/api/admin/employees/${userId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus.toUpperCase() })
                });
                if (!res.ok) throw new Error(await res.text());
                await renderEmployees();
                showNotification(`Employee ${action}d.`, newStatus === 'inactive' ? 'notif-warn' : 'notif-success');
            } catch (err) {
                showNotification(`Failed to ${action} employee`, 'notif-error');
            }
        }
    );
}

// Edit employee — name, email, phone ONLY
async function openEditEmployee(userId) {
    try {
        const res = await fetch('/api/admin/employees');
        const employees = await res.json();
        const emp = employees.find(e => e.userId === userId);
        if (!emp) return;

        openZoom(`Edit Employee — ${emp.name}`, `
            <div class="zoom-info-grid" style="margin-bottom:16px;">
                <div class="zoom-info-row">
                    <span class="zoom-info-label">Employee ID</span>
                    <span class="zoom-info-val" style="font-size:13px;color:#9e7a5a;">${escapeHtml(emp.employeeId)}</span>
                </div>
                <div class="zoom-info-row">
                    <span class="zoom-info-label">Role</span>
                    <span class="zoom-info-val">${emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}</span>
                </div>
                <div class="zoom-info-row">
                    <span class="zoom-info-label">Shift</span>
                    <span class="zoom-info-val">${escapeHtml(emp.shift)} <span style="font-size:11px;color:#9e7a5a;">(set at hire — not editable)</span></span>
                </div>
                <div class="zoom-info-row">
                    <span class="zoom-info-label">Joined</span>
                    <span class="zoom-info-val">${escapeHtml(emp.joined)}</span>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-input" id="editEmpName" value="${escapeHtml(emp.name)}">
                </div>
                <div class="form-field">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="editEmpEmail" value="${escapeHtml(emp.email)}">
                </div>
                <div class="form-field form-field-full">
                    <label class="form-label">Phone</label>
                    <input type="text" class="form-input" id="editEmpPhone" value="${escapeHtml(emp.phone)}">
                </div>
            </div>
            <div class="form-actions">
                <button class="ghost-btn" onclick="closeZoom()">Cancel</button>
                <button class="primary-btn" onclick="saveEditEmployee('${emp.userId}')">Save Changes</button>
            </div>
        `);
    } catch (err) {
        showNotification('Failed to load employee details', 'notif-error');
    }
}

async function saveEditEmployee(userId) {
    const newName = document.getElementById('editEmpName').value.trim();
    const newEmail = document.getElementById('editEmpEmail').value.trim();
    const newPhone = document.getElementById('editEmpPhone').value.trim();

    if (!newName || !newEmail || !newPhone) {
        showNotification('Name, email, and phone cannot be empty', 'notif-warn');
        return;
    }

    try {
        const res = await fetch(`/api/admin/employees/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone })
        });
        if (!res.ok) throw new Error(await res.text());
        closeZoom();
        await renderEmployees();
        showNotification('Employee details updated.', 'notif-success');
    } catch (err) {
        showNotification('Failed to update employee', 'notif-error');
    }
}


// ============================================================
// MANAGE MENU – REAL API
// ============================================================

async function renderMenu() {
    try {
        const res = await fetch('/api/admin/menu');
        if (!res.ok) throw new Error('Failed to fetch menu');
        const dishes = await res.json();
        const grid = document.getElementById('menuGrid');
        if (!dishes.length) {
            grid.innerHTML = '<p style="color:#9e7a5a;font-size:14px;">No dishes added yet.</p>';
            return;
        }
        grid.innerHTML = dishes.map(dish => {
            const ingList = dish.ingredients.map(i => i.ingredientName).join(', ');
            const imageUrl = dish.imagePath ? encodeURI(dish.imagePath) : '';
            const imageHtml = imageUrl
                ? `<img src="${imageUrl}" alt="${dish.name}" style="width:100%; height:120px; object-fit:cover; border-radius:8px;">`
                : `<div class="dish-img-placeholder">🍽️</div>`;
            return `
                <div class="menu-dish-card ${dish.available ? '' : 'unavailable'}" id="dish-card-${dish.dishId}">
                    <div class="dish-img-wrapper">${imageHtml}</div>
                    <div class="dish-card-body">
                        <div class="dish-card-name">${escapeHtml(dish.name)}</div>
                        <div class="dish-card-cat">${escapeHtml(dish.category)}</div>
                        <div class="dish-card-desc">${escapeHtml(dish.description)}</div>
                        ${!dish.available ? '<span class="dish-unavail-tag">Not Available</span>' : ''}
                        <div class="dish-card-price">PKR ${dish.price}/-</div>
                        <div class="dish-ingredients-list">🧂 ${escapeHtml(ingList)}</div>
                        <div class="edit-price-row" id="editPriceRow-${dish.dishId}" style="display:none;">
                            <input type="number" class="edit-price-input" id="editPriceInput-${dish.dishId}" value="${dish.price}" min="0" step="1">
                            <button class="success-btn" onclick="savePrice('${dish.dishId}')">Save</button>
                            <button class="ghost-btn-sm" onclick="cancelEditPrice('${dish.dishId}')">✕</button>
                        </div>
                        <div class="dish-card-actions">
                            <button class="warn-btn" onclick="toggleEditPrice('${dish.dishId}')">Edit Price</button>
                        </div>
                        <div class="dish-danger-zone">
                            <div class="dish-danger-divider"></div>
                            <button class="danger-btn dish-remove-btn" onclick="removeDish('${dish.dishId}')">Remove Dish</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        showNotification('Failed to load menu', 'notif-error');
    }
}

// Helper to toggle edit price row
function toggleEditPrice(dishId) {
    document.getElementById(`editPriceRow-${dishId}`).style.display = 'flex';
}
function cancelEditPrice(dishId) {
    document.getElementById(`editPriceRow-${dishId}`).style.display = 'none';
}

async function savePrice(dishId) {
    const input = document.getElementById(`editPriceInput-${dishId}`);
    const newPrice = parseFloat(input.value);
    if (isNaN(newPrice) || newPrice <= 0) {
        showNotification('Enter a valid price.', 'notif-warn');
        return;
    }
    try {
        const res = await fetch(`/api/admin/menu/${dishId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: newPrice })
        });
        if (!res.ok) throw new Error(await res.text());
        await renderMenu();
        showNotification('Price updated.', 'notif-success');
    } catch (err) {
        showNotification(err.message, 'notif-error');
    }
}

async function removeDish(dishId) {
    // find dish name from current menu (optional)
    showConfirm('Remove Dish', 'Permanently remove this dish? This also removes its links to inventory.', 'danger', async () => {
        try {
            const res = await fetch(`/api/admin/menu/${dishId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
            await renderMenu();
            await renderInventory(); // refresh inventory because dish might have been linked
            showNotification('Dish removed from menu.', 'notif-warn');
        } catch (err) {
            showNotification(err.message, 'notif-error');
        }
    });
}

// Add Dish Form handling (real API)
async function addDish() {
    const name = document.getElementById('dishName').value.trim();
    const price = parseFloat(document.getElementById('dishPrice').value);
    const description = document.getElementById('dishDescription').value.trim();
    const category = document.getElementById('dishCategory').value;
    const imageFile = document.getElementById('dishImage').files[0];

    if (!name || isNaN(price) || !description) {
        showNotification('Please fill all dish fields.', 'notif-warn');
        return;
    }

    const rows = document.querySelectorAll('#ingredientRows .ingredient-row');
    const ingredients = [];
    for (const row of rows) {
        const inputs = row.querySelectorAll('input');
        const sel = row.querySelector('select');
        const ingName = inputs[0]?.value.trim();
        const minQty = parseFloat(inputs[1]?.value);
        const unit = sel?.value;
        if (!ingName || isNaN(minQty) || minQty <= 0) {
            showNotification('Please fill all ingredient fields correctly.', 'notif-warn');
            return;
        }
        ingredients.push({
            name: ingName,
            minQty: minQty,
            unit: unit
        });
    }

    if (ingredients.length === 0) {
        showNotification('Add at least one main ingredient.', 'notif-warn');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('description', description);
    formData.append('category', category);
    if (imageFile) {
        formData.append('image', imageFile);
    }
    formData.append('ingredients', JSON.stringify(ingredients));

    try {
        const response = await fetch('/api/admin/menu/add', {
            method: 'POST',
            body: formData  // Do NOT set Content-Type header
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        const data = await response.json();
        closeAddDishForm();
        await renderMenu();
        await renderInventory();
        showNotification(`${name} added. Restock ingredients to make it available.`, 'notif-success');
    } catch (err) {
        console.error('Add dish error:', err);
        showNotification('Failed to add dish: ' + err.message, 'notif-error');
    }
}

// Re‑implement openAddDishForm, closeAddDishForm, addIngredientRow as before (they are fine)
function openAddDishForm() {
    document.getElementById('addDishFormWrapper').style.display = 'block';
    document.getElementById('addDishFormWrapper').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('ingredientRows').innerHTML = '';
    addIngredientRow();
}
function closeAddDishForm() {
    document.getElementById('addDishFormWrapper').style.display = 'none';
    document.getElementById('dishName').value = '';
    document.getElementById('dishPrice').value = '';
    document.getElementById('dishDescription').value = '';
    document.getElementById('dishCategory').value = 'menu';
    document.getElementById('ingredientRows').innerHTML = '';
}
function addIngredientRow() {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <input type="text"   placeholder="Main ingredient (e.g. Chicken)">
        <input type="number" placeholder="Min stock" min="0" step="1">
        <select>
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="pcs">pcs</option>
            <option value="g">g</option>
        </select>
        <button class="remove-ingredient-btn" onclick="this.parentElement.remove()">✕</button>
    `;
    document.getElementById('ingredientRows').appendChild(row);
}


// ============================================================
// MANAGE INVENTORY
async function renderInventory() {
    console.log("renderInventory called"); // add this line
    try {
        const response = await fetch('/api/admin/inventory');
        if (!response.ok) throw new Error('Failed to fetch inventory');
        const items = await response.json();
        const tbody = document.getElementById('inventoryTableBody');
        if (!items.length) {
            tbody.innerHTML = `</td><td colspan="7" class="table-empty">No inventory records. Add dishes to create inventory.</td></td>`;
            return;
        }
        // Sort: critical first, then low, then ok
        items.sort((a, b) => {
            const rank = i => {
                const stock = i.currentStock;
                const min = i.minimumThreshold;
                if (stock <= min * 0.5) return 0;
                if (stock <= min) return 1;
                return 2;
            };
            return rank(a) - rank(b);
        });
        tbody.innerHTML = items.map(item => {
            const stock = item.currentStock;
            const min = item.minimumThreshold;
            const isCritical = stock <= min * 0.5;
            const isLow = stock <= min && !isCritical;
            const statusCls = isCritical ? 'inv-critical' : isLow ? 'inv-low' : 'inv-ok';
            const statusTxt = isCritical ? 'Critical' : isLow ? 'Low' : 'OK';
            const lastRestocked = item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : '—';
            return `
                <tr>
                    <td><strong>${escapeHtml(item.ingredientName)}</strong></td>
                    <td><strong>${stock}</strong></td>
                    <td>${min}</td>
                    <td>${escapeHtml(item.unit)}</td>
                    <td><span class="inv-status ${statusCls}">${statusTxt}</span></td>
                    <td style="font-size:12px;color:#9e7a5a;">${lastRestocked}</td>
                    <td>
                        <div class="restock-row">
                            <input type="number" class="restock-input" id="restock-${item.ingredientId}" placeholder="Add qty" min="0" step="1">
                            <button class="success-btn" onclick="restockIngredient('${item.ingredientId}')">Restock</button>
                            <button class="danger-btn" onclick="deleteIngredient('${item.ingredientId}')" style="margin-left:8px;">Remove</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        showNotification('Failed to load inventory', 'notif-error');
    }
}

async function restockIngredient(ingredientId) {
    const input = document.getElementById(`restock-${ingredientId}`);
    const rawValue = input?.value;
    console.log("Raw input value:", rawValue);
    let addQty = parseFloat(input?.value);
    console.log("Parsed addQty:", addQty);       // <-- add this


    // If input is empty or invalid, show error
    if (isNaN(addQty) || addQty <= 0) {
        showNotification('Please enter a valid positive number (e.g., 0.5, 2, 10)', 'notif-warn');
        input.value = ''; // clear the input
        return;
    }

    // Round to 2 decimal places to avoid floating point issues
    addQty = Math.round(addQty * 100) / 100;

    try {
        const res = await fetch(`/api/admin/inventory/${ingredientId}/restock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addQty })
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText);
        }
        const data = await res.json();
        // Clear the input field
        input.value = '';
        // Refresh the inventory table
        await renderInventory();
        showNotification(`Stock updated to ${data.newStock}.`, 'notif-success');
    } catch (err) {
        console.error(err);
        showNotification(err.message || 'Failed to restock', 'notif-error');
    }

}

async function deleteIngredient(ingredientId) {
    showConfirm('Remove Ingredient', 'Are you sure you want to permanently delete this ingredient? It cannot be used in any dish.', 'danger', async () => {
        try {
            const res = await fetch(`/api/admin/inventory/${ingredientId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
            await renderInventory();
            showNotification('Ingredient removed.', 'notif-success');
        } catch (err) {
            showNotification(err.message, 'notif-error');
        }
    });
}


// ============================================================
// REPORTS (from Manager)
// DB:  Table: manager_reports
// API: GET /api/admin/reports
//      GET /api/admin/reports/{id}
//
// DUPLICATE PERIOD RULE:
//   If 2 managers submit reports for the same period:
//   → Grouped as ONE row, both manager names shown as tags
//   → Neither report is ignored — both acknowledged
//   DB:  SELECT period_label, GROUP_CONCAT(u.name) as managers,
//              MAX(sent_at), report_data
//        FROM manager_reports mr JOIN users u ON mr.manager_id=u.user_id
//        GROUP BY period_label ORDER BY MAX(sent_at) DESC
// ============================================================

function renderReports() {
    // TODO: const reports = await fetch('/api/admin/reports').then(r => r.json());
    const tbody = document.getElementById('reportsTableBody');

    if (mockReports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No reports received yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = mockReports.map(r => `
        <tr>
            <td><strong>${r.period}</strong></td>
            <td>
                <div class="report-managers-cell">
                    ${r.managers.map(m => `<span class="manager-name-tag">${m}</span>`).join('')}
                </div>
            </td>
            <td style="font-size:12px;color:#9e7a5a;">${r.dateSent}</td>
            <td>PKR ${r.data.revenue.toLocaleString()}</td>
            <td>${r.data.orders}</td>
            <td>${r.data.avgRating} ★</td>
            <td>
                <div class="td-actions">
                    <button class="ghost-btn-sm" onclick="viewReport('${r.id}')">View Detail</button>
                    <button class="success-btn" onclick="downloadReport('${r.id}')">Download PDF</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewReport(reportId) {
    const report = mockReports.find(r => r.id === reportId);
    if (!report) return;
    const managersStr = report.managers.join(' & ');
    openZoom(`${report.period} — ${managersStr}`, `
        <p style="font-size:13px;color:#9e7a5a;margin-bottom:16px;">
            Submitted: ${report.dateSent} · By: ${managersStr}
        </p>
        <div class="zoom-report-block">
            <p class="zoom-section-title" style="margin-bottom:8px;">Summary</p>
            <div class="zoom-report-row"><span>Total Revenue</span><strong>PKR ${report.data.revenue.toLocaleString()}</strong></div>
            <div class="zoom-report-row"><span>Total Orders</span><strong>${report.data.orders}</strong></div>
            <div class="zoom-report-row"><span>Avg Customer Rating</span><strong>${report.data.avgRating} ★</strong></div>
            <div class="zoom-report-row"><span>Critical Inventory Items</span><strong>${report.data.criticalItems}</strong></div>
            <div class="zoom-report-row"><span>Cashier Avg Response Time</span><strong>${report.data.cashierAvgTime}</strong></div>
            <div class="zoom-report-row"><span>Chef Orders Completed</span><strong>${report.data.chefOrders}</strong></div>
        </div>
        <button class="primary-btn" style="width:100%;margin-top:8px;" onclick="downloadReport('${reportId}')">
            Download as PDF
        </button>
    `);
}

// API: GET /api/admin/reports/{id}/download-pdf
// TODO: Backend generates PDF (JasperReports or iText) from report_data JSON
function downloadReport(reportId) {
    // TODO: window.open(`/api/admin/reports/${reportId}/download-pdf`);
    console.log('TODO: Download PDF —', reportId);
    showNotification('PDF download will be available when backend is connected.', 'notif-info');
}


// ============================================================
// MANAGE FEEDBACKS
// API: GET /api/admin/feedbacks
// ============================================================
async function renderFeedbacks() {
    try {
        const res = await fetch('/api/admin/feedbacks');
        if (!res.ok) throw new Error('Failed to fetch feedbacks');
        const data = await res.json();
        const websiteFeedbacks = data.website || [];
        const orderFeedbacks = data.order || [];  // placeholder

        const websiteBody = document.getElementById('websiteFeedbackTableBody');
        if (websiteBody) {
            if (websiteFeedbacks.length === 0) {
                websiteBody.innerHTML = `<tr><td colspan="5">No website feedback yet.</td></tr>`;
            } else {
                websiteBody.innerHTML = websiteFeedbacks.map(fb => `
                    <tr>
                        <td>${escapeHtml(fb.name)}</td>
                        <td>${escapeHtml(fb.email)}</td>
                        <td>${fb.rating} ★</td>
                        <td>${escapeHtml(fb.feedbackText)}</td>
                        <td>${fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : '—'}</td>
                        <td><button class="danger-btn" onclick="deleteFeedback('${fb.feedbackId}')">Delete</button></td>
                    </tr>
                `).join('');
            }
        }

        const orderBody = document.getElementById('orderFeedbackTableBody');
        if (orderBody) {
            // No order feedback yet
            orderBody.innerHTML = `<tr><td colspan="6">Order feedback will appear here once implemented.</td></tr>`;
        }
    } catch (err) {
        console.error(err);
        const websiteBody = document.getElementById('websiteFeedbackTableBody');
        if (websiteBody) websiteBody.innerHTML = `<tr><td colspan="5">Failed to load feedbacks.</td></tr>`;
    }
}

async function deleteFeedback(feedbackId) {
    showConfirm('Delete Feedback', 'Are you sure you want to permanently delete this feedback?', 'danger', async () => {
        try {
            const res = await fetch(`/api/admin/feedbacks/${feedbackId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
            await renderFeedbacks();
            showNotification('Feedback deleted.', 'notif-success');
        } catch (err) {
            showNotification(err.message, 'notif-error');
        }
    });
}


// ============================================================
// SETTINGS
// Includes: Tax + Password Reset Requests + Deactivation Requests
// ============================================================

function renderSettings() {
    // TAX: Load from DB on open
    // API: GET /api/settings/tax
    // DB:  SELECT value FROM settings WHERE key='tax_amount'
    document.getElementById('taxInput').value = currentTax;
    const footerInput = document.getElementById('footerContactInput');
    if (footerInput) {
        footerInput.value = footerContact;
    }


    renderResetRequests();
}

// Save tax amount
// API: PUT /api/admin/settings/tax
//      Body: { taxAmount }
// DB:  UPDATE settings SET value=?, updated_at=NOW() WHERE key='tax_amount'
// REALTIME: Push to cashier + customer dashboards immediately
//   WebSocket event: { type: 'tax_updated', taxAmount: N }
//   cashier.js: update local TAX constant → affects generateBill() receipt totals
//   customer.js: update cart tax calculation → updateCartUI() recalculates totals
function saveTax() {
    const newTax = parseInt(document.getElementById('taxInput').value);
    if (isNaN(newTax) || newTax < 0) { showNotification('Enter a valid tax amount.', 'notif-warn'); return; }
    currentTax = newTax;
    showNotification(`Tax updated to PKR ${newTax}. Cashier and customer dashboards will update.`, 'notif-success');
    // TODO: await fetch('/api/admin/settings/tax', { method:'PUT', body: JSON.stringify({ taxAmount: newTax }) });
    // Backend then pushes WebSocket event to all connected cashier + customer sessions
}

function saveFooterContact() {

    const newContact =
        document.getElementById('footerContactInput').value.trim();

    if (!newContact) {
        showNotification(
            'Please enter a contact number.',
            'notif-warn'
        );
        return;
    }

    footerContact = newContact;

    showNotification(
        'Footer contact number updated.',
        'notif-success'
    );

    // TODO:
    // PUT /api/admin/settings/footer-contact
    // Body: { contactNumber: newContact }

    // TODO:
    // Website footer should fetch this value
    // GET /api/settings/footer-contact
}

// ============================================================
// PASSWORD RESET REQUESTS
// DB:  Table: password_reset_requests
// API: GET /api/admin/reset-requests
//      PUT /api/admin/reset-password/{userId}
//
// WHERE "Request Password Reset" BUTTONS LIVE IN OTHER FILES:
//   login page (login.html):
//     → "Forgot Password?" link below login form
//     → onclick: POST /api/auth/request-password-reset { email }
//
//   customer.html (section-profile):
//     → Button below Save Changes button in .card-panel#profileCard
//     → Label: "Forgot Password? Request Reset"
//     → onclick: POST /api/auth/request-password-reset { userId, email }
//
//   cashier.html (profileCardModal):
//     → Button inside .profile-btn-row, below Logout button
//     → Label: "Request Password Reset"
//     → onclick: POST /api/auth/request-password-reset { userId, email }
//
//   chef.html (profileCardModal):
//     → Button inside .profile-btn-row, below Logout button
//     → Same API call as above
//
//   manager.html (profileCardModal):
//     → Button inside .profile-btn-row, below Logout button
//     → Same API call as above
//
// ALL SEND: POST /api/auth/request-password-reset
//           Body: { userId, email }
//           → INSERT INTO password_reset_requests (request_id=UUID, user_id,
//             role, email, requested_at=NOW(), status='pending')
//           → INSERT INTO notifications (user_id=adminId, type='password_reset_request',
//             message='Password reset request from {name}')
//           → Email sent to admin: "New password reset request"
//           Admin badge in sidebar updates automatically
// ============================================================

function renderResetRequests() {
    // TODO: const requests = await fetch('/api/admin/reset-requests').then(r => r.json());
    const pending = mockResetRequests.filter(r => r.status === 'pending').length;

    const badge = document.getElementById('resetBadge');
    badge.textContent  = pending;
    badge.style.display = pending > 0 ? 'flex' : 'none';

    document.getElementById('resetCountBadge').textContent =
        pending > 0 ? `${pending} pending` : 'None pending';

    const tbody = document.getElementById('resetTableBody');
    if (mockResetRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No password reset requests.</td></tr>`;
        return;
    }

    tbody.innerHTML = mockResetRequests.map(r => `
        <tr>
            <td><strong>${r.name}</strong></td>
            <td><span class="badge badge-${r.role}">${r.role.charAt(0).toUpperCase() + r.role.slice(1)}</span></td>
            <td>${r.email}</td>
            <td style="font-size:12px;color:#9e7a5a;">${r.requestedAt}</td>
            <td><span class="badge badge-${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
            <td>
                ${r.status === 'pending'
        ? `<button class="primary-btn" style="height:32px;font-size:12px;"
                           onclick="resetPassword('${r.id}')">Reset Password</button>`
        : `<span style="font-size:12px;color:#9e7a5a;">Done</span>`
    }
            </td>
        </tr>
    `).join('');
}

// Reset password for user/employee
// API: PUT /api/admin/reset-password/{userId}
// DB:  UPDATE users SET password=BCrypt(generated) WHERE user_id=?
//      UPDATE password_reset_requests SET status='resolved', resolved_at=NOW()
//      WHERE request_id=?
// AFTER: Send new 8-char alphanumeric password to user/employee email
//        Never stored as plain text — only BCrypt hash in DB
function resetPassword(requestId) {
    const req = mockResetRequests.find(r => r.id === requestId);
    if (!req) return;
    showConfirm(
        'Reset Password',
        `Generate a new password for ${req.name} and send it to ${req.email}?`,
        'normal',
        () => {
            req.status = 'resolved';
            renderResetRequests();
            showNotification(`New password generated and sent to ${req.email}.`, 'notif-success');
            // TODO: await fetch(`/api/admin/reset-password/${req.userId}`, { method: 'PUT' });
        }
    );
}



// ============================================================
// CONFIRM MODAL (shared)
// ============================================================

let confirmCallback = null;

function showConfirm(title, msg, type = 'normal', onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent   = msg;
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.className   = 'confirm-ok-btn' + (type === 'danger' ? ' danger' : '');
    okBtn.textContent = type === 'danger' ? 'Yes, Confirm' : 'Confirm';
    confirmCallback   = onConfirm;
    document.getElementById('confirmOverlay').classList.add('active');
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirm() {
    document.getElementById('confirmOverlay').classList.remove('active');
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

document.getElementById('confirmOkBtn').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
});


// ============================================================
// ZOOM CARD (shared)
// ============================================================

function openZoom(title, bodyHtml) {
    document.getElementById('zoomCardTitle').textContent = title;
    document.getElementById('zoomCardBody').innerHTML    = bodyHtml;
    document.getElementById('zoomOverlay').classList.add('active');
    document.getElementById('zoomCard').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeZoom() {
    document.getElementById('zoomOverlay').classList.remove('active');
    document.getElementById('zoomCard').classList.remove('active');
    document.body.style.overflow = '';
}


// ============================================================
// NOTIFICATION SYSTEM
// ============================================================

let notifQueue  = [];
let notifActive = false;

function showNotification(message, type = 'notif-info') {
    notifQueue.push({ message, type });
    if (!notifActive) processNotifQueue();
}

function processNotifQueue() {
    if (notifQueue.length === 0) { notifActive = false; return; }
    notifActive = true;
    const { message, type } = notifQueue.shift();
    const bar = document.getElementById('notifBar');
    document.getElementById('notifMessage').textContent = message;
    bar.className = 'notif-bar ' + type + ' show';
    setTimeout(() => closeNotification(), 5000);
}

function closeNotification() {
    document.getElementById('notifBar').classList.remove('show');
    setTimeout(() => processNotifQueue(), 400);
}



// ============================================================
// PAGE INIT
// ============================================================

window.addEventListener('DOMContentLoaded', async function () {
    // Hide dashboard until auth confirmed
    document.body.style.opacity = '0';
    document.body.style.pointerEvents = 'none';

    const isAuth = await checkAuth();
    if (!isAuth) return;

    // Show dashboard
    document.body.style.opacity = '';
    document.body.style.pointerEvents = '';

    // Load data for all sections (so tables are ready when user switches tabs)
    renderUsers();
    renderEmployees();
    renderInventory();   // <-- add this line
    renderFeedbacks();


    console.log("Admin dashboard ready");
});

    // REALTIME: Poll for new reset/deactivation requests every 30s
    // TODO: setInterval(refreshRequestBadges, 30000);

    // REALTIME: WebSocket for new manager reports + account events
    // TODO: const ws = new WebSocket('ws://localhost:8080/ws/admin');
    // ws.onmessage = (e) => {
    //     const data = JSON.parse(e.data);
    //     if (data.type === 'new_report')          renderReports();
    //     if (data.type === 'reset_request')        renderResetRequests();
    // };

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeZoom(); closeConfirm(); }
});