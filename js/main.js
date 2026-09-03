/**
 * Mrymify - Main Application Bootstrap
 * Initializes global shell, components, and homepage newsletter interactions.
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Initialize Shared Navigation Component
    if (window.MrymifyNavbar && typeof window.MrymifyNavbar.render === 'function') {
        window.MrymifyNavbar.render('home');
    }

    // 2. Initialize Shared Footer Component
    if (window.MrymifyFooter && typeof window.MrymifyFooter.render === 'function') {
        window.MrymifyFooter.render();
    }

    // 3. Initialize Newsletter Form if present
    initNewsletterForm();

    console.log('Mrymify: Homepage initialized successfully.');
});

/**
 * Handles client-side email subscription storage
 */
function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    const msg = document.getElementById('newsletter-msg');
    const input = document.getElementById('newsletter-email');

    if (!form || !msg || !input) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = input.value.trim();
        if (!email) return;

        try {
            const subscribers = JSON.parse(localStorage.getItem('mrymify_subscribers') || '[]');
            if (!subscribers.includes(email)) {
                subscribers.push(email);
                localStorage.setItem('mrymify_subscribers', JSON.stringify(subscribers));
            }
        } catch (err) {
            console.warn('Could not save subscriber', err);
        }

        input.value = '';
        msg.style.display = 'block';
        setTimeout(() => {
            msg.style.display = 'none';
        }, 5000);
    });
}

/**
 * Filter Selection for Tabbed Gallery on Homepage
 */
window.filterSelection = function(category) {
    const items = document.getElementsByClassName("gallery-item");
    if (category === "all") category = "";
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("show");
        if (items[i].className.indexOf(category) > -1) {
            items[i].classList.add("show");
        }
    }
    
    // Update active button styling
    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove("active");
    }
    
    // If event exists, set currentTarget as active
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add("active");
    }
};

/**
 * Secret Admin Shortcut: Ctrl + Shift + A (or Cmd + Shift + A)
 * Allows Mariyam & the boutique team to instantly open the management console from any page.
 */
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        window.location.href = 'admin.html';
    }
});