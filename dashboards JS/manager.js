// ============================================================
// manager.js — Manager Dashboard
// ============================================================
// SEARCH TAGS:
//   DB:       → SQL Server table/query needed
//   API:      → Spring Boot REST endpoint needed
//   AUTH:     → Session/login check needed
//   REALTIME: → WebSocket or polling needed
//   REPORT:   → Data used in summary/admin reports
//   TODO:     → Uncomment or implement when backend is ready
// ============================================================


// ============================================================
// STATE
// ============================================================

// AUTH: Replace with real session
// API:  GET /api/auth/session
// DB:   Table: users WHERE role='manager'
let currentManager = {
    userId:     null,
    name:       '--',
    email:      '--',
    phone:      '--',
    employeeId: '--',
    createdAt:  '--',
    shift:      '--'
};

// Active date range filter — affects all charts
// DB:  All queries use WHERE created_at BETWEEN dateFrom AND dateTo
let activeFilter = {
    label:    'Today',
    dateFrom: getTodayStart(),
    dateTo:   getTodayEnd()
};

// Sent reports history
// DB:  Table: manager_reports WHERE manager_id=?
// API: GET /api/reports/sent-history?managerId={id}
let sentReports = [];

// Currently open zoom card id
let activeZoom = null;

// Chart instances — kept for destroy/redraw on filter change
let charts = {};


// ============================================================
// DATE HELPERS
// ============================================================

function getTodayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function getTodayEnd() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
}

// Returns { from, to } ISO strings for a preset label
function getPresetRange(preset) {
    const now  = new Date();
    let from, to;
    to = new Date(now);
    to.setHours(23, 59, 59, 999);

    if (preset === 'today') {
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
    } else if (preset === 'week') {
        from = new Date(now);
        from.setDate(now.getDate() - 6);
        from.setHours(0, 0, 0, 0);
    } else if (preset === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === 'year') {
        from = new Date(now.getFullYear(), 0, 1);
    }
    return { from: from.toISOString(), to: to.toISOString() };
}

function formatDate(isoStr) {
    return new Date(isoStr).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}


// ============================================================
// DATE RANGE FILTER
// All charts and cards reload when filter changes
// ============================================================

function setDateRange(preset, btn) {
    // Update active button style
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const range = getPresetRange(preset);
    activeFilter = {
        label:    btn.textContent.trim(),
        dateFrom: range.from,
        dateTo:   range.to
    };

    document.getElementById('filterActiveLabel').textContent = activeFilter.label;

    // Clear custom date inputs
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value   = '';

    reloadAllData();
}

function setCustomRange() {
    const from = document.getElementById('filterFrom').value;
    const to   = document.getElementById('filterTo').value;
    if (!from || !to) return;

    // Deactivate preset buttons
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));

    activeFilter = {
        label:    formatDate(from) + ' → ' + formatDate(to),
        dateFrom: new Date(from).toISOString(),
        dateTo:   new Date(to + 'T23:59:59').toISOString()
    };

    document.getElementById('filterActiveLabel').textContent = activeFilter.label;
    reloadAllData();
}

// Reloads all sections when filter changes
function reloadAllData() {
    loadSalesData();
    loadOrdersData();
    loadFeedbackData();
    loadInventoryData();
    loadEmployeeData();
    checkAlerts();
}


// ============================================================
// MOCK DATA
// All mock data below is replaced by real API calls when
// backend is connected. Each section shows exactly which
// API endpoint and DB query replaces it.
// REMOVE ALL MOCK DATA BEFORE GOING LIVE
// ============================================================

function getMockSalesData() {
    // API: GET /api/reports/sales?from={}&to={}
    // DB:  SELECT DATE(created_at) as day,
    //             SUM(total) as revenue,
    //             COUNT(*) as orders
    //      FROM payments WHERE status='confirmed'
    //      AND created_at BETWEEN ? AND ?
    //      GROUP BY DATE(created_at)
    return {
        days:      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        revenue:   [12400, 9800, 15600, 11200, 17800, 22400, 19600],
        orders:    [18, 14, 22, 16, 25, 31, 27],
        cashCount: 72,
        cardCount: 81,
        totalRevenue: 108800,
        totalOrders:  153,
        avgOrder:     711
    };
}

function getMockOrdersData() {
    // API: GET /api/reports/orders?from={}&to={}
    // DB:  SELECT dish_name, COUNT(*) as count
    //      FROM order_items oi
    //      JOIN orders o ON oi.order_id = o.order_id
    //      WHERE o.created_at BETWEEN ? AND ?
    //      GROUP BY dish_name ORDER BY count DESC
    return {
        totalOrders: 153,
        topDish:     'Classic Burger',
        dishes:      ['Classic Burger', 'Cheesy Pizza', 'Fries', 'Pasta', 'Grilled Chicken', 'Wrap'],
        counts:      [48, 35, 29, 22, 18, 11]
    };
}

function getMockFeedbackData() {
    // API: GET /api/reports/feedback?from={}&to={}
    // DB:  SELECT rating, comment, dish_name, created_at
    //      FROM feedback WHERE created_at BETWEEN ? AND ?
    //      ORDER BY created_at DESC
    // TRIGGER: Customer submits after payment confirmation
    //   notification on their dashboard
    return {
        avgRating: 4.2,
        totalCount: 87,
        distribution: { 5: 38, 4: 24, 3: 14, 2: 7, 1: 4 },
        comments: [
            { dish: 'Classic Burger', rating: 5, comment: 'Absolutely delicious, will order again!', date: '05 Jun 2026' },
            { dish: 'Cheesy Pizza',   rating: 4, comment: 'Great taste, slightly cold on delivery.', date: '05 Jun 2026' },
            { dish: 'Fries',          rating: 3, comment: '', date: '04 Jun 2026' },
            { dish: 'Pasta',          rating: 5, comment: 'Best pasta I have had in a while.', date: '04 Jun 2026' },
            { dish: 'Wrap',           rating: 2, comment: 'Not enough filling, disappointed.', date: '03 Jun 2026' },
            { dish: 'Grilled Chicken',rating: 4, comment: 'Well seasoned and juicy.', date: '03 Jun 2026' }
        ]
    };
}

