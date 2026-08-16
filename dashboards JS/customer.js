// ============================================================
// customer.js — Customer Dashboard
// ============================================================
// SEARCH TAGS:
//   DB:   → SQL Server table/query needed
//   API:  → Spring Boot REST endpoint needed
//   AUTH: → Session/login check needed
// ============================================================


// ============================================================
// STATE
// ============================================================

let cart       = [];
let currentDish = null;
let quantity   = 0;
const TAX      = 50;


// ============================================================
// Simulated orders list (TEMPORARY)
// DB:  Table: orders (order_id, customer_id, total, status, created_at)
//      Table: order_items (item_id, order_id, dish_name, qty, price)
// API: GET /api/orders/customer/{userId} → fetch real orders on section open
// STATUS VALUES: 'pending' | 'preparing' | 'ready' | 'paid'
// ============================================================
let orders = [];


// AUTH CHECK for Customer Dashboard
// ============================================================
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/check', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data.authenticated || data.role !== 'customer') throw new Error();
        return true;
    } catch (err) {
        window.location.replace('/login');
        return false;
    }
}


// ============================================================
// SECTION SWITCHING
// Hides all sections, shows the requested one with animation
// ============================================================

function showSection(sectionName) {
    document.querySelectorAll('.dash-section').forEach(s => {
        s.classList.remove('active-section');
    });

    const target = document.getElementById('section-' + sectionName);
    if (target) {
        target.classList.add('active-section');
    }

    // Load section-specific data
    if (sectionName === 'profile')  loadProfile();
    if (sectionName === 'myorders') loadOrders();
    if (sectionName === 'feedback') prefillFeedback();
}


// ============================================================
// MENU SIDEBAR
// ============================================================

