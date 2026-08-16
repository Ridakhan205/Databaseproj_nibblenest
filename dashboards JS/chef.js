// ============================================================
// chef.js — Chef Dashboard
// ============================================================
// SEARCH TAGS:
//   DB:   → SQL Server table/query needed
//   API:  → Spring Boot REST endpoint needed
//   AUTH: → Session/login check needed
//   REALTIME: → WebSocket or polling needed
// ============================================================


// ============================================================
// STATE
// ============================================================

// TEMPORARY: Simulated logged-in chef
// AUTH: Replace with real session
// API:  GET /api/auth/session → { userId, name, email, role, createdAt }
// DB:   Table: users (user_id, name, email, role, status, created_at)
// AUTH: Replace with real session on login
// API:  GET /api/auth/session → { userId, name, email, role, ... }
// DB:   Table: users (user_id, name, email, phone, role, status,
//               employee_id, created_at, shift)
let currentChef = {
    userId:      null,
    name:        '--',
    email:       '--',
    phone:       '--',
    role:        'Chef',
    status:      'Active',
    employeeId:  '--',
    createdAt:   '--',
    shift:       '--',
    weekOrders:  0,
    totalOrders: 0,
    avgPerDay:   '0',
    bestDay:     '--'
};

// TEMPORARY: Hardcoded test orders to simulate real order flow
// DB:  Table: orders (order_id, customer_id, chef_id, status, created_at)
//      Table: order_items (item_id, order_id, dish_name, qty)
//      Table: users (for customer name lookup)
// API: GET /api/orders/pending
//      GET /api/orders/preparing?chefId={id}
//      GET /api/orders/ready?chefId={id}
// DB:  Table: orders (order_id, customer_id, chef_id, status, created_at)
//      Table: order_items (item_id, order_id, dish_name, qty)
//      Table: users (for customer name lookup)
// API: GET /api/orders/pending      → pending orders
//      GET /api/orders/preparing    → preparing orders for this chef
//      GET /api/orders/ready        → ready orders for this chef
// REALTIME: Poll every 10s or use WebSocket for live updates
let pendingOrders   = [];
let preparingOrders = [];
let readyOrders     = [];
let completedCount  = 0;

// Currently open sidebar stage
let currentSidebarStage = null;


// ============================================================
// PERFORMANCE CHART
// DB:  SELECT DAY(created_at) as day, COUNT(*) as count
//      FROM orders
//      WHERE chef_id=? AND status='paid'
//      AND created_at BETWEEN ? AND ?
//      GROUP BY DAY(created_at)
//      (Run twice: once for current week, once for last week)
// API: GET /api/chef/performance?chefId={id}&week=current
//      GET /api/chef/performance?chefId={id}&week=last
//      Response: { days: ['Mon'..'Sun'], current: [n..], last: [n..] }
// ============================================================

function initChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');

    // TEMPORARY: Placeholder data
    // API: Replace arrays below with real data from /api/chef/performance
    const days        = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // DB:  SELECT DAY(created_at) as day, COUNT(*) as count
    //      FROM orders WHERE chef_id=? AND status='ready_for_payment'
    //      AND created_at BETWEEN ? AND ?
    //      GROUP BY DAY(created_at)
    // API: GET /api/chef/performance?chefId={id}&week=current
    //      GET /api/chef/performance?chefId={id}&week=last
    //      Response: { days: ['Mon'...'Sun'], current: [n...], last: [n...] }
    // TODO: Replace these zeros with real API fetch when backend ready
    const currentWeek = [0, 0, 0, 0, 0, 0, 0];
    const lastWeek    = [0, 0, 0, 0, 0, 0, 0];

    // Calculate max and average from last week for performance line
    const maxLastWeek = Math.max(...lastWeek);
    const avgLastWeek = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;
    const perfLine    = new Array(7).fill(parseFloat(avgLastWeek.toFixed(1)));

    window.chefChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Last Week',
                    data: lastWeek,
                    backgroundColor: '#5b8cdb',
                    borderRadius: 4,
                    borderSkipped: false,
                },
                {
                    label: 'This Week',
                    data: currentWeek,
                    backgroundColor: '#FFB366',
                    borderRadius: 4,
                    borderSkipped: false,
                },
                {
                    label: 'Avg Performance',
                    data: perfLine,
                    type: 'line',
                    borderColor: '#744D30',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Poppins', size: 12 },
                        color: '#4a3728'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} orders`
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true, text: 'Day',
                        font: { family: 'Poppins', size: 12 },
                        color: '#8B5E3C'
                    },
                    ticks: { color: '#4a3728' },
                    grid: { display: false }
                },
                y: {
                    title: {
                        display: true, text: 'Orders Completed',
                        font: { family: 'Poppins', size: 12 },
                        color: '#8B5E3C'
                    },
                    ticks: { color: '#4a3728', stepSize: 5 },
                    beginAtZero: true
                }
            }
        }
    });
}

// ============================================================
// UPDATE CHART with real data
// Called after fetching performance data from API
// ============================================================

function updateChart(currentWeekData, lastWeekData) {
    if (!window.chefChart) return;
    const avg = lastWeekData.reduce((a,b) => a+b, 0) / lastWeekData.length;
    window.chefChart.data.datasets[0].data = lastWeekData;
    window.chefChart.data.datasets[1].data = currentWeekData;
    window.chefChart.data.datasets[2].data = new Array(7).fill(parseFloat(avg.toFixed(1)));
    window.chefChart.update();
}


// ============================================================
// ORDER SIDEBAR — OPEN
// ============================================================

function openOrderSidebar(stage) {
    currentSidebarStage = stage;

    const titles = {
        pending:   'Pending Orders',
        preparing: 'Preparing Orders',
        ready:     'Ready Orders'
    };

    document.getElementById('orderSidebarTitle').textContent = titles[stage];
    renderOrderSidebar(stage);

    document.getElementById('orderSidebar').classList.add('active');
    document.getElementById('orderOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeOrderSidebar() {
    document.getElementById('orderSidebar').classList.remove('active');
    document.getElementById('orderOverlay').classList.remove('active');
    document.body.style.overflow = '';
    currentSidebarStage = null;
}


// ============================================================
// RENDER ORDER SIDEBAR CONTENT
// ============================================================

function renderOrderSidebar(stage) {
    const list = document.getElementById('orderSidebarList');
    list.innerHTML = '';

    let orders = [];
    if (stage === 'pending')   orders = pendingOrders;
    if (stage === 'preparing') orders = preparingOrders;
    if (stage === 'ready')     orders = readyOrders;

    if (orders.length === 0) {
        list.innerHTML = '<p class="sidebar-empty">No orders here.</p>';
        return;
    }

    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'chef-order-card';

        // Build dish rows
        // DB: Table: order_items (order_id, dish_name, qty)
        // Note: Inventory/stock management is handled by admin/manager dashboard
        //       Dishes marked out of stock there become unclickable on menu pages
        //       No inventory check needed here at chef level
        let dishRows = '';
        order.items.forEach(item => {
            dishRows += `
                <div class="chef-dish-row">
                    • ${item.dishName} × ${item.qty}
                </div>`;
        });

        // Action button per stage
        let actionBtn = '';
        let inventoryStatus = '';

        if (stage === 'pending') {
            // CHEF ACTION: Start Preparing
            // API: PUT /api/orders/status
            //      Body: { orderId, status: 'preparing', chefId }
            // DB:  UPDATE orders SET status='preparing', chef_id=?
            //      WHERE order_id=?
            // AFTER:
            //   → Move to preparingOrders array
            //   → Trigger inventory check (checkInventoryAndAutoReady)
            //   → Update badges
            actionBtn = `<button class="chef-action-btn"
                onclick="startPreparing('${order.orderId}')">
                Start Preparing
            </button>`;

        } else if (stage === 'preparing') {
            // NO CHEF ACTION — fully automatic
            // Chef watches ingredient check happen one by one
            // Then order auto-moves to Ready when all checked

            const checkStatus = order.ingredientCheckStatus || [];
            const isDone      = order.checkingDone || false;

            if (checkStatus.length === 0 && !isDone) {
                // Just started — collecting ingredients
                inventoryStatus = `
                    <div class="check-in-progress">
                        <span class="check-spinner">⏳</span>
                        Checking main ingredients...
                    </div>`;
            } else {
                // Build checked ingredient list
                let checkRows = checkStatus.map(c => `
                    <div class="check-row">
                        <span class="check-tick">✓</span>
                        <span class="check-name">${c.ingredient}</span>
                        <span class="check-dish">(${c.dish})</span>
                    </div>
                `).join('');

                if (isDone) {
                    checkRows += `<div class="check-done">
                        All confirmed — moving to Ready...
                    </div>`;
                }

                inventoryStatus = `
                    <div class="check-list">
                        <p class="check-list-title">Checking ingredients:</p>
                        ${checkRows}
                    </div>`;
            }

            actionBtn = ''; // No button — fully automatic

        } else if (stage === 'ready') {
            // CHEF ACTION: Mark as Ready
            // Chef confirms the order is physically ready to be served
            // API: PUT /api/orders/status
            //      Body: { orderId, status: 'ready_for_payment', chefId }
            // DB:  UPDATE orders SET status='ready_for_payment'
            //      WHERE order_id=?
            // AFTER:
            //   → Notify customer dashboard: alert "Your order is ready!"
            //   → Customer sees "OK" button on alert
            //   → When customer clicks OK → payment receipt card appears
            //   → Notify cashier dashboard: order appears in payment queue
            //
            // INVENTORY DEDUCTION (on mark ready):
            // API: POST /api/inventory/deduct
            //      Body: { dishes: order.items }
            // DB:  UPDATE inventory
            //      SET stock = stock - used_amount
            //      WHERE ingredient_name = ? AND dish_id = ?
            actionBtn = `<button class="chef-action-btn btn-ready"
                onclick="markOrderReady('${order.orderId}')">
                Mark as Ready
            </button>`;
        }

        card.innerHTML = `
            <div class="chef-order-id">Order #${order.orderId}</div>
            <div class="chef-order-customer">Customer: ${order.customerName}</div>
            <div class="chef-order-items">${dishRows}</div>
            ${inventoryStatus}
            ${actionBtn}
        `;

        list.appendChild(card);
    });
}


// ============================================================
// START PREPARING
// Chef clicks "Start Preparing" on a pending order
// API: PUT /api/orders/status
//      Body: { orderId, status: 'preparing', chefId }
// DB:  UPDATE orders SET status='preparing', chef_id=?
//      WHERE order_id=?
// ============================================================

function startPreparing(orderId) {
    const order = pendingOrders.find(o => o.orderId === orderId);
    if (!order) return;

    pendingOrders   = pendingOrders.filter(o => o.orderId !== orderId);
    order.status    = 'preparing';
    preparingOrders.push(order);

    showNotification(`Order #${orderId} is now being prepared.`, 'notif-info');
    updateBadges();

    // Trigger automatic inventory check
    // This will auto-move to ready if all ingredients available
    checkInventoryAndAutoReady(order);

    renderOrderSidebar('preparing');
    openOrderSidebar('preparing');
}