function getMockInventoryData() {
    // API: GET /api/reports/inventory
    // DB:  SELECT i.ingredient_name, i.current_stock,
    //             i.minimum_threshold, i.unit
    //      FROM inventory i
    //      ORDER BY
    //        CASE WHEN current_stock <= minimum_threshold * 0.5 THEN 0
    //             WHEN current_stock <= minimum_threshold       THEN 1
    //             ELSE 2 END ASC
    return [
        { name: 'Chicken Breast',  stock: 2,   min: 10,  unit: 'kg',  status: 'critical' },
        { name: 'Cheese',          stock: 0.5, min: 3,   unit: 'kg',  status: 'critical' },
        { name: 'Burger Buns',     stock: 8,   min: 20,  unit: 'pcs', status: 'low'      },
        { name: 'Tomato Sauce',    stock: 3,   min: 6,   unit: 'L',   status: 'low'      },
        { name: 'Pasta',           stock: 12,  min: 8,   unit: 'kg',  status: 'ok'       },
        { name: 'Olive Oil',       stock: 4,   min: 2,   unit: 'L',   status: 'ok'       },
        { name: 'Lettuce',         stock: 5,   min: 4,   unit: 'kg',  status: 'ok'       },
        { name: 'Fries (Frozen)',  stock: 18,  min: 10,  unit: 'kg',  status: 'ok'       }
    ];
}

function getMockEmployeeData() {
    // API: GET /api/reports/cashier-performance?from={}&to={}
    // DB:  SELECT cashier_id, u.name,
    //             COUNT(*) as total,
    //             SUM(CASE WHEN response_time_seconds < 300 THEN 1 ELSE 0 END) as quick,
    //             SUM(CASE WHEN response_time_seconds BETWEEN 300 AND 600 THEN 1 ELSE 0 END) as average,
    //             SUM(CASE WHEN response_time_seconds > 600 THEN 1 ELSE 0 END) as late,
    //             AVG(response_time_seconds)/60 as avg_mins
    //      FROM payments p JOIN users u ON p.cashier_id=u.user_id
    //      WHERE p.created_at BETWEEN ? AND ?
    //      GROUP BY cashier_id
    //
    // API: GET /api/reports/chef-performance?from={}&to={}
    // DB:  SELECT chef_id, u.name, COUNT(*) as total_orders,
    //             oi.dish_name, COUNT(oi.dish_name) as dish_count
    //      FROM orders o
    //      JOIN users u ON o.chef_id=u.user_id
    //      JOIN order_items oi ON o.order_id=oi.order_id
    //      WHERE o.created_at BETWEEN ? AND ?
    //      GROUP BY chef_id, dish_name
    return {
        cashiers: [
            { name: 'Cashier 1', quick: 38, average: 12, late: 4, avgMins: 3.8 },
            { name: 'Cashier 2', quick: 29, average: 18, late: 9, avgMins: 5.2 }
        ],
        chefs: [
            { name: 'Chef 1', totalOrders: 89, topDish: 'Classic Burger' },
            { name: 'Chef 2', totalOrders: 64, topDish: 'Cheesy Pizza'   }
        ]
    };
}


// ============================================================
// CHART HELPER — destroys existing chart before redrawing
// Prevents Chart.js "canvas already in use" error on reload
// ============================================================

function destroyChart(key) {
    if (charts[key]) {
        charts[key].destroy();
        delete charts[key];
    }
}

// Shared chart defaults
const chartFont = { family: 'Poppins', size: 11 };
const chartTextColor = '#4a3728';


// ============================================================
// SALES DATA & CHARTS
// ============================================================

function loadSalesData() {
    // TODO: Replace mock with real API call when backend ready:
    // const data = await fetch(`/api/reports/sales?from=${activeFilter.dateFrom}&to=${activeFilter.dateTo}`)
    //                    .then(r => r.json());
    const data = getMockSalesData();

    // KPI pills
    document.getElementById('salesTotalRevenue').textContent = 'PKR ' + data.totalRevenue.toLocaleString();
    document.getElementById('salesTotalOrders').textContent  = data.totalOrders;
    document.getElementById('salesAvgOrder').textContent     = 'PKR ' + data.avgOrder;

    // Preview chart — revenue line
    destroyChart('revenuePreview');
    const ctx = document.getElementById('revenueChartPreview').getContext('2d');
    charts['revenuePreview'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.days,
            datasets: [{
                data: data.revenue,
                borderColor: '#FFB366',
                backgroundColor: 'rgba(255,179,102,0.15)',
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#FFB366',
                tension: 0.4,
                fill: true
            }]
        },
        options: salesChartOptions(false)
    });

    // Store for zoom
    window._salesData = data;
}

