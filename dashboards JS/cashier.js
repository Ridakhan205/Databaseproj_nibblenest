// ============================================================
// cashier.js — Cashier Dashboard
// ============================================================
// SEARCH TAGS:
//   DB:       → SQL Server table/query needed
//   API:      → Spring Boot REST endpoint needed
//   AUTH:     → Session/login check needed
//   REALTIME: → WebSocket or polling needed
//   REPORT:   → Data exported to admin/manager dashboard
//   TODO:     → Uncomment or implement when backend is ready
// ============================================================


// ============================================================
// STATE
// ============================================================

// AUTH: Replace with real session data from backend
// API:  GET /api/auth/session
// DB:   Table: users WHERE user_id=? AND role='cashier'
let currentCashier = {
    userId:      null,
    name:        '--',
    email:       '--',
    phone:       '--',
    employeeId:  '--',
    createdAt:   '--',
    shift:       '--',
    status:      'Active'
};

// Orders ready for payment — arrives from kitchen
// DB:   Table: orders WHERE status='ready_for_payment'
// API:  GET /api/orders/ready-for-payment
// REALTIME: WebSocket push OR poll every 10s
let pendingOrders = [];

// Orders where customer has PAID but cashier has not yet confirmed
// DB:   Table: payments WHERE status='pending_cashier_ok' AND cashier_id=?
// API:  GET /api/payments/awaiting-confirmation?cashierId={id}
// REALTIME: WebSocket push when customer pays
let awaitingConfirmationOrders = [];

// Fully confirmed history — cashier clicked OK
// DB:   Table: payments WHERE status='confirmed' AND cashier_id=?
// API:  GET /api/payments/history?cashierId={id}
let historyOrders = [];

// Holds the order currently being receipted
// Set in generateBill(), cleared in closeReceipt()
let currentReceiptOrder = null;

// Performance tracking — measures cashier response speed
// Response time = order arrivedAt → cashier sends bill
// DB:     Table: payments (response_time_seconds column)
// API:    GET /api/cashier/performance?cashierId={id}
// REPORT: Sent to admin/manager dashboard for analysis
//         API: GET /api/reports/cashier-performance?cashierId={id}
let performanceData = {
    quick:   0,   // under 5 min (300 seconds)
    average: 0,   // 5–10 min (300–600 seconds)
    late:    0,   // over 10 min (600+ seconds)
    times:   []   // response times in minutes — drives the chart
};

// Tax flat amount — replace with dynamic value from DB when ready
// DB:  Table: settings WHERE key='tax_flat_amount'
// API: GET /api/settings/tax
const TAX = 50;


// ============================================================
// PENDING SIDEBAR (Left)
// Opens when cashier clicks "View Orders"
// Shows full expanded detail for each pending order
// Cashier generates bill from here
// ============================================================