// ============================================================
// INGREDIENT CHECK → AUTO MOVE TO READY
// Shows chef each main ingredient being checked one by one
// After all checked → auto moves to Ready
//
// FUTURE CONNECTION:
// DB:  Table: dish_ingredients
//      Columns: dish_id, ingredient_name, is_main_ingredient, required_amount
//      Table: inventory
//      Columns: ingredient_id, ingredient_name, stock
//
// API: GET /api/inventory/check
//      Body: { dishes: order.items }
//      Response: [{ ingredient, available: true/false }]
//
// Each ingredient check in real system:
//   SELECT stock FROM inventory
//   JOIN dish_ingredients ON ingredient_name
//   WHERE dish_id=? AND is_main_ingredient=1
//
// Admin inventory management (separate from chef):
//   → Admin adds/updates stock in inventory table
//   → When stock = 0 → dish flagged unavailable
//   → Menu page checks this flag → dish unclickable
//   → So by the time order reaches chef, all ingredients confirmed available
// ============================================================

function checkInventoryAndAutoReady(order) {

    // Collect all main ingredients across all dishes in order
    let allIngredients = [];
    order.items.forEach(item => {
        const ingredients = item.mainIngredients || ['Main ingredient'];
        ingredients.forEach(ing => {
            allIngredients.push({
                ingredient: ing,
                dish: item.dishName
            });
        });
    });

    // Reset check status
    order.ingredientCheckStatus = [];
    order.checkingDone = false;

    // Show initial "checking" state in sidebar
    renderOrderSidebar('preparing');

    // Check each ingredient one by one with delay
    // FUTURE: Each step here = one DB/API check per ingredient
    allIngredients.forEach((item, index) => {
        setTimeout(() => {

            // Mark this ingredient as checked
            // API: GET /api/inventory/check?ingredient={name}
            // DB:  SELECT stock FROM inventory WHERE ingredient_name=?
            order.ingredientCheckStatus.push({
                ingredient: item.ingredient,
                dish:       item.dish,
                ok:         true // TODO: replace with real API response
            });

            // Refresh sidebar to show updated check list
            if (currentSidebarStage === 'preparing') {
                renderOrderSidebar('preparing');
            }

            // After last ingredient checked → auto move to ready
            if (index === allIngredients.length - 1) {
                order.checkingDone = true;
                setTimeout(() => {
                    autoMoveToReady(order);
                }, 800);
            }

        }, (index + 1) * 1200); // 1.2s between each ingredient check
    });
}