function renderSalesZoom() {
    const data = window._salesData;
    if (!data) return;

    document.getElementById('salesZoomBody').innerHTML = `
        <div class="zoom-kpi-row">
            <div class="zoom-kpi-box brown">
                <span class="zoom-kpi-num">PKR ${data.totalRevenue.toLocaleString()}</span>
                <span class="zoom-kpi-label">Total Revenue</span>
            </div>
            <div class="zoom-kpi-box soft">
                <span class="zoom-kpi-num">${data.totalOrders}</span>
                <span class="zoom-kpi-label">Total Orders</span>
            </div>
            <div class="zoom-kpi-box soft">
                <span class="zoom-kpi-num">PKR ${data.avgOrder}</span>
                <span class="zoom-kpi-label">Avg Order Value</span>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Revenue Trend</p>
            <div class="zoom-chart-wrapper-tall">
                <canvas id="revenueZoomChart"></canvas>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Payment Method Breakdown</p>
            <div class="zoom-chart-wrapper" style="height:160px;">
                <canvas id="paymentMethodZoomChart"></canvas>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Peak Hours</p>
            <div class="zoom-chart-wrapper">
                <canvas id="peakHoursZoomChart"></canvas>
            </div>
        </div>
    `;

    setTimeout(() => {
        // Revenue line chart (full)
        destroyChart('revenueZoom');
        charts['revenueZoom'] = new Chart(
            document.getElementById('revenueZoomChart').getContext('2d'),
            {
                type: 'line',
                data: {
                    labels: data.days,
                    datasets: [{
                        label: 'Revenue (PKR)',
                        data: data.revenue,
                        borderColor: '#744D30',
                        backgroundColor: 'rgba(116,77,48,0.08)',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointBackgroundColor: '#FFB366',
                        pointBorderColor: '#744D30',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: salesChartOptions(true)
            }
        );

        // Payment method pie
        destroyChart('paymentMethodZoom');
        charts['paymentMethodZoom'] = new Chart(
            document.getElementById('paymentMethodZoomChart').getContext('2d'),
            {
                type: 'doughnut',
                data: {
                    labels: ['Cash', 'Card'],
                    datasets: [{
                        data: [data.cashCount, data.cardCount],
                        backgroundColor: ['#2e7d52', '#1a5276'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { font: chartFont, color: chartTextColor, padding: 16 }
                        }
                    }
                }
            }
        );

        // Peak hours bar — mock hours data
        // DB: SELECT HOUR(created_at) as hr, COUNT(*) FROM payments GROUP BY hr
        const peakHours = ['9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm'];
        const peakCounts = [4, 7, 12, 18, 22, 19, 15, 11, 14, 20, 24, 16];
        destroyChart('peakHoursZoom');
        charts['peakHoursZoom'] = new Chart(
            document.getElementById('peakHoursZoomChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: peakHours,
                    datasets: [{
                        label: 'Orders',
                        data: peakCounts,
                        backgroundColor: '#FFB366',
                        borderRadius: 6
                    }]
                },
                options: barChartOptions('Orders')
            }
        );
    }, 50);
}

function salesChartOptions(showLegend) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: showLegend,
                labels: { font: chartFont, color: chartTextColor }
            }
        },
        scales: {
            x: { ticks: { color: chartTextColor, font: chartFont }, grid: { display: false } },
            y: { ticks: { color: chartTextColor, font: chartFont }, beginAtZero: true }
        }
    };
}


// ============================================================
// ORDERS DATA & CHARTS
// ============================================================

function loadOrdersData() {
    // TODO: Replace mock with API: GET /api/reports/orders?from={}&to={}
    const data = getMockOrdersData();

    document.getElementById('ordersTotalOrders').textContent = data.totalOrders;
    document.getElementById('ordersTopDish').textContent     = data.topDish;

    // Preview — horizontal bar chart of top dishes
    destroyChart('dishesPreview');
    const ctx = document.getElementById('dishesChartPreview').getContext('2d');
    charts['dishesPreview'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.dishes.slice(0, 4),
            datasets: [{
                data: data.counts.slice(0, 4),
                backgroundColor: '#744D30',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#5c3a22', font: chartFont }, grid: { display: false } },
                y: { ticks: { color: '#5c3a22', font: chartFont }, grid: { display: false } }
            }
        }
    });

    window._ordersData = data;
}

function renderOrdersZoom() {
    const data = window._ordersData;
    if (!data) return;

    document.getElementById('ordersZoomBody').innerHTML = `
        <div class="zoom-kpi-row">
            <div class="zoom-kpi-box orange">
                <span class="zoom-kpi-num">${data.totalOrders}</span>
                <span class="zoom-kpi-label">Total Orders</span>
            </div>
            <div class="zoom-kpi-box soft">
                <span class="zoom-kpi-num">${data.topDish}</span>
                <span class="zoom-kpi-label">Most Popular Dish</span>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Most Ordered Dishes</p>
            <div class="zoom-chart-wrapper-tall">
                <canvas id="dishesZoomChart"></canvas>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Orders Per Day</p>
            <div class="zoom-chart-wrapper">
                <canvas id="ordersPerDayZoomChart"></canvas>
            </div>
        </div>
    `;

    setTimeout(() => {
        destroyChart('dishesZoom');
        charts['dishesZoom'] = new Chart(
            document.getElementById('dishesZoomChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: data.dishes,
                    datasets: [{
                        label: 'Orders',
                        data: data.counts,
                        backgroundColor: ['#744D30','#8B5E3C','#9e7a5a','#b08060','#c49070','#d4a882'],
                        borderRadius: 8
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: chartTextColor, font: chartFont }, grid: { color: '#f0e4d4' } },
                        y: { ticks: { color: chartTextColor, font: chartFont }, grid: { display: false } }
                    }
                }
            }
        );

        // Orders per day line chart
        // DB: SELECT DATE(created_at) as day, COUNT(*) as cnt FROM orders GROUP BY day
        const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const cnts  = [18, 14, 22, 16, 25, 31, 27];
        destroyChart('ordersPerDayZoom');
        charts['ordersPerDayZoom'] = new Chart(
            document.getElementById('ordersPerDayZoomChart').getContext('2d'),
            {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Orders',
                        data: cnts,
                        borderColor: '#744D30',
                        backgroundColor: 'rgba(116,77,48,0.08)',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointBackgroundColor: '#FFB366',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: salesChartOptions(false)
            }
        );
    }, 50);
}