function openMenuSidebar() {
    document.getElementById('menuSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMenuSidebar() {
    document.getElementById('menuSidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
    document.body.style.overflow = '';
}


// ============================================================
// CART SIDEBAR
// ============================================================

function openCartSidebar() {
    closeMenuSidebar();
    renderCart();
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
    document.body.style.overflow = '';
}


// ============================================================
// DISH CARD MODAL
// ============================================================

function openDishCard(imgSrc, name, price, description) {
    quantity = 0;
    document.getElementById('counterValue').textContent = 0;
    document.getElementById('modalImage').src  = imgSrc;
    document.getElementById('modalImage').alt  = name;
    document.getElementById('modalName').textContent  = name;
    document.getElementById('modalPrice').textContent = price;
    document.getElementById('modalDesc').textContent  = description;
    currentDish = { imgSrc, name, price, description };
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('modalCard').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDishCard() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modalCard').classList.remove('active');
    document.body.style.overflow = '';
}

function changeQty(amount) {
    quantity = Math.max(0, quantity + amount);
    document.getElementById('counterValue').textContent = quantity;
}


// ============================================================
// CART — ADD ITEM
// DB:  INSERT/UPDATE carts table when backend connected
// API: POST /api/cart/add
//      Body: { userId, dishName, price, qty, description }
// ============================================================

function addToCart() {
    if (!currentDish || quantity === 0) {
        alert('Please select at least 1 item.');
        return;
    }
    const existing = cart.find(i => i.name === currentDish.name);
    if (existing) {
        existing.qty += quantity;
    } else {
        cart.push({ ...currentDish, qty: quantity, selected: true });
    }
    updateCartCount();
    closeDishCard();
    showCartFeedback();
}


// ============================================================
// CART — REMOVE ITEM
// DB:  DELETE FROM carts WHERE user_id=? AND dish_name=?
// API: DELETE /api/cart/remove
//      Body: { userId, dishName }
// ============================================================

function removeFromCart(dishName) {
    cart = cart.filter(i => i.name !== dishName);
    updateCartCount();
    renderCart();
}


// ============================================================
// CART — TOGGLE SELECTION (checkbox)
// Only affects price calculation, item stays in cart
// ============================================================

function toggleCartItem(dishName, checked) {
    const item = cart.find(i => i.name === dishName);
    if (item) item.selected = checked;
    recalculateCart();
}


// ============================================================
// CART — RENDER
// ============================================================

function renderCart() {
    const list = document.getElementById('cartItemsList');
    list.innerHTML = '';

    if (cart.length === 0) {
        list.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
        document.getElementById('cartTax').textContent   = '0/-';
        document.getElementById('cartTotal').textContent = '0/-';
        return;
    }

    cart.forEach(item => {
        const priceNum  = parseInt(item.price.replace(/[^0-9]/g, ''));
        const itemTotal = priceNum * item.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <input type="checkbox" class="cart-item-check"
                data-price="${itemTotal}" data-name="${item.name}"
                ${item.selected ? 'checked' : ''}
                onchange="toggleCartItem('${item.name}', this.checked)">
            <div class="cart-item-info">
                <div class="cart-item-title-row">
                    <span class="cart-item-name">${item.name} x${item.qty}</span>
                    <span class="cart-item-price">PKR ${itemTotal}/-</span>
                </div>
                <p class="cart-item-desc">${item.description}</p>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.name}')">✕</button>
        `;
        list.appendChild(div);
    });
    recalculateCart();
}

function recalculateCart() {
    let subtotal = 0;
    document.querySelectorAll('.cart-item-check').forEach(cb => {
        if (cb.checked) subtotal += parseInt(cb.dataset.price);
    });
    document.getElementById('cartTax').textContent   = subtotal > 0 ? TAX + '/-' : '0/-';
    document.getElementById('cartTotal').textContent = subtotal > 0 ? (subtotal + TAX) + '/-' : '0/-';
}

function updateCartCount() {
    const total = cart.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById('cartCount').textContent = total;
}

function showCartFeedback() {
    const btn = document.querySelector('.cart-btn');
    btn.style.transform = 'scale(1.25)';
    setTimeout(() => { btn.style.transform = ''; }, 300);
}


// ============================================================
// PLACE ORDER
// API: POST /api/orders/place
//      Body: { userId, items: [selected], tax: TAX, total }
//      Response: { orderId, status: 'pending', createdAt }
// DB:  INSERT INTO orders (customer_id, total, status, created_at)
//      INSERT INTO order_items (order_id, dish_name, qty, price) for each item
// AFTER:
//   → Add order to local orders array (shown in My Orders)
//   → Notify chef dashboard (future: WebSocket or polling)
//   → Clear selected items from cart
//   → Keep unselected items in cart
// ============================================================

function placeOrder() {
    const selectedItems = cart.filter(i => i.selected);
    if (selectedItems.length === 0) {
        alert('Please select at least one item to order.');
        return;
    }

    // TEMPORARY: Create local order object
    // API: Replace with real POST /api/orders/place
    const newOrder = {
        orderId:   'ORD-' + Date.now(),
        items:     selectedItems,
        total:     selectedItems.reduce((s, i) => s + parseInt(i.price.replace(/[^0-9]/g,'')) * i.qty, 0) + TAX,
        status:    'pending',
        createdAt: new Date().toLocaleString()
    };

    orders.unshift(newOrder); // Add to top of orders list

    // Remove only ordered (selected) items from cart
    cart = cart.filter(i => !i.selected);
    updateCartCount();
    closeCartSidebar();

    showNotification('Your order has been placed! Waiting for chef to confirm.', 'notif-order');
    alert('Order placed successfully!');
}


// ============================================================
// CANCEL ORDER
// Only allowed when status is 'pending'
// API: DELETE /api/orders/cancel/{orderId}
// DB:  DELETE FROM orders WHERE order_id=? AND status='pending'
//      DELETE FROM order_items WHERE order_id=?
// AFTER: Remove from local orders array and re-render
// ============================================================

function cancelOrder(orderId) {
    if (!confirm('Cancel this order?')) return;

    // API: DELETE /api/orders/cancel/{orderId}
    orders = orders.filter(o => o.orderId !== orderId);
    loadOrders(); // Re-render orders list
}


// ============================================================
// UPDATE ORDER STATUS (called when chef updates status)
// This simulates receiving a status update from backend
// API: Polling → GET /api/orders/customer/{userId}/status
//      OR WebSocket → subscribe to order status channel
// DB:  SELECT status FROM orders WHERE order_id=?
// HOW: On status change → show notification to customer
// ============================================================

function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;
    order.status = newStatus;

    // Show notification based on new status
    if (newStatus === 'preparing') {
        showNotification('Your order is now being prepared by the chef! 🍳', 'notif-order');
    } else if (newStatus === 'ready') {
        showNotification('Your order is ready! Proceeding to payment... 🎉', 'notif-order');
        // API: Notify cashier dashboard that order is ready for payment
        // POST /api/orders/ready → { orderId } → cashier sees it
    } else if (newStatus === 'paid') {
        showNotification('Payment confirmed! Thank you for dining with us. 🙏', 'notif-order');
    }

    if (document.getElementById('section-myorders').classList.contains('active-section')) {
        loadOrders();
    }
}


// ============================================================
// LOAD ORDERS (renders My Orders section)
// API: GET /api/orders/customer/{userId}
//      Response: [{ orderId, items[], total, status, createdAt }]
// DB:  SELECT o.*, oi.* FROM orders o
//      JOIN order_items oi ON o.order_id = oi.order_id
//      WHERE o.customer_id = ? ORDER BY o.created_at DESC
// ============================================================

function loadOrders() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-state-msg">No orders yet.</p>';
        return;
    }

    orders.forEach(order => {
        const isPaid      = order.status === 'paid';
        const isPending   = order.status === 'pending';

        const itemsText = order.items.map(i => `${i.name} x${i.qty}`).join(', ');

        const div = document.createElement('div');
        div.className = 'order-card' + (isPaid ? ' paid' : '');
        div.innerHTML = `
            <div class="order-card-header">
                <span class="order-id">${order.orderId}</span>
                <span class="order-date">${order.createdAt}</span>
            </div>
            <div class="order-items-list">${itemsText}</div>
            <div class="order-footer">
                <span class="order-total">PKR ${order.total}/-</span>
                <span class="status-badge status-${order.status}">${order.status}</span>
                ${isPending ? `<button class="order-cancel-btn" onclick="cancelOrder('${order.orderId}')">Cancel</button>` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}


// ============================================================
// PROFILE — LOAD
// ============================================================
// PROFILE — LOAD (Real API)
// ============================================================
async function loadProfile() {
    try {
        const response = await fetch('/api/customer/profile');
        if (!response.ok) throw new Error('Failed to load profile');
        const data = await response.json();

        document.getElementById('profileName').value = data.name || '';
        document.getElementById('profileEmail').value = data.email || '';
        document.getElementById('profilePhone').value = data.phone || '';
        document.getElementById('profileDOB').value = data.dob || '';
        document.getElementById('profileRole').textContent = data.role || 'Customer';
        document.getElementById('profileStatus').textContent = data.status || 'Active';
        document.getElementById('profileMemberSince').textContent = data.createdAt || '--';
        document.getElementById('profileTotalOrders').textContent = data.totalOrders || 0;

        if (data.dob) {
            const age = calculateAge(data.dob);
            document.getElementById('profileAge').textContent = age + ' years';
            checkBirthday(data.dob);
        } else {
            document.getElementById('profileAge').textContent = '--';
        }
    } catch (err) {
        console.error(err);
        alert('Failed to load profile. Please refresh the page.');
    }
}


// ============================================================
// PROFILE — SAVE
// ============================================================
// PROFILE — SAVE (Real API)
// ============================================================
async function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();
    const dob = document.getElementById('profileDOB').value;

    if (!name || !email) {
        alert('Name and email are required.');
        return;
    }

    try {
        const response = await fetch('/api/customer/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, dob })
        });
        if (!response.ok) throw new Error(await response.text());
        const result = await response.json();
        alert(result.message);
        // Reload profile to show updated data
        await loadProfile();
    } catch (err) {
        console.error(err);
        alert('Failed to save profile: ' + err.message);
    }
}



// AGE CALCULATOR & BIRTHDAY CHECK
// ============================================================
function calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

// ============================================================
// BIRTHDAY CHECK
// Called on page load — checks if today or within 7 days is birthday
// DB:  SELECT date_of_birth FROM users WHERE user_id=?
// API: This check runs client-side using DOB from profile load
// ============================================================

function checkBirthday(dob) {
    if (!dob) return;

    const today     = new Date();
    const birth     = new Date(dob);
    const thisYear  = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    const diffTime  = thisYear - today;
    const diffDays  = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // TODAY is birthday
        showNotification('🎂 Happy Birthday! Wishing you a wonderful day!', 'notif-birthday');
        launchBalloons();
    } else if (diffDays > 0 && diffDays <= 7) {
        // Within 7 days — pre-birthday
        showNotification(`🎉 Your birthday is in ${diffDays} day${diffDays > 1 ? 's' : ''}! Get ready to celebrate!`, 'notif-birthday');
    }
}


// ============================================================
// BALLOON ANIMATION (birthday)
// ============================================================

function launchBalloons() {
    const container = document.getElementById('balloonContainer');

    const balloonColors = [
        '#ff7c00', '#ff0000', '#0061ff',
        '#00ff3d', '#ff00d3', '#ffc000', '#ff7900'
    ];
    const ribbonColors = [
        '#ff8300', '#ff0000', '#ff6b00',
        '#0061ff', '#00ff3d', '#ffbe00', '#ff00d3'
    ];

    for (let i = 0; i < 32; i++) {
        setTimeout(() => {
            const isRibbon = i % 3 === 0; // every 3rd is a ribbon, rest balloons
            const duration = (5 + Math.random() * 4).toFixed(1) + 's';
            const left     = (Math.random() * 98).toFixed(1) + 'vw';

            if (isRibbon) {
                // CSS ribbon strip
                const wrap = document.createElement('div');
                wrap.className = 'ribbon';
                wrap.style.left              = left;
                wrap.style.animationDuration = duration;

                const strip = document.createElement('div');
                strip.className  = 'ribbon-strip';
                const rColor     = ribbonColors[Math.floor(Math.random() * ribbonColors.length)];
                const rWidth     = (5 + Math.random() * 6).toFixed(0) + 'px';
                const rHeight    = (22 + Math.random() * 24).toFixed(0) + 'px';
                strip.style.width      = rWidth;
                strip.style.height     = rHeight;
                strip.style.background = rColor;
                strip.style.borderRadius = '3px';

                wrap.appendChild(strip);
                container.appendChild(wrap);
                setTimeout(() => wrap.remove(), 9000);

            } else {
                // CSS 2D balloon
                const wrap = document.createElement('div');
                wrap.className = 'balloon';
                wrap.style.left              = left;
                wrap.style.animationDuration = duration;

                const body = document.createElement('div');
                body.className = 'balloon-body';
                const bColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];
                const bSize  = (38 + Math.random() * 16).toFixed(0);
                body.style.background = bColor;
                body.style.width      = bSize + 'px';
                body.style.height     = (parseInt(bSize) * 1.22).toFixed(0) + 'px';

                const string = document.createElement('div');
                string.className = 'balloon-string';
                const sHeight = (30 + Math.random() * 25).toFixed(0) + 'px';
                string.style.height = sHeight;

                wrap.appendChild(body);
                wrap.appendChild(string);
                container.appendChild(wrap);
                setTimeout(() => wrap.remove(), 9000);
            }

        }, i * 120);
    }
}


