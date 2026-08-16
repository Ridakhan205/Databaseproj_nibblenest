// signup.js

// Add this helper at the top of signup.js
function isValidPhone(phone) {
    const cleaned = phone.replace(/[\s\-]/g, '');
    const phoneRegex = /^(03\d{9}|92\d{10})$/;
    return phoneRegex.test(cleaned);
}

function handleSignup() {
    const name = document.getElementById('nameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;

    // Validation
    if (!name || !email || !phone || !password) {
        alert("Please fill all fields.");
        return;
    }
    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    // Inside handleSignup(), after checking password length:
    if (!isValidPhone(phone)) {
        alert("Please enter a valid phone number (10 digits, starting with 6-9).");
        return;
    }

    // Signup request
    fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            email,
            phone,
            password
        })
    })
        .then(res => res.text())
        .then(response => {
            if (response === "success") {
                // Auto-login as customer (workflow requirement)
                return fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
            } else if (response === "email_taken") {
                alert("Email already registered. Please login.");
                return null;
            } else {
                alert("Signup failed. Please try again.");
                return null;
            }
        })
        .then(loginRes => {
            if (loginRes && loginRes.ok) {
                return loginRes.text();
            } else if (loginRes && !loginRes.ok) {
                // Fallback: redirect to login page
                window.location.href = "/login?signup=success";
                return null;
            }
            return null;
        })
        .then(role => {
            if (role) {
                const roleStr = role.trim().toLowerCase();
                if (roleStr === "customer") {
                    window.location.href = "/customer/dashboard";
                } else {
                    // Should never happen for signup, but fallback
                    window.location.href = "/login?signup=success";
                }
            }
        })
        .catch(err => {
            console.error("Signup error:", err);
            alert("Server error. Please try again later.");
        });
}