// ============================================================
// FEEDBACK DATA & CHARTS
// ============================================================

function loadFeedbackData() {
    // TODO: Replace mock with API: GET /api/reports/feedback?from={}&to={}
    const data = getMockFeedbackData();

    document.getElementById('feedbackAvgRating').textContent  = data.avgRating.toFixed(1);
    document.getElementById('feedbackTotalCount').textContent = data.totalCount;
    renderStars('feedbackStarsPreview', data.avgRating);

    // Rating distribution bar chart (preview)
    destroyChart('feedbackPreview');
    const ctx = document.getElementById('feedbackChartPreview').getContext('2d');
    charts['feedbackPreview'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1★','2★','3★','4★','5★'],
            datasets: [{
                data: [
                    data.distribution[1],
                    data.distribution[2],
                    data.distribution[3],
                    data.distribution[4],
                    data.distribution[5]
                ],
                backgroundColor: ['#f87171','#fb923c','#fbbf24','#a3e635','#4ade80'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: 'rgba(255,248,240,0.8)', font: chartFont }, grid: { display: false } },
                y: { ticks: { color: 'rgba(255,248,240,0.8)', font: chartFont }, beginAtZero: true }
            }
        }
    });

    window._feedbackData = data;
}

function renderFeedbackZoom(filterRating = 'all') {
    const data = window._feedbackData;
    if (!data) return;

    const filtered = filterRating === 'all'
        ? data.comments
        : data.comments.filter(c => c.rating === parseInt(filterRating));

    document.getElementById('feedbackZoomBody').innerHTML = `
        <div class="zoom-kpi-row">
            <div class="zoom-kpi-box brown">
                <span class="zoom-kpi-num">${data.avgRating.toFixed(1)} ★</span>
                <span class="zoom-kpi-label">Average Rating</span>
            </div>
            <div class="zoom-kpi-box soft">
                <span class="zoom-kpi-num">${data.totalCount}</span>
                <span class="zoom-kpi-label">Total Reviews</span>
            </div>
            <div class="zoom-kpi-box green">
                <span class="zoom-kpi-num">${data.distribution[5] + data.distribution[4]}</span>
                <span class="zoom-kpi-label">4★ + 5★</span>
            </div>
            <div class="zoom-kpi-box danger">
                <span class="zoom-kpi-num">${data.distribution[1] + data.distribution[2]}</span>
                <span class="zoom-kpi-label">1★ + 2★</span>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Rating Distribution</p>
            <div class="zoom-chart-wrapper">
                <canvas id="feedbackDistZoomChart"></canvas>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Customer Comments</p>
            <div class="feedback-filter-row">
                <button class="feedback-filter-btn ${filterRating === 'all' ? 'active' : ''}"
                    onclick="renderFeedbackZoom('all')">All</button>
                ${[5,4,3,2,1].map(r => `
                    <button class="feedback-filter-btn ${filterRating == r ? 'active' : ''}"
                        onclick="renderFeedbackZoom('${r}')">${r}★</button>
                `).join('')}
            </div>
            <div class="feedback-comments-list" style="margin-top:12px;">
                ${filtered.length === 0
        ? '<p class="empty-sent">No reviews for this rating.</p>'
        : filtered.map(c => `
                        <div class="feedback-comment-card">
                            <div class="feedback-comment-top">
                                <span class="feedback-comment-dish">${c.dish}</span>
                                <span class="feedback-comment-date">${c.date}</span>
                            </div>
                            <div class="feedback-comment-stars">
                                ${renderStarsHtml(c.rating)}
                            </div>
                            ${c.comment
            ? `<p class="feedback-comment-text">${c.comment}</p>`
            : `<p class="feedback-no-comment">No comment left.</p>`
        }
                        </div>
                    `).join('')
    }
            </div>
        </div>
    `;

    setTimeout(() => {
        destroyChart('feedbackDistZoom');
        charts['feedbackDistZoom'] = new Chart(
            document.getElementById('feedbackDistZoomChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: ['1★','2★','3★','4★','5★'],
                    datasets: [{
                        label: 'Reviews',
                        data: [
                            data.distribution[1],
                            data.distribution[2],
                            data.distribution[3],
                            data.distribution[4],
                            data.distribution[5]
                        ],
                        backgroundColor: ['#f87171','#fb923c','#fbbf24','#a3e635','#4ade80'],
                        borderRadius: 8
                    }]
                },
                options: barChartOptions('Reviews')
            }
        );
    }, 50);
}

// Renders star icons into an element
function renderStars(elementId, rating) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = renderStarsHtml(rating);
}

function renderStarsHtml(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating))       html += '<span class="star full">★</span>';
        else if (i - rating < 1 && i - rating > 0) html += '<span class="star half">★</span>';
        else                               html += '<span class="star empty">★</span>';
    }
    return html;
}


// ============================================================
// INVENTORY DATA & CHARTS
// ============================================================

