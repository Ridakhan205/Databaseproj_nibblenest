// feedback.js

let selectedRating = 0;

// Star rating logic (unchanged)
const stars = document.querySelectorAll('.star');
stars.forEach(star => {
    star.addEventListener('mouseover', function () {
        const val = parseInt(this.dataset.value);
        stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= val));
    });
    star.addEventListener('mouseleave', function () {
        stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= selectedRating));
    });
    star.addEventListener('click', function () {
        selectedRating = parseInt(this.dataset.value);
        stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= selectedRating));
    });
});

// Submit handler using real API
async function handleFeedback() {
    const name = document.getElementById('feedbackName').value.trim();
    const email = document.getElementById('feedbackEmail').value.trim();
    const feedbackText = document.getElementById('feedbackText').value.trim();
    const rating = selectedRating;

    if (!name) { alert('Please enter your full name.'); return; }
    if (!email) { alert('Please enter your email.'); return; }
    if (!feedbackText) { alert('Please write your feedback.'); return; }
    if (rating === 0) { alert('Please rate us before submitting.'); return; }

    try {
        const response = await fetch('/api/feedback/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, feedback: feedbackText, rating })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }
        const result = await response.json();
        alert(result.message || 'Thank you for your feedback!');
        // Reset form
        document.getElementById('feedbackName').value = '';
        document.getElementById('feedbackEmail').value = '';
        document.getElementById('feedbackText').value = '';
        selectedRating = 0;
        stars.forEach(s => s.classList.remove('active'));
    } catch (err) {
        console.error(err);
        alert('Failed to submit feedback. Please try again later.');
    }
}