// ============================================================
// NOTIFICATION SYSTEM (one at a time, slides from top)
// DB:  Table: notifications (notif_id, user_id, message, type, is_read, created_at)
// API: GET /api/notifications/unread → fetch on page load
//      PUT /api/notifications/read/{notifId} → mark read on close
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

    bar.className = 'notif-bar ' + type;
    bar.classList.add('show');

    // Auto dismiss after 5 seconds
    setTimeout(() => closeNotification(), 5000);
}

function closeNotification() {
    const bar = document.getElementById('notifBar');
    bar.classList.remove('show');
    setTimeout(() => processNotifQueue(), 400);
}


// ============================================================
// FEEDBACK — PRE-FILL from profile
// ============================================================

function prefillFeedback() {
    document.getElementById('fbName').value  = currentUser.name  || '';
    document.getElementById('fbEmail').value = currentUser.email || '';
}


// ============================================================
// FEEDBACK STAR RATING
// ============================================================

let fbRating = 0;

document.querySelectorAll('.fb-star').forEach(star => {
    star.addEventListener('mouseover', function () {
        const val = parseInt(this.dataset.value);
        document.querySelectorAll('.fb-star').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.value) <= val);
        });
    });
    star.addEventListener('mouseleave', function () {
        document.querySelectorAll('.fb-star').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.value) <= fbRating);
        });
    });
    star.addEventListener('click', function () {
        fbRating = parseInt(this.dataset.value);
        document.querySelectorAll('.fb-star').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.value) <= fbRating);
        });
    });
});