function loadInventoryData() {
    // TODO: Replace mock with API: GET /api/reports/inventory
    const items = getMockInventoryData();

    const ok       = items.filter(i => i.status === 'ok').length;
    const low      = items.filter(i => i.status === 'low').length;
    const critical = items.filter(i => i.status === 'critical').length;

    document.getElementById('invOkCount').textContent       = ok;
    document.getElementById('invLowCount').textContent      = low;
    document.getElementById('invCriticalCount').textContent = critical;

    // Donut chart preview
    destroyChart('inventoryPreview');
    const ctx = document.getElementById('inventoryChartPreview').getContext('2d');
    charts['inventoryPreview'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['OK', 'Low', 'Critical'],
            datasets: [{
                data: [ok, low, critical],
                backgroundColor: ['#4ade80', '#fbbf24', '#f87171'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: chartFont, color: '#5c3a22', padding: 12 }
                }
            },
            cutout: '65%'
        }
    });

    window._inventoryData = items;
}

function renderInventoryZoom() {
    const items = window._inventoryData;
    if (!items) return;

    // Sort: critical first, then low, then ok
    const sorted = [...items].sort((a, b) => {
        const rank = { critical: 0, low: 1, ok: 2 };
        return rank[a.status] - rank[b.status];
    });

    const ok       = items.filter(i => i.status === 'ok').length;
    const low      = items.filter(i => i.status === 'low').length;
    const critical = items.filter(i => i.status === 'critical').length;

    document.getElementById('inventoryZoomBody').innerHTML = `
        <div class="zoom-kpi-row">
            <div class="zoom-kpi-box green">
                <span class="zoom-kpi-num">${ok}</span>
                <span class="zoom-kpi-label">OK</span>
            </div>
            <div class="zoom-kpi-box warn">
                <span class="zoom-kpi-num">${low}</span>
                <span class="zoom-kpi-label">Low Stock</span>
            </div>
            <div class="zoom-kpi-box danger">
                <span class="zoom-kpi-num">${critical}</span>
                <span class="zoom-kpi-label">Critical</span>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Stock Levels</p>
            <div class="zoom-chart-wrapper">
                <canvas id="inventoryZoomChart"></canvas>
            </div>
        </div>

        <div>
            <p class="zoom-section-title">Full Inventory</p>
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Ingredient</th>
                        <th>Stock</th>
                        <th>Minimum</th>
                        <th>Unit</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(item => `
                        <tr>
                            <td><strong>${item.name}</strong></td>
                            <td>${item.stock}</td>
                            <td>${item.min}</td>
                            <td>${item.unit}</td>
                            <td><span class="inv-status-badge inv-status-${item.status}">
                                ${item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span></td>
                            <td>
                                ${item.status !== 'ok'
        ? `<button class="flag-admin-btn" id="flag-${item.name.replace(/\s/g,'-')}"
                                           onclick="flagToAdmin('${item.name}')">
                                           Flag Admin
                                       </button>`
        : '—'
    }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    setTimeout(() => {
        // Bar chart — current stock vs minimum threshold
        destroyChart('inventoryZoom');
        charts['inventoryZoom'] = new Chart(
            document.getElementById('inventoryZoomChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: sorted.map(i => i.name),
                    datasets: [
                        {
                            label: 'Current Stock',
                            data: sorted.map(i => i.stock),
                            backgroundColor: sorted.map(i =>
                                i.status === 'critical' ? '#f87171' :
                                    i.status === 'low'      ? '#fbbf24' : '#4ade80'
                            ),
                            borderRadius: 6
                        },
                        {
                            label: 'Minimum Threshold',
                            data: sorted.map(i => i.min),
                            backgroundColor: 'rgba(116,77,48,0.2)',
                            borderColor: '#744D30',
                            borderWidth: 1.5,
                            borderRadius: 6,
                            type: 'bar'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { font: chartFont, color: chartTextColor }
                        }
                    },
                    scales: {
                        x: { ticks: { color: chartTextColor, font: { size: 10 } }, grid: { display: false } },
                        y: { ticks: { color: chartTextColor, font: chartFont }, beginAtZero: true }
                    }
                }
            }
        );
    }, 50);
}

// Flag low/critical item to Admin
// API: POST /api/notifications/send
//      Body: { role: 'admin', type: 'inventory_alert',
//              message: 'Low stock: {itemName}', managerId }
// DB:  INSERT INTO notifications (user_id=adminId, type='inventory_alert', ...)
function flagToAdmin(itemName) {
    const btnId = 'flag-' + itemName.replace(/\s/g, '-');
    const btn   = document.getElementById(btnId);
    if (btn) {
        btn.textContent = '✓ Flagged';
        btn.classList.add('flagged');
    }

    // TODO: Replace with real API call when backend ready:
    // await fetch('/api/notifications/send', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         role:      'admin',
    //         type:      'inventory_alert',
    //         message:   `Low stock alert: ${itemName} needs restocking`,
    //         managerId: currentManager.userId
    //     })
    // });
    console.log('TODO: Flag to admin — item:', itemName);

    showNotification(`Admin notified about low stock: ${itemName}`, 'notif-success');
}


// ============================================================
// EMPLOYEE DATA & CHARTS
// ============================================================

