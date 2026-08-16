// login.js
console.log("LOGIN JS LOADED");

// ===== LOGIN HANDLER =====
function handleLogin() {
    console.log("🔵 handleLogin STARTED");

    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const selectedRole = document.getElementById('roleSelect').value;

    if (!email) {
        alert('Please enter your email.');
        return;
    }
    if (!password) {
        alert('Please enter your password.');
        return;
    }
    if (!selectedRole) {
        alert('Please select your role.');
        return;
    }

    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Network error");
            }
            return res.text();
        })
        .then(responseRole => {
            const role = responseRole.trim().toLowerCase();
            console.log("LOGIN RESPONSE:", role);

            // Handle error responses
            if (role === "invalid") {
                alert("Invalid email or password.");
                return;
            }
            if (role === "inactive") {
                alert("Your account is inactive. Please contact admin.");
                return;
            }

            // Compare selected role with actual role from backend
            if (role !== selectedRole) {
                alert(`Selected role (${selectedRole}) does not match account role (${role}).`);
                return;
            }

            // Redirect based on role
            switch (role) {
                case "customer":
                    window.location.href = "/customer/dashboard";
                    break;
                case "chef":
                    window.location.href = "/chef/dashboard";
                    break;
                case "cashier":
                    window.location.href = "/cashier/dashboard";
                    break;
                case "manager":
                    window.location.href = "/manager/dashboard";
                    break;
                case "admin":
                    window.location.href = "/admin/dashboard";
                    break;
                default:
                    alert("Unknown role: " + role);
            }
        })
        .catch(err => {
            console.error("Login error:", err);
            alert("Server error. Try again.");
        });
}

window.addEventListener('DOMContentLoaded', function () {
    // Cart-triggered login: hide role field if URL contains ?role=customer
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const roleGroup = document.getElementById('roleGroup');
    const roleSelect = document.getElementById('roleSelect');

    if (roleParam === 'customer') {
        if (roleSelect) roleSelect.value = 'customer';
        if (roleGroup) roleGroup.style.display = 'none';
    }

    // Optional: Add change listener for role select hint (cosmetic)
    if (roleSelect) {
        roleSelect.addEventListener('change', function () {
            if (this.value) this.classList.add('selected');
        });
    }
});

