// menu.js – Dynamic Menu for Website

let quantity = 0;

// Helper: escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Fetch and render menu
async function loadMenu() {
    try {
        const res = await fetch('/api/public/menu');
        if (!res.ok) throw new Error('Failed to load menu');
        const dishes = await res.json();
        const mainDishes = dishes.filter(d => d.category === 'menu');
        const dessertDishes = dishes.filter(d => d.category === 'dessert');
        renderMenuGrid(mainDishes, 'mainMenuGrid');
        renderMenuGrid(dessertDishes, 'dessertMenuGrid');
    } catch (err) {
        console.error(err);
        document.getElementById('mainMenuGrid').innerHTML = '<div class="menu-item">Unable to load menu.</div>';
    }
}

function renderMenuGrid(dishes, gridId) {
    const container = document.getElementById(gridId);
    if (!container) return;
    if (!dishes.length) {
        container.innerHTML = '<div class="menu-item">No dishes available.</div>';
        return;
    }
    container.innerHTML = dishes.map(dish => `
        <div class="menu-item" onclick="openModal('${dish.imagePath || '/images/placeholder.png'}', '${escapeHtml(dish.name)}', 'PKR ${dish.price}/-', '${escapeHtml(dish.description)}')">
            <div class="menu-plate-wrapper">
                <img src="${dish.imagePath || '/images/placeholder.png'}" alt="${escapeHtml(dish.name)}" class="menu-plate-img" onerror="this.src='/images/placeholder.png'">
            </div>
            <p class="menu-item-name">${escapeHtml(dish.name)}</p>
        </div>
    `).join('');
}

// Modal functions (unchanged)
function openModal(imgSrc, name, price, description) {
    quantity = 0;
    document.getElementById('counterValue').textContent = 0;
    document.getElementById('modalImage').src = imgSrc;
    document.getElementById('modalName').textContent = name;
    document.getElementById('modalPrice').textContent = price;
    document.getElementById('modalDesc').textContent = description;
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('modalCard').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modalCard').classList.remove('active');
    document.body.style.overflow = '';
}

function changeQty(amount) {
    quantity += amount;
    if (quantity < 0) quantity = 0;
    document.getElementById('counterValue').textContent = quantity;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Load menu when page loads
document.addEventListener('DOMContentLoaded', loadMenu);