function loadEmployeeData() {
    // TODO: Replace mock with real API calls when backend ready
    const data = getMockEmployeeData();

    // Cashier overall averages (aggregate across all cashiers)
    const totalQuick   = data.cashiers.reduce((s, c) => s + c.quick,   0);
    const totalAverage = data.cashiers.reduce((s, c) => s + c.average, 0);
    const totalLate    = data.cashiers.reduce((s, c) => s + c.late,    0);
    const overallAvg   = (data.cashiers.reduce((s, c) => s + c.avgMins, 0) / data.cashiers.length).toFixed(1);

    document.getElementById('cashierAvgQuick').textContent   = totalQuick;
    document.getElementById('cashierAvgAverage').textContent = totalAverage;
    document.getElementById('cashierAvgLate').textContent    = totalLate;
    document.getElementById('cashierOverallAvgTime').textContent = overallAvg + ' min';

    // Chef overall
    const totalChefOrders = data.chefs.reduce((s, c) => s + c.totalOrders, 0);
    const topChefDish     = data.chefs.reduce((a, b) => a.totalOrders > b.totalOrders ? a : b).topDish;

    document.getElementById('chefTotalOrders').textContent = totalChefOrders;
    document.getElementById('chefTopDish').textContent     = topChefDish;

    // Cashier preview bar chart
    destroyChart('cashierPreview');
    charts['cashierPreview'] = new Chart(
        document.getElementById('cashierPreviewChart').getContext('2d'),
        {
            type: 'bar',
            data: {
                labels: data.cashiers.map(c => c.name),
                datasets: [
                    { label: 'Quick',   data: data.cashiers.map(c => c.quick),   backgroundColor: '#4ade80', borderRadius: 4 },
                    { label: 'Average', data: data.cashiers.map(c => c.average), backgroundColor: '#fbbf24', borderRadius: 4 },
                    { label: 'Late',    data: data.cashiers.map(c => c.late),    backgroundColor: '#f87171', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: chartFont, color: 'rgba(255,248,240,0.8)', boxWidth: 12 } }
                },
                scales: {
                    x: { stacked: false, ticks: { color: 'rgba(255,248,240,0.8)', font: chartFont }, grid: { display: false } },
                    y: { ticks: { color: 'rgba(255,248,240,0.8)', font: chartFont }, beginAtZero: true }
                }
            }
        }
    );

    // Chef preview bar chart
    destroyChart('chefPreview');
    charts['chefPreview'] = new Chart(
        document.getElementById('chefPreviewChart').getContext('2d'),
        {
            type: 'bar',
            data: {
                labels: data.chefs.map(c => c.name),
                datasets: [{
                    label: 'Orders Completed',
                    data: data.chefs.map(c => c.totalOrders),
                    backgroundColor: '#744D30',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#5c3a22', font: chartFont }, grid: { display: false } },
                    y: { ticks: { color: '#5c3a22', font: chartFont }, beginAtZero: true }
                }
            }
        }
    );

    window._employeeData = data;
}

function renderCashierZoom() {
    const data = window._employeeData;
    if (!data) return;

    document.getElementById('cashierZoomBody').innerHTML = `
        ${data.cashiers.map((c, i) => `
            <div style="background:#f5ede4;border-radius:14px;padding:18px 20px;border:1.5px solid #e8d5c0;">
                <p class="zoom-section-title" style="margin-bottom:12px;">${c.name}</p>
                <div class="zoom-kpi-row">
                    <div class="zoom-kpi-box green">
                        <span class="zoom-kpi-num">${c.quick}</span>
                        <span class="zoom-kpi-label">Quick (under 5 min)</span>
                    </div>
                    <div class="zoom-kpi-box warn">
                        <span class="zoom-kpi-num">${c.average}</span>
                        <span class="zoom-kpi-label">Average (5–10 min)</span>
                    </div>
                    <div class="zoom-kpi-box danger">
                        <span class="zoom-kpi-num">${c.late}</span>
                        <span class="zoom-kpi-label">Late (over 10 min)</span>
                    </div>
                    <div class="zoom-kpi-box soft">
                        <span class="zoom-kpi-num">${c.avgMins} min</span>
                        <span class="zoom-kpi-label">Avg Response Time</span>
                    </div>
                </div>
            </div>
        `).join('')}

        <div>
            <p class="zoom-section-title">Response Performance Comparison</p>
            <div class="zoom-chart-wrapper">
                <canvas id="cashierZoomChart"></canvas>
            </div>
        </div>
    `;

    setTimeout(() => {
        destroyChart('cashierZoom');
        charts['cashierZoom'] = new Chart(
            document.getElementById('cashierZoomChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: data.cashiers.map(c => c.name),
                    datasets: [
                        { label: 'Quick',   data: data.cashiers.map(c => c.quick),   backgroundColor: '#4ade80', borderRadius: 6 },
                        { label: 'Average', data: data.cashiers.map(c => c.average), backgroundColor: '#fbbf24', borderRadius: 6 },
                        { label: 'Late',    data: data.cashiers.map(c => c.late),    backgroundColor: '#f87171', borderRadius: 6 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { font: chartFont, color: chartTextColor } } },
                    scales: {
                        x: { ticks: { color: chartTextColor, font: chartFont }, grid: { display: false } },
                        y: { ticks: { color: chartTextColor, font: chartFont }, beginAtZero: true }
                    }
                }
            }
        );
    }, 50);
}