// ============================================================
// AUTO MOVE TO READY
// Called by checkInventoryAndAutoReady when all ingredients ok
// ============================================================

function autoMoveToReady(order) {
    // Make sure order is still in preparing (not cancelled)
    if (!preparingOrders.find(o => o.orderId === order.orderId)) return;

    preparingOrders = preparingOrders.filter(o => o.orderId !== order.orderId);
    order.status    = 'ready';
    order.inventoryIssue = false;
    readyOrders.push(order);

    showNotification(
        `Order #${order.orderId} ingredients confirmed — moved to Ready.`,
        'notif-order'
    );
    updateBadges();

    // Refresh sidebar if still open on preparing
    if (currentSidebarStage === 'preparing') {
        renderOrderSidebar('preparing');
    }
}


// ============================================================
// MARK ORDER AS READY
// Chef confirms order is physically ready to serve
// API: PUT /api/orders/status
//      Body: { orderId, status: 'ready_for_payment', chefId }
// DB:  UPDATE orders SET status='ready_for_payment'
//      WHERE order_id=?
// AFTER:
//   → Notify customer: "Your order is ready! Please proceed to payment."
//      API: POST /api/notifications/send
//           Body: { userId: order.customerId, type: 'order_ready',
//                   message: 'Your order is ready!' }
//      DB:  INSERT INTO notifications (user_id, message, type, is_read, created_at)
//   → When customer clicks OK on alert → payment receipt card appears on their dashboard
//   → Notify cashier: order appears in payment queue
//      API: POST /api/notifications/send
//           Body: { role: 'cashier', type: 'payment_queue',
//                   orderId, customerName: order.customerName }
//
// INVENTORY DEDUCTION:
//   API: POST /api/inventory/deduct
//        Body: { dishes: order.items }
//   DB:  UPDATE inventory
//        SET stock = stock - di.required_amount
//        FROM inventory i
//        JOIN dish_ingredients di ON i.ingredient_id = di.ingredient_id
//        WHERE di.dish_id IN (order dish ids)
// ============================================================