// ============================================================
// FEEDBACK SUBMIT
// API: POST /api/feedback/submit
//      Body: { userId, name, email, message, rating }
// DB:  INSERT INTO feedback (user_id, name, email, message, rating, created_at)
// ============================================================

function submitFeedback() {
    const name    = document.getElementById('fbName').value.trim();
    const email   = document.getElementById('fbEmail').value.trim();
    const message = document.getElementById('fbMessage').value.trim();

    if (!name || !email || !message) {
        alert('Please fill all fields.');
        return;
    }
    if (fbRating === 0) {
        alert('Please rate us before submitting.');
        return;
    }

    // API: POST /api/feedback/submit
    console.log('Feedback:', { name, email, message, rating: fbRating });

    alert('Thank you for your feedback!');

    // Reset form
    document.getElementById('fbName').value    = '';
    document.getElementById('fbEmail').value   = '';
    document.getElementById('fbMessage').value = '';
    fbRating = 0;
    document.querySelectorAll('.fb-star').forEach(s => s.classList.remove('active'));
}


// ============================================================
// DISH RATINGS
// API: GET /api/dishes/ratings
//      Response: [{ dishId, averageRating, totalRatings }]
// DB:  SELECT dish_id, AVG(rating) as avg_rating, COUNT(*) as total
//      FROM dish_ratings GROUP BY dish_id
// ============================================================