function renderChefZoom() {
    const data = window._employeeData;
    if (!data) return;

    document.getElementById('chefZoomBody').innerHTML = `
        ${data.chefs.map(c => `
            <div style="background:#f5ede4;border-radius:14px;padding:18px 20px;border:1.5px solid #e8d5c0;">
                <p class="zoom-section-title" style="margin-bottom:12px;">${c.name}</p>
                <div class="zoom-kpi-row">
                    <div class="zoom-kpi-box orange">
                        <span class="zoom-kpi-num">${c.totalOrders}</span>
                        <span class="zoom-kpi-label">Orders Completed</span>
                    </div>
                    <div class="zoom-kpi-box soft">
                        <span class="zoom-kpi-num">${c.topDish}</span>
                        <span class="zoom-kpi-label">Most Prepared Dish</span>
                    </div>
                </div>
            </div>
        `).join('')}

        <div>
            <p class="zoom-section-title">Orders Completed by Chef</p>
            <div class="zoom-chart-wrapper">
                <canvas id="chefZoomChart"></canvas>
            </div>
        </div>
    `;

    setTimeout(() => {
        destroyChart('chefZoom');
        charts['chefZoom'] = new Chart(
            document.getElementById('chefZoomChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: data.chefs.map(c => c.name),
                    datasets: [{
                        label: 'Orders Completed',
                        data: data.chefs.map(c => c.totalOrders),
                        backgroundColor: ['#744D30', '#FFB366'],
                        borderRadius: 8
                    }]
                },
                options: barChartOptions('Orders')
            }
        );
    }, 50);
}


// ============================================================
// SUMMARY REPORT — Generate, Send to Admin, Download
// DB:  Table: manager_reports
//      (report_id, manager_id, period_label, period_from,
//       period_to, report_data JSON, sent_at, created_at)
// API: POST /api/reports/send-to-admin
//      GET  /api/reports/sent-history?managerId={id}
// ============================================================

function renderSummaryZoom() {
    document.getElementById('summaryZoomBody').innerHTML = `
        <div class="summary-range-row">
            <span class="summary-range-label">Report Period</span>
            <select class="summary-range-select" id="summaryPeriodSelect">
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
                <option value="custom">Custom Range</option>
            </select>
        </div>

        <!-- Summary preview box — shows what will be sent -->
        <div class="summary-preview-box">
            <p class="summary-preview-title">Report Preview</p>
            <div class="summary-preview-row">
                <span>Total Revenue</span>
                <strong>PKR ${(window._salesData?.totalRevenue || 0).toLocaleString()}</strong>
            </div>
            <div class="summary-preview-row">
                <span>Total Orders</span>
                <strong>${window._salesData?.totalOrders || 0}</strong>
            </div>
            <div class="summary-preview-row">
                <span>Avg Order Value</span>
                <strong>PKR ${window._salesData?.avgOrder || 0}</strong>
            </div>
            <div class="summary-preview-row">
                <span>Most Popular Dish</span>
                <strong>${window._ordersData?.topDish || '--'}</strong>
            </div>
            <div class="summary-preview-row">
                <span>Avg Customer Rating</span>
                <strong>${window._feedbackData?.avgRating?.toFixed(1) || '--'} ★</strong>
            </div>
            <div class="summary-preview-row">
                <span>Critical Inventory Items</span>
                <strong>${window._inventoryData?.filter(i => i.status === 'critical').length || 0}</strong>
            </div>
            <div class="summary-preview-row">
                <span>Cashier Avg Response Time</span>
                <strong>${document.getElementById('cashierOverallAvgTime')?.textContent || '--'}</strong>
            </div>
            <div class="summary-preview-row">
                <span>Total Chef Orders</span>
                <strong>${window._employeeData?.chefs?.reduce((s,c) => s+c.totalOrders,0) || 0}</strong>
            </div>
        </div>

        <div class="summary-action-row">
            <button class="summary-send-btn" onclick="sendReportToAdmin()">
                Send to Admin
            </button>
            <button class="summary-download-btn" onclick="downloadReport()">
                Download PDF
            </button>
        </div>
    `;
}

// Send summary report to Admin
// API: POST /api/reports/send-to-admin
//      Body: { managerId, period, reportData: { sales, orders, feedback, inventory, employees } }
// DB:  INSERT INTO manager_reports (manager_id, period_label, report_data, sent_at)
//      INSERT INTO notifications (user_id=adminId, type='manager_report', message='New report from Manager', data=reportId)
function sendReportToAdmin() {
    const period = document.getElementById('summaryPeriodSelect')?.value || 'this_month';

    // TODO: Replace with real API call when backend ready:
    // await fetch('/api/reports/send-to-admin', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         managerId:  currentManager.userId,
    //         period:     period,
    //         dateFrom:   activeFilter.dateFrom,
    //         dateTo:     activeFilter.dateTo,
    //         reportData: {
    //             sales:     window._salesData,
    //             orders:    window._ordersData,
    //             feedback:  window._feedbackData,
    //             inventory: window._inventoryData,
    //             employees: window._employeeData
    //         }
    //     })
    // });
    console.log('TODO: Send report to admin — period:', period);

    // Add to local sent history
    const label = document.getElementById('summaryPeriodSelect')?.selectedOptions[0]?.text || period;
    const now   = new Date().toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
    sentReports.unshift({ period: label, sentAt: now });
    renderSentReports();

    showNotification('Summary report sent to Admin successfully.', 'notif-success');
    closeZoom();
}

// Download report as PDF
// API: GET /api/reports/download-pdf?managerId={}&period={}
// TODO: Implement PDF generation on backend (JasperReports or iText)
function downloadReport() {
    // TODO: Replace with real API download when backend ready:
    // window.open(`/api/reports/download-pdf?managerId=${currentManager.userId}&from=${activeFilter.dateFrom}&to=${activeFilter.dateTo}`);
    console.log('TODO: Download report as PDF');
    showNotification('PDF download will be available when backend is connected.', 'notif-info');
}