function markOrderReady(orderId) {
    const order = readyOrders.find(o => o.orderId === orderId);
    if (!order) return;

    // Remove from ready (moves to cashier/payment flow)
    readyOrders = readyOrders.filter(o => o.orderId !== orderId);
    completedCount++;

    document.getElementById('completedTotal').textContent = `Total ${completedCount}`;
    updateTodayOnChart();

    showNotification(
        `Order #${orderId} is ready! Customer and Cashier notified.`,
        'notif-order'
    );

    // API: PUT /api/orders/status → status: 'ready_for_payment'
    // API: POST /api/notifications/send → customer gets alert + payment card
    // API: POST /api/notifications/send → cashier gets order in payment queue

    updateBadges();
    renderOrderSidebar('ready');
}


// completeOrder removed — flow is now:
// Pending → startPreparing() → checkInventoryAndAutoReady() → autoMoveToReady()
//         → markOrderReady() → customer gets alert + payment card → cashier handles payment


// ============================================================
// UPDATE TODAY'S BAR IN CHART
// Called after each order completion
// DB:  SELECT COUNT(*) FROM orders
//      WHERE chef_id=? AND status='completed'
//      AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)
// API: GET /api/chef/today-count?chefId={id}
// ============================================================

function updateTodayOnChart() {
    if (!window.chefChart) return;
    const today   = new Date().getDay();
    const dayIdx  = today === 0 ? 6 : today - 1; // Mon=0 ... Sun=6

    // TEMPORARY: Increment today's bar locally
    // API: Replace with real fetch /api/chef/today-count
    const currentData = window.chefChart.data.datasets[1].data;
    currentData[dayIdx] = (currentData[dayIdx] || 0) + 1;
    window.chefChart.data.datasets[1].data = currentData;
    window.chefChart.update();
}


// ============================================================
// UPDATE BADGES
// ============================================================

function updateBadges() {
    const badges = [
        { id: 'badgePending',   count: pendingOrders.length },
        { id: 'badgePreparing', count: preparingOrders.length },
        { id: 'badgeReady',     count: readyOrders.length },
    ];
    badges.forEach(b => {
        const el = document.getElementById(b.id);
        if (b.count > 0) {
            el.textContent = b.count;
            el.classList.add('has-orders'); // shows badge
        } else {
            el.classList.remove('has-orders'); // hides badge completely
        }
    });
}


// ============================================================
// SIMULATE INCOMING ORDER (for testing)
// REALTIME: Replace with WebSocket listener or polling
// API: WebSocket /ws/chef/orders → listen for new orders
//      OR: setInterval(() => fetchPendingOrders(), 10000)
// DB:  SELECT * FROM orders WHERE status='pending'
//      AND chef_id IS NULL ORDER BY created_at ASC
// ============================================================

// ============================================================
// SIMULATE INCOMING ORDER (for testing)
// REALTIME: Replace with WebSocket or polling
// API: WebSocket /ws/chef/orders → listen for new orders
//      OR: setInterval(() => fetchPendingOrders(), 10000)
// DB:  SELECT o.*, oi.*, u.name as customer_name
//      FROM orders o
//      JOIN order_items oi ON o.order_id = oi.order_id
//      JOIN users u ON o.customer_id = u.user_id
//      WHERE o.status='pending' AND o.chef_id IS NULL
//
// mainIngredients: fetched from dish_ingredients table
// DB: SELECT ingredient_name FROM dish_ingredients
//     WHERE dish_id=? AND is_main_ingredient=1
// ============================================================