const dishIds = [
    'clubwich','lavashrol','mushta','classicburger',
    'roastedjelepeno','cheesypizza','sweetdoughnut',
    'cakeroll','chocoberry','chocolatecake','sweetpancakes','bberrycake'
];

function loadDishRatings() {
    // API: GET /api/dishes/ratings
    // TODO: Replace with real fetch when backend ready:
    // const res = await fetch('/api/dishes/ratings');
    // const data = await res.json();
    // data.forEach(r => renderStars(r.dishId, r.averageRating));

    // TEMPORARY: Show 'New' for all dishes (no ratings yet)
    dishIds.forEach(id => renderStars(id, 0));
}

function renderStars(dishId, avg) {
    const numEl   = document.getElementById('rnum-'   + dishId);
    const starsEl = document.getElementById('rstars-' + dishId);
    if (!numEl || !starsEl) return;

    if (!avg || avg === 0) {
        numEl.textContent  = 'New';
        numEl.style.fontSize = '13px';
        starsEl.querySelectorAll('.star-icon').forEach(s => s.classList.remove('filled','half'));
        return;
    }

    numEl.textContent    = avg.toFixed(1);
    numEl.style.fontSize = '';
    const full = Math.floor(avg);
    const half = (avg - full) >= 0.3 && (avg - full) < 0.8;

    starsEl.querySelectorAll('.star-icon').forEach((s, i) => {
        s.classList.remove('filled','half');
        if (i < full)              s.classList.add('filled');
        else if (i === full && half) s.classList.add('half');
    });
}


