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

    // 3. Initialize Dynamic Shuffling Showcase Carousel
    initShowcaseCarousel();

    // 4. Initialize Featured Products Grid with Modal & Customizer hooks
    initFeaturedProducts();

    // 5. Initialize Newsletter Form if present
    initNewsletterForm();

    console.log('Mrymify: Homepage initialized successfully.');
});

/**
 * Initializes the Featured Products Grid dynamically
 */
function initFeaturedProducts() {
    const grid = document.querySelector('#featured-products-section .featured-products-grid');
    if (!grid || !window.MrymifyProducts) return;
    const featured = window.MrymifyProducts.getFeatured();
    if (featured && featured.length > 0) {
        grid.innerHTML = featured.map(p => window.MrymifyProducts.createProductCardHtml(p)).join('');
    }
}

/**
 * Dynamic Shuffling Showcase Carousel with Hold-to-Stop & Touch Swipe
 */
function initShowcaseCarousel() {
    const mount = document.getElementById('hero-showcase-mount');
    if (!mount) return;

    // Load configuration or fall back to signature best-sellers
    let config = {
        productIds: ['prod-09', 'prod-01', 'prod-07', 'prod-15', 'prod-02'],
        interval: 4200,
        autoShuffle: true
    };
    try {
        const stored = JSON.parse(localStorage.getItem('mrymify_showcase_config') || '{}');
        if (stored.productIds && Array.isArray(stored.productIds) && stored.productIds.length > 0) {
            config.productIds = stored.productIds;
        }
        if (stored.interval) config.interval = Number(stored.interval);
        if (stored.autoShuffle !== undefined) config.autoShuffle = Boolean(stored.autoShuffle);
    } catch(e) {}

    const catalog = (window.MrymifyProducts && window.MrymifyProducts.catalog) || [];
    const products = config.productIds.map(id => catalog.find(p => p.id === id)).filter(Boolean);

    if (products.length === 0) return;

    let currentIndex = 0;
    let shuffleTimer = null;
    let isPaused = false;

    // Build Carousel HTML
    const trackHtml = `
        <div class="showcase-track" id="showcase-track">
            ${products.map(prod => {
                const liked = window.MrymifyProducts.isUserLiked(prod.id);
                const likesCount = window.MrymifyProducts.getProductLikes(prod.id);
                const showLikes = window.MrymifyProducts.isLikeCountVisible ? window.MrymifyProducts.isLikeCountVisible() : true;
                return `
                    <div class="showcase-card-slide" style="min-width: 100%; box-sizing: border-box; cursor: pointer;" onclick="MrymifyProducts.handleCardClick('${prod.id}', event)">
                        <div style="background-color: var(--color-surface); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm); width: 100%;">
                            <div class="showcase-image-frame" style="border-radius: var(--radius-md); margin-bottom: 1.25rem; height: 320px; overflow: hidden; position: relative;">
                                <img 
                                    src="${prod.image}" 
                                    alt="${prod.title}" 
                                    class="showcase-image" 
                                    style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
                                />
                                <div class="showcase-price-floating" style="position: absolute; bottom: 8px; right: 8px; font-size: 0.9rem; background: rgba(0,0,0,0.75); color: #ffffff; padding: 0.3rem 0.75rem; border-radius: 9999px; font-weight: 700;">
                                    ${window.MrymifyProducts.formatPrice(prod.price)}
                                </div>
                            </div>
                            <div class="showcase-content" style="padding: 0;">
                                <h3 class="showcase-title" style="font-size: 1.15rem; margin-bottom: 0.25rem; color: var(--color-text-main);">${prod.title}</h3>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
                                    <span class="showcase-category" style="margin: 0; font-size: 0.85rem; color: var(--color-primary); font-weight: 600;">${prod.categoryLabel || prod.category}</span>
                                    <span class="showcase-rating" style="font-size: 0.82rem; color: #f59e0b; font-weight: 700;">★ 5.0 (Artisan Verified)</span>
                                </div>
                                <div class="showcase-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                                    <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="MrymifyProducts.handleAddToCart('${prod.id}')">
                                        Add to Cart
                                    </button>
                                    <button class="btn btn-outline btn-sm btn-customize" data-customize-btn="${prod.id}" onclick="MrymifyProducts.handleCustomize('${prod.id}', event)" title="Customize piece">
                                        <svg class="edit-pencil-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                    </button>
                                    <button class="btn btn-outline btn-sm btn-like ${liked ? 'liked' : ''}" data-like-btn="${prod.id}" onclick="MrymifyProducts.handleLike('${prod.id}', event)" title="Like piece">
                                        <span class="heart-icon">${liked ? '❤️' : '🤍'}</span>
                                        ${showLikes ? `<span class="like-count">${likesCount}</span>` : ''}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    mount.innerHTML = trackHtml;

    // Render Dots
    const dotsContainer = document.getElementById('showcase-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = products.map((_, i) => `
            <button type="button" class="showcase-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Go to showcase product ${i + 1}"></button>
        `).join('');

        dotsContainer.querySelectorAll('.showcase-dot').forEach(dot => {
            dot.addEventListener('click', function () {
                goToSlide(Number(this.getAttribute('data-index')));
            });
        });
    }

    const track = document.getElementById('showcase-track');

    function updateTrack() {
        if (!track) return;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        if (dotsContainer) {
            dotsContainer.querySelectorAll('.showcase-dot').forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentIndex);
            });
        }
    }

    function goToSlide(index) {
        currentIndex = (index + products.length) % products.length;
        updateTrack();
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    // Previous / Next Buttons
    const prevBtn = document.getElementById('showcase-prev-btn');
    const nextBtn = document.getElementById('showcase-next-btn');
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Auto Shuffling Timer
    function startShuffleTimer() {
        if (!config.autoShuffle || products.length <= 1) return;
        clearInterval(shuffleTimer);
        shuffleTimer = setInterval(() => {
            if (!isPaused) {
                nextSlide();
            }
        }, config.interval);
    }

    startShuffleTimer();

    // Hold-to-Stop & Pause Handlers
    const cardWrap = document.getElementById('hero-showcase-card') || mount;
    cardWrap.addEventListener('mouseenter', () => { isPaused = true; });
    cardWrap.addEventListener('mouseleave', () => { isPaused = false; });

    // Touch Swipe Gestures
    let touchStartX = 0;
    let touchEndX = 0;

    cardWrap.addEventListener('touchstart', (e) => {
        isPaused = true;
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    cardWrap.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        isPaused = false;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        if (Math.abs(deltaX) > 45) {
            if (deltaX < 0) {
                nextSlide(); // Swiped left -> Next
            } else {
                prevSlide(); // Swiped right -> Prev
            }
        }
    }
}

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