function renderSentReports() {
    const list = document.getElementById('sentReportsList');
    if (sentReports.length === 0) {
        list.innerHTML = '<p class="empty-sent">No reports sent yet.</p>';
        return;
    }
    list.innerHTML = sentReports.map(r => `
        <div class="sent-report-row">
            <span class="sent-report-period">${r.period}</span>
            <span class="sent-report-date">${r.sentAt}</span>
            <span class="sent-report-badge">✓ Sent to Admin</span>
        </div>
    `).join('');
}


// ============================================================
// AUTO ALERTS BAR
// Checks for: critical inventory, poor feedback, high late rate
// Shows colored chips at top of dashboard
// DB:  Aggregates from inventory, feedback, payments tables
// API: GET /api/manager/alerts
// ============================================================

function checkAlerts() {
    // TODO: Replace mock checks with real API: GET /api/manager/alerts
    const alerts = [];

    const inv = window._inventoryData || [];
    const critical = inv.filter(i => i.status === 'critical');
    const low       = inv.filter(i => i.status === 'low');

    if (critical.length > 0) {
        alerts.push({ type: 'danger', text: `${critical.length} critical inventory item${critical.length > 1 ? 's' : ''} — needs restocking` });
    }
    if (low.length > 0) {
        alerts.push({ type: 'warn', text: `${low.length} low stock item${low.length > 1 ? 's' : ''}` });
    }

    const fb = window._feedbackData;
    if (fb && fb.avgRating < 3.5) {
        alerts.push({ type: 'danger', text: `Low customer rating: ${fb.avgRating.toFixed(1)} ★` });
    }

    const emp = window._employeeData;
    if (emp) {
        emp.cashiers.forEach(c => {
            const total = c.quick + c.average + c.late;
            if (total > 0 && (c.late / total) > 0.3) {
                alerts.push({ type: 'warn', text: `${c.name} has ${Math.round(c.late/total*100)}% late responses` });
            }
        });
    }

    const alertBar = document.getElementById('alertBar');
    if (alerts.length === 0) {
        alertBar.style.display = 'none';
        return;
    }

    document.getElementById('alertBarInner').innerHTML = alerts.map(a => `
        <div class="alert-chip ${a.type}">
            <span class="alert-chip-dot"></span>
            ${a.text}
        </div>
    `).join('');

    alertBar.style.display = 'flex';
}

function closeAlertBar() {
    document.getElementById('alertBar').style.display = 'none';
}


// ============================================================
// ZOOM CARD OPEN / CLOSE
// ============================================================

function openZoom(zoomId) {
    // Close any open zoom first
    if (activeZoom) closeZoom();

    activeZoom = zoomId;
    document.getElementById('zoomOverlay').classList.add('active');
    document.getElementById(zoomId).classList.add('active');
    document.body.style.overflow = 'hidden';

    // Render zoom body content
    if (zoomId === 'salesZoom')     renderSalesZoom();
    if (zoomId === 'ordersZoom')    renderOrdersZoom();
    if (zoomId === 'feedbackZoom')  renderFeedbackZoom();
    if (zoomId === 'inventoryZoom') renderInventoryZoom();
    if (zoomId === 'cashierZoom')   renderCashierZoom();
    if (zoomId === 'chefZoom')      renderChefZoom();
    if (zoomId === 'summaryZoom')   renderSummaryZoom();
}

function closeZoom() {
    if (!activeZoom) return;
    document.getElementById('zoomOverlay').classList.remove('active');
    document.getElementById(activeZoom).classList.remove('active');
    document.body.style.overflow = '';
    activeZoom = null;
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
// PROFILE CARD
// ============================================================

function openProfileCard() {
    document.getElementById('profileDisplayName').textContent = currentManager.name;
    document.getElementById('managerEmail').textContent       = currentManager.email;
    document.getElementById('managerPhone').textContent       = currentManager.phone;
    document.getElementById('managerEmpId').textContent       = currentManager.employeeId;
    document.getElementById('managerSince').textContent       = currentManager.createdAt;
    document.getElementById('managerShift').textContent       = currentManager.shift;

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
// LOGOUT
// API: POST /api/auth/logout
// ============================================================

function handleLogout() {
    // TODO: await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}


// ============================================================
// HELPERS
// ============================================================

function barChartOptions(yLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: { ticks: { color: chartTextColor, font: chartFont }, grid: { display: false } },
            y: {
                ticks: { color: chartTextColor, font: chartFont },
                beginAtZero: true,
                title: { display: !!yLabel, text: yLabel, color: '#8B5E3C', font: chartFont }
            }
        }
    };
}


// ============================================================
// PAGE INIT
// ============================================================

window.addEventListener('DOMContentLoaded', function () {

    // AUTH: Verify session + check role is 'manager'
    // API:  GET /api/auth/session
    // If not logged in  → /login
    // If role != manager → redirect to correct dashboard
    // TODO: Uncomment when backend ready:
    // checkSession();

    // Set default date inputs to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterFrom').value = today;
    document.getElementById('filterTo').value   = today;

    // Load all sections
    loadSalesData();
    loadOrdersData();
    loadFeedbackData();
    loadInventoryData();
    loadEmployeeData();

    // Load sent reports history
    // API: GET /api/reports/sent-history?managerId={id}
    // TODO: Uncomment when backend ready:
    // loadSentReports();
    renderSentReports();

    // Check and show alert bar
    checkAlerts();

    // REALTIME: Poll for new data every 60 seconds
    // TODO: Replace with WebSocket when available:
    // setInterval(reloadAllData, 60000);
});

// Close zoom on Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeZoom();
        closeProfileCard();
    }
});