// ============================================================
// RATING PROMPT AFTER PAYMENT
// Called after payment confirmed for an order
// API: POST /api/dishes/rate
//      Body: { dishId, customerId, orderId, rating }
// DB:  INSERT INTO dish_ratings (dish_id, customer_id, order_id, rating, created_at)
//      UPDATE dishes SET average_rating = new avg WHERE dish_id=?
// TODO: Build rating prompt UI when payment flow is connected
// ============================================================

function showRatingPrompt(orderedDishes, orderId) {
    console.log('TODO: Show rating prompt for:', orderedDishes, 'orderId:', orderId);
}


async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}


// ============================================================
// PAGE INIT — runs on load
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {
    // Hide dashboard content until auth confirmed (optional)
    document.body.style.opacity = '0';
    const isAuth = await checkAuth();
    if (!isAuth) return;
    document.body.style.opacity = '';

    await loadProfile();
    loadCustomerMenu();

    // Load profile data
    await loadProfile();

    // Load other features (ratings, etc.)
    if (typeof loadDishRatings === 'function') loadDishRatings();

    console.log("Customer dashboard ready");
});


// ESC key closes any open panel
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeDishCard();
        closeMenuSidebar();
        closeCartSidebar();
    }
});


// ==================== DYNAMIC MENU FOR CUSTOMER DASHBOARD ====================

async function loadCustomerMenu() {
    try {
        const response = await fetch('/api/public/menu'); // same public endpoint
        if (!response.ok) throw new Error();
        const dishes = await response.json();
        const mainDishes = dishes.filter(d => d.category === 'menu');
        const dessertDishes = dishes.filter(d => d.category === 'dessert');
        renderCustomerMenu(mainDishes, 'customerMainMenuGrid');
        renderCustomerMenu(dessertDishes, 'customerDessertGrid');
    } catch (err) {
        console.error('Failed to load customer menu', err);
    }
}

function renderCustomerMenu(dishes, gridId) {
    const container = document.getElementById(gridId);
    if (!container) return;
    if (!dishes.length) {
        container.innerHTML = '<div class="dash-menu-item">No dishes available.</div>';
        return;
    }
    container.innerHTML = dishes.map(dish => `
        <div class="dash-menu-item" onclick="openDishCard('${dish.imagePath || '/images/placeholder.png'}', '${escapeHtml(dish.name)}', 'PKR ${dish.price}/-', '${escapeHtml(dish.description)}')">
            <div class="dish-rating">
                <span class="rating-number">--</span>
                <div class="rating-stars">
                    <span class="star-icon">★</span><span class="star-icon">★</span>
                    <span class="star-icon">★</span><span class="star-icon">★</span>
                    <span class="star-icon">★</span>
                </div>
            </div>
            <div class="dash-plate-wrapper">
                <img src="${dish.imagePath || '/images/placeholder.png'}" alt="${escapeHtml(dish.name)}" class="dash-plate-img" onerror="this.src='/images/placeholder.png'">
            </div>
            <p class="dash-item-name">${escapeHtml(dish.name)}</p>
        </div>
    `).join('');
}

// Add escapeHtml if not already present (same as in website menu)
if (typeof escapeHtml !== 'function') {
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}