function simulateIncomingOrder() {
    const testOrder = {
        orderId:      'ORD-' + Date.now(),
        customerId:   1,
        customerName: 'Test Customer',
        status:       'pending',
        items: [
            {
                dishName: 'Classic Burger',
                qty: 1,
                // DB: dish_ingredients WHERE dish_id=? AND is_main_ingredient=1
                mainIngredients: ['Beef Patty', 'Burger Bun', 'Lettuce']
            },
            {
                dishName: 'Cheesy Pizza',
                qty: 1,
                // DB: dish_ingredients WHERE dish_id=? AND is_main_ingredient=1
                mainIngredients: ['Pizza Dough', 'Mozzarella', 'Tomato Sauce']
            }
        ],
        ingredientCheckStatus: [] // filled during preparing stage
    };
    pendingOrders.push(testOrder);
    updateBadges();
    showNotification('New order received! #' + testOrder.orderId, 'notif-order');
}


// ============================================================
// NOTIFICATION BAR
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
// PROFILE CARD
// ============================================================

function openProfileCard() {
    // Load chef data into profile card
    // API: GET /api/chef/profile
    //      Response: { name, email, phone, role, status, employeeId,
    //                  createdAt, shift, weekOrders, totalOrders, avgPerDay, bestDay }
    // DB:  SELECT u.*,
    //        COUNT(o.order_id) as total_orders,
    //        SUM(CASE WHEN o.created_at >= start_of_week THEN 1 ELSE 0 END) as week_orders
    //      FROM users u LEFT JOIN orders o ON u.user_id = o.chef_id
    //      WHERE u.user_id=?

    document.getElementById('profileDisplayName').textContent = currentChef.name;
    document.getElementById('chefEmailDisplay').textContent   = currentChef.email;
    document.getElementById('chefPhoneDisplay').textContent   = currentChef.phone  || '--';
    document.getElementById('chefEmpId').textContent          = currentChef.employeeId;
    document.getElementById('chefSince').textContent          = currentChef.createdAt;
    document.getElementById('chefShift').textContent          = currentChef.shift   || '--';
    document.getElementById('chefStatusDisplay').textContent  = currentChef.status;
    document.getElementById('chefWeekOrders').textContent     = currentChef.weekOrders;
    document.getElementById('chefTotalOrders').textContent    = currentChef.totalOrders;
    document.getElementById('chefAvgPerDay').textContent      = currentChef.avgPerDay;
    document.getElementById('chefBestDay').textContent        = currentChef.bestDay;

    document.getElementById('profileCardModal').classList.add('active');
    document.getElementById('profileOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProfileCard() {
    document.getElementById('profileCardModal').classList.remove('active');
    document.getElementById('profileOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Profile is fully read-only — managed by Admin
// API: PUT /api/chef/profile is an admin-only endpoint
// Future: Admin dashboard will have edit functionality for staff profiles
function saveChefProfile() {
    closeProfileCard();
}


// ============================================================
// LOGOUT
// API: POST /api/auth/logout → clear Spring Boot session
// DB:  No DB action — session stored server-side
// ============================================================

function handleLogout() {
    // API: await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}


// ============================================================
// PAGE INIT
// ============================================================

window.addEventListener('DOMContentLoaded', function () {

    // AUTH: Verify session + check role is 'chef'
    // API: GET /api/auth/session
    // If not logged in → /login
    // If role != chef  → redirect to correct dashboard
    // TODO: Uncomment when backend ready:
    // checkSession();

    // Init chart with placeholder data
    initChart();

    // Load orders from backend
    // API: GET /api/orders/pending
    //      GET /api/orders/preparing?chefId={id}
    //      GET /api/orders/ready?chefId={id}
    // TODO: Uncomment when backend ready:
    // loadAllOrders();

    // Update badges with current counts
    updateBadges();

    // REALTIME: Start polling for new orders every 10 seconds
    // API: setInterval(fetchPendingOrders, 10000)
    // TODO: Replace with WebSocket when available

    // Load completed count
    // API: GET /api/chef/completed-count?chefId={id}
    //      Response: { count: number }
    // DB:  SELECT COUNT(*) FROM orders WHERE chef_id=? AND status='completed'
    //      AND created_at >= start of current week
    document.getElementById('completedTotal').textContent = `Total ${completedCount}`;
});


// ESC closes sidebar and profile card
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeOrderSidebar();
        closeProfileCard();
    }
});