function openPendingSidebar() {
    renderPendingSidebar();
    document.getElementById('pendingSidebar').classList.add('active');
    document.getElementById('leftOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePendingSidebar() {
    document.getElementById('pendingSidebar').classList.remove('active');
    document.getElementById('leftOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Renders full order cards inside the pending sidebar
// Each card shows items, total, and Generate Bill button
function renderPendingSidebar() {
    const list = document.getElementById('pendingSidebarList');
    list.innerHTML = '';

    if (pendingOrders.length === 0) {
        list.innerHTML = '<p class="sidebar-empty">No pending payment orders.</p>';
        return;
    }

    pendingOrders.forEach(order => {
        const subtotal = calcSubtotal(order.items);
        const total    = subtotal + TAX;

        const itemsHtml = order.items
            .map(i => `<div>${i.dishName} × ${i.qty} — PKR ${parsePrice(i.price) * i.qty}/-</div>`)
            .join('');

        const div = document.createElement('div');
        div.className = 'cashier-order-card';
        div.innerHTML = `
            <div class="cashier-order-id">Order #${order.orderId}</div>
            <div class="cashier-order-customer">Customer: ${order.customerName}</div>
            <div class="cashier-order-items">${itemsHtml}</div>
            <div class="cashier-order-total">Total: PKR ${total}/-</div>
            <button class="generate-bill-btn"
                onclick="generateBill('${order.orderId}')">
                Generate Bill
            </button>
        `;
        list.appendChild(div);
    });
}


// ============================================================
// PAID ORDERS SIDEBAR (Right)
// Opens when cashier clicks "View Paid"
// Shows orders where customer has already paid
// Cashier reviews and clicks OK to confirm — moves to history
//
// DB:   Table: payments WHERE status='pending_cashier_ok'
//       AND cashier_id=?
// API:  GET /api/payments/awaiting-confirmation?cashierId={id}
// REALTIME: Badge + summary update via WebSocket when customer pays
// ============================================================

function openPaidSidebar() {
    renderPaidSidebar();
    document.getElementById('paidSidebar').classList.add('active');
    document.getElementById('rightOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePaidSidebar() {
    document.getElementById('paidSidebar').classList.remove('active');
    document.getElementById('rightOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Renders full paid order cards inside the right sidebar
// Each card shows items, total, payment method, date/time, and OK button
function renderPaidSidebar() {
    const list = document.getElementById('paidSidebarList');
    list.innerHTML = '';

    if (awaitingConfirmationOrders.length === 0) {
        list.innerHTML = '<p class="sidebar-empty">No paid orders awaiting confirmation.</p>';
        return;
    }

    awaitingConfirmationOrders.forEach(order => {
        const itemsHtml = order.items
            ? order.items.map(i => `<div>${i.dishName} × ${i.qty} — PKR ${parsePrice(i.price) * i.qty}/-</div>`).join('')
            : '';

        const div = document.createElement('div');
        div.className = 'paid-order-card';
        div.innerHTML = `
            <div class="paid-order-header">
                <span class="paid-order-id">Order #${order.orderId}</span>
                <span class="paid-order-time">${order.paidAt}</span>
            </div>
            <div class="paid-order-customer">Customer: ${order.customerName}</div>
            ${itemsHtml ? `<div class="paid-order-items">${itemsHtml}</div>` : ''}
            <div class="paid-order-footer">
                <span class="paid-order-total">PKR ${order.total}/-</span>
                <span class="paid-method-tag ${order.method.toLowerCase()}">${order.method}</span>
                <span class="paid-status-tag">Awaiting Confirmation</span>
            </div>
            <button class="cashier-ok-btn"
                onclick="confirmReceivedPayment('${order.orderId}')">
                ✓ OK — Confirm Payment Received
            </button>
        `;
        list.appendChild(div);
    });
}


// ============================================================
// PANEL SUMMARY ROWS
// Compact order rows visible directly on the left/right panels
// before the cashier opens the full sidebar
// Clicking any row opens the corresponding sidebar
// ============================================================

// Updates compact summary rows on the left (pending) panel
function updatePendingSummary() {
    const list = document.getElementById('pendingSummaryList');
    list.innerHTML = '';

    if (pendingOrders.length === 0) {
        list.innerHTML = '<p class="panel-summary-empty">No pending orders</p>';
        return;
    }

    pendingOrders.forEach(order => {
        const total = calcSubtotal(order.items) + TAX;
        const div   = document.createElement('div');
        div.className = 'panel-summary-row';
        div.onclick   = () => openPendingSidebar();
        div.innerHTML = `
            <div class="summary-row-top">
                <span class="summary-order-id">#${order.orderId}</span>
                <span class="summary-total">PKR ${total}/-</span>
            </div>
            <div class="summary-customer">${order.customerName}</div>
        `;
        list.appendChild(div);
    });
}

// Updates compact summary rows on the right (paid) panel
function updatePaidSummary() {
    const list = document.getElementById('paidSummaryList');
    list.innerHTML = '';

    if (awaitingConfirmationOrders.length === 0) {
        list.innerHTML = '<p class="panel-summary-empty">No paid orders</p>';
        return;
    }

    awaitingConfirmationOrders.forEach(order => {
        const div = document.createElement('div');
        div.className = 'panel-summary-row';
        div.onclick   = () => openPaidSidebar();
        div.innerHTML = `
            <div class="summary-row-top">
                <span class="summary-order-id">#${order.orderId}</span>
                <span class="summary-total">PKR ${order.total}/-</span>
            </div>
            <div class="summary-customer">${order.customerName}</div>
            <span class="summary-method-tag ${order.method.toLowerCase()}">${order.method}</span>
        `;
        list.appendChild(div);
    });
}


// ============================================================
// GENERATE BILL — Opens receipt card
// Cashier reviews the order and prepares the receipt
// Order stays in pending until customer actually pays —
// generating a bill does NOT remove it from pending
//
// API: POST /api/payments/generate-receipt
//      Body:     { orderId, cashierId }
//      Response: { receiptId, items, subtotal, tax, total }
// DB:  No DB insert yet — receipt is just prepared in memory
//      Insert happens only when customer pays
// ============================================================

function generateBill(orderId) {
    const order = pendingOrders.find(o => o.orderId === orderId);
    if (!order) return;

    // Set as the currently active receipt order
    currentReceiptOrder = order;

    const subtotal = calcSubtotal(order.items);
    const total    = subtotal + TAX;
    const now      = new Date();

    // Populate receipt meta section
    document.getElementById('receiptMeta').innerHTML = `
        <div class="receipt-meta-row">
            <span>Order ID</span>
            <span><strong>#${order.orderId}</strong></span>
        </div>
        <div class="receipt-meta-row">
            <span>Customer</span>
            <span>${order.customerName}</span>
        </div>
        <div class="receipt-meta-row">
            <span>Date</span>
            <span>${now.toLocaleDateString()}</span>
        </div>
        <div class="receipt-meta-row">
            <span>Time</span>
            <span>${now.toLocaleTimeString()}</span>
        </div>
    `;

    // Populate receipt items section
    document.getElementById('receiptItems').innerHTML =
        order.items.map(i => {
            const itemPrice = parsePrice(i.price) * i.qty;
            return `
                <div class="receipt-item-row">
                    <span class="receipt-item-name">${i.dishName} × ${i.qty}</span>
                    <span class="receipt-item-price">PKR ${itemPrice}/-</span>
                </div>`;
        }).join('');

    // Populate receipt totals section
    document.getElementById('receiptTotals').innerHTML = `
        <div class="receipt-total-row">
            <span>Subtotal</span>
            <span>PKR ${subtotal}/-</span>
        </div>
        <div class="receipt-total-row">
            <span>Tax</span>
            <span>PKR ${TAX}/-</span>
        </div>
        <div class="receipt-total-row grand">
            <span>Total</span>
            <span>PKR ${total}/-</span>
        </div>
    `;

    // Store computed values on the order for use in sendReceiptToCustomer()
    currentReceiptOrder.total    = total;
    currentReceiptOrder.subtotal = subtotal;

    // Show receipt card
    document.getElementById('receiptOverlay').classList.add('active');
    document.getElementById('receiptCard').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeReceipt() {
    document.getElementById('receiptOverlay').classList.remove('active');
    document.getElementById('receiptCard').classList.remove('active');
    document.body.style.overflow = '';
    currentReceiptOrder = null;
}


// ============================================================
// SEND RECEIPT TO CUSTOMER
// Cashier clicks "Send Receipt to Customer"
// This is the cashier's response action — performance is
// measured from when the order arrived to this exact moment
//
// PERFORMANCE TIMING:
//   arrivedAt (set when order enters pending)
//   → sendReceiptToCustomer() called NOW
//   = cashier response time in minutes
//   Stored in performanceData and sent to DB
//
// AFTER SENDING:
//   Receipt appears on customer dashboard — customer cannot close it
//   Customer selects Cash or Card and pays
//   If Card → customer enters card details → submits
//   Payment confirmed → customer sees "Paid" screen
//   Cashier gets real-time notification: "Order #X paid via Cash/Card"
//   Order moves from pendingOrders → awaitingConfirmationOrders
//
// API: POST /api/payments/send-receipt
//      Body:     { orderId, customerId, receiptData: { items, subtotal, tax, total } }
//      Response: { success: true }
// DB:  INSERT INTO notifications
//      (user_id=customerId, type='payment_receipt',
//       message='Your receipt is ready — please complete payment',
//       data=JSON(receiptData), is_read=0, created_at=NOW())
// ============================================================

function sendReceiptToCustomer() {
    if (!currentReceiptOrder) return;

    // ── CASHIER PERFORMANCE TRACKING ──────────────────────────
    // Response time = order arrived at cashier → bill sent to customer
    // This measures how fast the cashier acted, not the customer
    // DB:  UPDATE payments SET response_time_seconds=?
    //      WHERE order_id=? AND cashier_id=?
    // REPORT: Exported to admin/manager via
    //         GET /api/reports/cashier-performance?cashierId={id}
    const arrivedAt    = currentReceiptOrder.arrivedAt || Date.now();
    const responseMs   = Date.now() - arrivedAt;
    const responseMins = parseFloat((responseMs / 60000).toFixed(1));

    performanceData.times.push(responseMins);

    if (responseMins < 5) {
        performanceData.quick++;           // under 5 min — quick
    } else if (responseMins < 10) {
        performanceData.average++;         // 5–10 min — average
    } else {
        performanceData.late++;            // over 10 min — late
    }

    // Update chart and stat blocks immediately
    updatePerformanceUI();
    // ──────────────────────────────────────────────────────────

    // API: POST /api/payments/send-receipt
    // TODO: Replace console.log with real fetch when backend ready:
    // await fetch('/api/payments/send-receipt', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         orderId:      currentReceiptOrder.orderId,
    //         customerId:   currentReceiptOrder.customerId,
    //         responseTimeSecs: Math.round(responseMs / 1000),
    //         receiptData: {
    //             items:    currentReceiptOrder.items,
    //             subtotal: currentReceiptOrder.subtotal,
    //             tax:      TAX,
    //             total:    currentReceiptOrder.total
    //         }
    //     })
    // });
    console.log('TODO: Send receipt — Order:', currentReceiptOrder.orderId,
        '| Customer:', currentReceiptOrder.customerId,
        '| Response time:', responseMins + ' min'
    );

    showNotification(
        `Receipt sent to ${currentReceiptOrder.customerName}. Waiting for payment...`,
        'notif-info'
    );

    closeReceipt();
    closePendingSidebar();
}


// ============================================================
// PAYMENT CONFIRMED (triggered when customer pays)
// This function is called either by:
//   → WebSocket push from backend (real-time, production)
//   → simulateCustomerPaid() (testing only)
//
// At this point the cashier's performance has already been
// recorded in sendReceiptToCustomer() — this function only
// handles moving the order to awaitingConfirmation
//
// REALTIME: WebSocket /ws/cashier/payment-confirmed
//           OR poll: GET /api/payments/confirmed?cashierId={id}
//           Response: { orderId, customerName, items, total, method, paidAt }
//
// DB:  INSERT INTO payments
//      (order_id, customer_id, cashier_id, method,
//       subtotal, tax, total, status='pending_cashier_ok',
//       created_at=NOW())
//      UPDATE orders SET status='paid' WHERE order_id=?
// ============================================================

function onPaymentConfirmed(orderId, method, paidAt) {
    const order = pendingOrders.find(o => o.orderId === orderId);
    if (!order) return;

    // Remove from pending panel
    pendingOrders = pendingOrders.filter(o => o.orderId !== orderId);

    // Move to awaiting confirmation (right sidebar)
    // Cashier must click OK before it goes to history
    awaitingConfirmationOrders.unshift({
        orderId:      order.orderId,
        customerName: order.customerName,
        items:        order.items,
        total:        order.total,
        method:       method,
        // Full date + time for cashier record
        paidAt: new Date(paidAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' · '
            + new Date(paidAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    });

    updateBadges();
    updatePendingSummary();
    updatePaidSummary();

    showNotification(
        `Order #${orderId} paid via ${method}! Open Paid Orders to confirm.`,
        'notif-payment'
    );
}


// ============================================================
// CASHIER MANUALLY OK's PAYMENT
// Cashier opens right sidebar, reviews the paid order,
// clicks OK to confirm they physically received/processed it
// Order is then moved to confirmed history
//
// API: PUT /api/payments/confirm
//      Body: { orderId, cashierId }
// DB:  UPDATE payments SET status='confirmed'
//      WHERE order_id=? AND cashier_id=?
// ============================================================

function confirmReceivedPayment(orderId) {
    const order = awaitingConfirmationOrders.find(o => o.orderId === orderId);
    if (!order) return;

    // Remove from awaiting confirmation list
    awaitingConfirmationOrders = awaitingConfirmationOrders.filter(o => o.orderId !== orderId);

    // Add to confirmed history — paidAt carries full date + time
    historyOrders.unshift({
        orderId:      order.orderId,
        customerName: order.customerName,
        total:        order.total,
        method:       order.method,
        paidAt:       order.paidAt
    });

    // API: PUT /api/payments/confirm
    // TODO: Replace console.log with real fetch when backend ready:
    // await fetch('/api/payments/confirm', {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ orderId, cashierId: currentCashier.userId })
    // });
    console.log('TODO: Confirm payment for order:', orderId);

    updateBadges();
    updatePaidSummary();
    updateHistoryPreview();

    // Re-render right sidebar so confirmed order disappears immediately
    renderPaidSidebar();

    showNotification(`Order #${orderId} confirmed and moved to history.`, 'notif-payment');
}


// ============================================================
// HISTORY CARD (zoom in)
// Full confirmed order history — opened by clicking
// "Paid Orders" preview card or history preview card
// DB:  Table: payments WHERE status='confirmed' AND cashier_id=?
//      ORDER BY created_at DESC
// API: GET /api/payments/history?cashierId={id}
// ============================================================

function openHistoryCard() {
    renderHistoryCard();
    document.getElementById('historyCard').classList.add('active');
    document.getElementById('historyOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHistoryCard() {
    document.getElementById('historyCard').classList.remove('active');
    document.getElementById('historyOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Renders full history items — each shows order ID, customer,
// full date + time, total, payment method, confirmed badge
function renderHistoryCard() {
    const list = document.getElementById('historyCardList');
    list.innerHTML = '';

    if (historyOrders.length === 0) {
        list.innerHTML = '<p class="sidebar-empty">No confirmed orders in history yet.</p>';
        return;
    }

    historyOrders.forEach(order => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-id">#${order.orderId}</span>
                <span class="history-item-time">${order.paidAt}</span>
            </div>
            <div class="history-item-customer">Customer: ${order.customerName}</div>
            <div class="history-item-footer">
                <span class="history-item-total">PKR ${order.total}/-</span>
                <span class="history-method-tag ${order.method.toLowerCase()}">${order.method}</span>
                <span class="history-paid-badge">✓ Confirmed</span>
            </div>
        `;
        list.appendChild(div);
    });
}


// ============================================================
// HISTORY PREVIEW (summary rows on center card)
// Shows last 4 confirmed orders as a quick glance
// Clicking the card opens the full history zoom card
// DB:  Table: payments WHERE status='confirmed' AND cashier_id=?
//      ORDER BY created_at DESC LIMIT 4
// API: GET /api/payments/recent?cashierId={id}
// ============================================================

function updateHistoryPreview() {
    const list    = document.getElementById('historyPreviewList');
    const preview = historyOrders.slice(0, 4);

    if (preview.length === 0) {
        list.innerHTML = '<p class="empty-preview">No paid orders yet.</p>';
        return;
    }

    list.innerHTML = preview.map(o => `
        <div class="preview-row">
            <span class="preview-order-id">#${o.orderId}</span>
            <span class="preview-customer">${o.customerName}</span>
            <span class="preview-amount">PKR ${o.total}/-</span>
            <span class="preview-method ${o.method.toLowerCase()}">${o.method}</span>
        </div>
    `).join('');
}


// ============================================================
// PERFORMANCE UI UPDATE
// Updates stat blocks, avg pill, profile card, and chart
// Called after sendReceiptToCustomer() records a response time
// REPORT: All data exported to admin/manager dashboard
//         DB:  SELECT COUNT(*), AVG(response_time_seconds),
//              SUM(CASE WHEN response_time_seconds < 300 THEN 1 ELSE 0 END) as quick,
//              SUM(CASE WHEN response_time_seconds BETWEEN 300 AND 600 THEN 1 ELSE 0 END) as avg,
//              SUM(CASE WHEN response_time_seconds > 600 THEN 1 ELSE 0 END) as late
//              FROM payments WHERE cashier_id=?
//         API: GET /api/reports/cashier-performance?cashierId={id}
// ============================================================

function updatePerformanceUI() {
    // Update main dashboard stat blocks
    document.getElementById('quickCount').textContent = performanceData.quick;
    document.getElementById('avgCount').textContent   = performanceData.average;
    document.getElementById('lateCount').textContent  = performanceData.late;

    // Update profile card stat boxes (same data, different location)
    document.getElementById('profileQuick').textContent   = performanceData.quick;
    document.getElementById('profileAverage').textContent = performanceData.average;
    document.getElementById('profileLate').textContent    = performanceData.late;

    // Update avg response time pill (top of performance card)
    // and profile card avg time box
    if (performanceData.times.length > 0) {
        const avg = (performanceData.times.reduce((a, b) => a + b, 0) /
            performanceData.times.length).toFixed(1);
        document.getElementById('avgResponseTime').textContent = avg + ' min';
        document.getElementById('profileAvgTime').textContent  = avg + ' min';
    }

    updateResponseChart();
}


// ============================================================
// RESPONSE TIME LINE CHART
// X axis: order number (1, 2, 3...)
// Y axis: cashier response time in minutes
// Green dashed line = 5 min quick limit
// Red dashed line   = 10 min late limit
// Helps cashier see if they are getting faster or slower
//
// DB:  SELECT response_time_seconds / 60 as minutes
//      FROM payments WHERE cashier_id=?
//      ORDER BY created_at ASC
// API: GET /api/cashier/performance?cashierId={id}
// REPORT: Chart data included in admin/manager performance report
// ============================================================

function initResponseChart() {
    const ctx = document.getElementById('responseChart').getContext('2d');

    window.responseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Response Time (min)',
                    data: [],
                    borderColor: '#744D30',
                    backgroundColor: 'rgba(116,77,48,0.08)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#FFB366',
                    pointBorderColor: '#744D30',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '5 min (Quick limit)',
                    data: [],
                    borderColor: '#2e7d52',
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                },
                {
                    label: '10 min (Late limit)',
                    data: [],
                    borderColor: '#e05252',
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
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
                        font: { family: 'Poppins', size: 11 },
                        color: '#4a3728',
                        boxWidth: 20
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true, text: 'Order #',
                        font: { family: 'Poppins', size: 11 },
                        color: '#8B5E3C'
                    },
                    ticks: { color: '#4a3728', font: { size: 11 } },
                    grid: { display: false }
                },
                y: {
                    title: {
                        display: true, text: 'Minutes',
                        font: { family: 'Poppins', size: 11 },
                        color: '#8B5E3C'
                    },
                    ticks: { color: '#4a3728', font: { size: 11 } },
                    beginAtZero: true,
                    suggestedMax: 15
                }
            }
        }
    });
}

// Pushes latest response times into chart and redraws
function updateResponseChart() {
    if (!window.responseChart) return;
    const times  = performanceData.times;
    const labels = times.map((_, i) => '#' + (i + 1));

    window.responseChart.data.labels           = labels;
    window.responseChart.data.datasets[0].data = times;
    window.responseChart.data.datasets[1].data = new Array(times.length).fill(5);
    window.responseChart.data.datasets[2].data = new Array(times.length).fill(10);
    window.responseChart.update();
}


// ============================================================
// BADGES UPDATE
// Left badge  = count of pending orders (pulses when > 0)
// Right badge = count of paid orders awaiting cashier OK
// ============================================================

function updateBadges() {
    const pendingEl = document.getElementById('pendingBadge');
    const paidEl    = document.getElementById('paidBadge');

    pendingEl.textContent = pendingOrders.length;
    pendingEl.classList.toggle('has-orders', pendingOrders.length > 0);

    paidEl.textContent = awaitingConfirmationOrders.length;
    paidEl.classList.toggle('has-orders', awaitingConfirmationOrders.length > 0);
}


// ============================================================
// PROFILE CARD
// Read-only — all data managed by Admin
// Performance stats are pulled from performanceData (live)
// DB:  Table: users WHERE user_id=? AND role='cashier'
// API: GET /api/cashier/profile
// ============================================================

function openProfileCard() {
    // Populate personal info from session
    document.getElementById('profileDisplayName').textContent = currentCashier.name;
    document.getElementById('cashierEmail').textContent       = currentCashier.email;
    document.getElementById('cashierPhone').textContent       = currentCashier.phone;
    document.getElementById('cashierEmpId').textContent       = currentCashier.employeeId;
    document.getElementById('cashierSince').textContent       = currentCashier.createdAt;
    document.getElementById('cashierShift').textContent       = currentCashier.shift;

    // Sync performance stats into profile card
    updatePerformanceUI();

    document.getElementById('profileCardModal').classList.add('active');
    document.getElementById('profileOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProfileCard() {
    document.getElementById('profileCardModal').classList.remove('active');
    document.getElementById('profileOverlay').classList.remove('active');
    document.body.style.overflow = '';
}


// ============================================================
// NOTIFICATION SYSTEM
// Queued so multiple notifications show one after another
// not on top of each other
// DB:  Table: notifications (for persistent/unread alerts)
// API: GET /api/notifications/unread?userId={cashierId}
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
// LOGOUT
// Clears session and redirects to login
// API: POST /api/auth/logout
// DB:  DELETE FROM sessions WHERE user_id=?
// ============================================================

function handleLogout() {
    // TODO: Call logout API before redirecting when backend ready:
    // await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}


// ============================================================
// HELPERS
// Utility functions used across the dashboard
// ============================================================

// Strips non-numeric characters from price string e.g. "PKR 550/-" → 550
function parsePrice(priceStr) {
    return parseInt(priceStr.replace(/[^0-9]/g, ''));
}

// Calculates order subtotal from items array (before tax)
function calcSubtotal(items) {
    return items.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);
}


// ============================================================
// TESTING HELPERS — REMOVE ENTIRE BLOCK BEFORE GOING LIVE
// These simulate the real-time backend events for local testing
// In production these are replaced by:
//   → WebSocket push for new orders
//   → WebSocket push for customer payment confirmed
// ============================================================

// Adds a fake order to pending — simulates kitchen marking order ready
// REALTIME REPLACEMENT: WebSocket event 'order_ready_for_payment'
//   payload: { orderId, customerId, customerName, items, status }
function simulateReadyOrder() {
    const testOrder = {
        orderId:      'ORD-' + Date.now(),
        customerId:   1,
        customerName: 'Test Customer',
        status:       'ready_for_payment',
        items: [
            { dishName: 'Classic Burger', qty: 1, price: 'PKR 550/-' },
            { dishName: 'Cheesy Pizza',   qty: 1, price: 'PKR 700/-' }
        ],
        // Timestamp when order arrived at cashier dashboard
        // REALTIME REPLACEMENT: use created_at or status_updated_at
        // from the orders table when kitchen marks ready_for_payment
        arrivedAt: Date.now()
    };
    pendingOrders.push(testOrder);
    updateBadges();
    updatePendingSummary();
    refreshTestDropdown();
    showNotification('New order ready for payment! #' + testOrder.orderId, 'notif-payment');
}

// Simulates customer paying — triggers payment confirmed flow
// REALTIME REPLACEMENT: WebSocket event 'payment_confirmed'
//   payload: { orderId, method, paidAt }
// Usage in console: simulateCustomerPaid('ORD-xxxxx', 'Cash')
function simulateCustomerPaid(orderId, method) {
    onPaymentConfirmed(orderId, method || 'Cash', Date.now());
}

// Refreshes the test dropdown with current pending orders
function refreshTestDropdown() {
    const sel = document.getElementById('testOrderSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— select order to pay —</option>';
    pendingOrders.forEach(o => {
        const opt = document.createElement('option');
        opt.value       = o.orderId;
        opt.textContent = '#' + o.orderId + ' — ' + o.customerName;
        sel.appendChild(opt);
    });
}

// Test button handlers — trigger customer payment via dropdown
function testPayCash() {
    const id = document.getElementById('testOrderSelect').value;
    if (!id) return alert('Select an order first');
    simulateCustomerPaid(id, 'Cash');
    refreshTestDropdown();
}

function testPayCard() {
    const id = document.getElementById('testOrderSelect').value;
    if (!id) return alert('Select an order first');
    simulateCustomerPaid(id, 'Card');
    refreshTestDropdown();
}

// ============================================================
// END TESTING HELPERS
// ============================================================


// ============================================================
// PAGE INIT
// Runs on DOMContentLoaded — sets up chart, loads initial data,
// and starts real-time polling/WebSocket when backend is ready
// ============================================================

window.addEventListener('DOMContentLoaded', function () {

    // AUTH: Verify session and confirm role is 'cashier'
    // API:  GET /api/auth/session
    // If not logged in  → redirect to /login
    // If role != cashier → redirect to correct dashboard
    // TODO: Uncomment when backend ready:
    // checkSession();

    // Initialize the response time line chart (empty on load)
    initResponseChart();

    // Load pending orders from DB on page open
    // API: GET /api/orders/ready-for-payment
    // TODO: Uncomment when backend ready:
    // loadPendingOrders();

    // Load any paid orders awaiting cashier confirmation
    // API: GET /api/payments/awaiting-confirmation?cashierId={id}
    // TODO: Uncomment when backend ready:
    // loadAwaitingConfirmation();

    // Load confirmed history orders
    // API: GET /api/payments/history?cashierId={id}
    // TODO: Uncomment when backend ready:
    // loadHistory();

    // Load past performance data to populate chart + stat blocks
    // API: GET /api/cashier/performance?cashierId={id}
    // TODO: Uncomment when backend ready:
    // loadPerformance();

    // Initial render of all UI elements
    updateBadges();
    updatePendingSummary();
    updatePaidSummary();
    updateHistoryPreview();
    updatePerformanceUI();

    // REALTIME: Start polling for new ready orders every 10 seconds
    // API: GET /api/orders/ready-for-payment
    // TODO: Replace with WebSocket listener when available:
    // setInterval(loadPendingOrders, 10000);

    // REALTIME: WebSocket listener for payment confirmed events
    // TODO: Uncomment and configure when backend WebSocket is ready:
    // const ws = new WebSocket('ws://localhost:8080/ws/cashier');
    // ws.onmessage = (event) => {
    //     const data = JSON.parse(event.data);
    //     if (data.type === 'order_ready')      simulateReadyOrder(data.order);
    //     if (data.type === 'payment_confirmed') onPaymentConfirmed(data.orderId, data.method, data.paidAt);
    // };
});

// Close any open overlay/modal on Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closePendingSidebar();
        closePaidSidebar();
        closeReceipt();
        closeHistoryCard();
        closeProfileCard();
    }
});