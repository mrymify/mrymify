/**
 * Mrymify - Product Details Page Controller (js/product-details.js)
 * Full-screen product experience: auto-shuffling interactive gallery, deep craft specs,
 * interactive reviews system, live dwell-time tracking, and recommended products.
 */

(function () {
    'use strict';

    const WHATSAPP_PHONE = '923000896885';
    let currentProduct = null;
    let galleryImages = [];
    let currentSlide = 0;
    let shuffleTimer = null;
    let isPaused = false;
    let quantity = 1;
    let pageDwellStart = Date.now();

    document.addEventListener('DOMContentLoaded', function () {
        // 1. Initialize Navbar & Footer
        if (window.MrymifyNavbar && typeof window.MrymifyNavbar.render === 'function') {
            window.MrymifyNavbar.render('shop');
        }
        if (window.MrymifyFooter && typeof window.MrymifyFooter.render === 'function') {
            window.MrymifyFooter.render();
        }

        // 2. Load Product from Query String
        initProductPage();
    });

    /**
     * Loads product details based on ?id= query param
     */
    function initProductPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        const catalog = (window.MrymifyProducts && window.MrymifyProducts.catalog) || [];
        currentProduct = catalog.find(p => p.id === productId);

        // Fallback to first product if invalid ID
        if (!currentProduct && catalog.length > 0) {
            currentProduct = catalog[0];
        }

        if (!currentProduct) {
            console.error('No product catalog available.');
            return;
        }

        // Update Page Title
        document.title = `${currentProduct.title} | Mrymify Boutique`;

        // 3. Analytics Impression & Dwell Tracker
        if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackProductView === 'function') {
            window.MrymifyAnalytics.trackProductView(currentProduct.id, currentProduct.title);
        }
        setupDwellTracker(currentProduct.id);

        // 4. Populate Page Fields
        renderBreadcrumbs();
        renderProductDetails();
        initGallery();
        initQuantityAndActions();
        initReviewsSection();
        renderRecommendedProducts();
    }

    let currentDwellTracker = null;

    /**
     * Dwell Time Tracker on navigation away or choosing another piece
     */
    function setupDwellTracker(productId) {
        pageDwellStart = Date.now();
        let dwellRecorded = false;

        const sendDwell = () => {
            if (dwellRecorded) return;
            const elapsed = (Date.now() - pageDwellStart) / 1000;
            if (elapsed >= 1 && window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackProductDwellTime === 'function') {
                dwellRecorded = true;
                window.MrymifyAnalytics.trackProductDwellTime(productId, elapsed, currentProduct ? currentProduct.title : productId);
            }
        };

        currentDwellTracker = sendDwell;

        window.addEventListener('beforeunload', sendDwell);
        window.addEventListener('pagehide', sendDwell);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') sendDwell();
        });
    }

    /**
     * Renders breadcrumb trail
     */
    function renderBreadcrumbs() {
        const catEl = document.getElementById('breadcrumb-category');
        const titleEl = document.getElementById('breadcrumb-title');

        if (catEl) {
            catEl.textContent = currentProduct.categoryLabel || currentProduct.category;
            catEl.href = `shop.html?category=${encodeURIComponent(currentProduct.category)}`;
        }
        if (titleEl) {
            titleEl.textContent = currentProduct.title;
        }
    }

    /**
     * Renders title, price, badges, description, WhatsApp link
     */
    function renderProductDetails() {
        const p = currentProduct;

        // Category & Badges
        const catBadge = document.getElementById('detail-category-badge');
        const discBadge = document.getElementById('detail-discount-badge');
        const makingTimeEl = document.getElementById('detail-making-time-badge');
        const titleEl = document.getElementById('detail-product-title');
        const currentPriceEl = document.getElementById('detail-current-price');
        const origPriceEl = document.getElementById('detail-original-price');
        const descEl = document.getElementById('detail-description');
        const waBtn = document.getElementById('btn-wa-direct-order');

        if (catBadge) catBadge.textContent = p.categoryLabel || p.category;
        if (makingTimeEl) makingTimeEl.textContent = `⏳ Ready in ${p.estimatedMakingTime || '2-3 Business Days'}`;
        if (titleEl) titleEl.textContent = p.title;

        // Pricing
        const formatPrice = window.MrymifyProducts.formatPrice || (pr => `Rs. ${Number(pr).toLocaleString('en-PK')}`);
        if (currentPriceEl) currentPriceEl.textContent = formatPrice(p.price);

        if (p.originalPrice && p.originalPrice > p.price) {
            if (origPriceEl) {
                origPriceEl.textContent = formatPrice(p.originalPrice);
                origPriceEl.style.display = 'inline-block';
            }
            if (discBadge) {
                discBadge.textContent = `Save Rs. ${(p.originalPrice - p.price).toLocaleString('en-PK')}`;
                discBadge.style.display = 'inline-block';
            }
        } else {
            if (origPriceEl) origPriceEl.style.display = 'none';
            if (discBadge) discBadge.style.display = 'none';
        }

        if (descEl) descEl.textContent = p.description;

        // WhatsApp Direct Link
        if (waBtn) {
            const msg = encodeURIComponent(`Hi Mariyam! I fell in love with the "${p.title}" (${formatPrice(p.price)}) on your Mrymify website. I would love to place an order for this piece!`);
            waBtn.href = `https://wa.me/${WHATSAPP_PHONE}?text=${msg}`;
        }

        // Like Button State
        updateLikeButtonState();
    }

    /**
     * Auto-shuffling interactive gallery
     */
    let isGalleryInViewport = true;
    let isPageFocused = true;

    function initGallery() {
        // Collect gallery images: ONLY use current product's images (never inject other products)
        if (Array.isArray(currentProduct.galleryImages) && currentProduct.galleryImages.length > 0) {
            galleryImages = [currentProduct.image, ...currentProduct.galleryImages.filter(img => img && img !== currentProduct.image)];
        } else {
            // Keep the single product image constant
            galleryImages = [currentProduct.image];
        }
        // Deduplicate
        galleryImages = [...new Set(galleryImages.filter(Boolean))];

        currentSlide = 0;

        const mainImg = document.getElementById('gallery-main-img');
        const viewport = document.getElementById('gallery-viewport');
        const strip = document.getElementById('gallery-thumbnails-strip');
        const prevBtn = document.getElementById('gallery-prev-btn');
        const nextBtn = document.getElementById('gallery-next-btn');
        const frame = document.getElementById('product-gallery-frame');

        if (mainImg && galleryImages[0]) {
            mainImg.src = galleryImages[0];
            mainImg.alt = currentProduct.title;
        }

        // Setup Lightbox Preview on Click
        if (viewport) {
            viewport.onclick = () => {
                openLightbox(galleryImages[currentSlide]);
            };
        }

        // Render Thumbnails only if multiple images exist
        if (strip) {
            if (galleryImages.length > 1) {
                strip.innerHTML = galleryImages.map((src, idx) => `
                    <button type="button" class="gallery-thumb-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="View photo ${idx + 1}">
                        <img src="${src}" alt="${currentProduct.title} thumbnail ${idx + 1}" />
                    </button>
                `).join('');

                const thumbBtns = strip.querySelectorAll('.gallery-thumb-btn');
                thumbBtns.forEach(btn => {
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const idx = parseInt(this.getAttribute('data-index'), 10);
                        goToSlide(idx);
                    });
                });
                strip.style.display = 'flex';
            } else {
                strip.style.display = 'none';
            }
        }

        // Prev & Next Buttons
        if (prevBtn) {
            prevBtn.style.display = galleryImages.length > 1 ? 'flex' : 'none';
            prevBtn.onclick = (e) => {
                e.stopPropagation();
                const prev = (currentSlide - 1 + galleryImages.length) % galleryImages.length;
                goToSlide(prev);
            };
        }
        if (nextBtn) {
            nextBtn.style.display = galleryImages.length > 1 ? 'flex' : 'none';
            nextBtn.onclick = (e) => {
                e.stopPropagation();
                const next = (currentSlide + 1) % galleryImages.length;
                goToSlide(next);
            };
        }

        // Pause timer on hover / touch
        if (frame) {
            frame.addEventListener('mouseenter', () => { isPaused = true; });
            frame.addEventListener('mouseleave', () => { isPaused = false; });
            frame.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
            frame.addEventListener('touchend', () => { isPaused = false; });

            // Pause auto-shuffle when user scrolls down past the gallery
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        isGalleryInViewport = entry.isIntersecting;
                    });
                }, { threshold: 0.15 });
                observer.observe(frame);
            }
        }

        // Pause when tab/window loses focus
        window.addEventListener('blur', () => { isPageFocused = false; });
        window.addEventListener('focus', () => { isPageFocused = true; });
        document.addEventListener('visibilitychange', () => {
            isPageFocused = (document.visibilityState === 'visible');
        });

        // Start Auto-Shuffle timer ONLY if more than 1 image exists
        clearInterval(shuffleTimer);
        const timerBadge = document.getElementById('gallery-floating-timer');
        if (galleryImages.length > 1) {
            if (timerBadge) timerBadge.style.display = 'inline-flex';
            shuffleTimer = setInterval(() => {
                // Pause when hovered, scrolled away, or tab inactive
                if (!isPaused && isGalleryInViewport && isPageFocused) {
                    const next = (currentSlide + 1) % galleryImages.length;
                    goToSlide(next);
                }
            }, 4000);
        } else {
            // Keep image constant with no timer
            if (timerBadge) timerBadge.style.display = 'none';
        }

        initLightboxModal();
    }

    function goToSlide(index) {
        if (!galleryImages[index]) return;
        currentSlide = index;

        const mainImg = document.getElementById('gallery-main-img');
        if (mainImg) {
            mainImg.style.opacity = '0.4';
            mainImg.style.transform = 'scale(0.98)';
            setTimeout(() => {
                mainImg.src = galleryImages[index];
                mainImg.style.opacity = '1';
                mainImg.style.transform = 'scale(1)';
            }, 160);
        }

        // Update Thumbnails Active Class without window scroll jumps
        const strip = document.getElementById('gallery-thumbnails-strip');
        const thumbBtns = document.querySelectorAll('.gallery-thumb-btn');
        thumbBtns.forEach((btn, idx) => {
            if (idx === index) {
                btn.classList.add('active');
                // Scroll thumbnail container horizontally without shooting the whole page!
                if (strip) {
                    const btnLeft = btn.offsetLeft;
                    strip.scrollTo({
                        left: btnLeft - (strip.clientWidth / 2) + (btn.clientWidth / 2),
                        behavior: 'smooth'
                    });
                }
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Full-Screen Lightbox Preview System
     */
    function initLightboxModal() {
        const modal = document.getElementById('product-lightbox-modal');
        const closeBtn = document.getElementById('lightbox-close-btn');
        const backdrop = document.getElementById('lightbox-backdrop');

        if (!modal) return;

        const closeModal = () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (backdrop) backdrop.onclick = closeModal;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });
    }

    function openLightbox(imgSrc) {
        if (!imgSrc) return;
        const modal = document.getElementById('product-lightbox-modal');
        const img = document.getElementById('lightbox-img');
        const caption = document.getElementById('lightbox-caption');

        if (!modal || !img) return;

        img.src = imgSrc;
        img.alt = currentProduct ? currentProduct.title : 'Crochet Piece';
        if (caption) {
            caption.textContent = `${currentProduct ? currentProduct.title : ''} • Image ${currentSlide + 1} of ${galleryImages.length}`;
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    /**
     * Quantity picker and action button listeners
     */
    function initQuantityAndActions() {
        const minusBtn = document.getElementById('btn-qty-minus');
        const plusBtn = document.getElementById('btn-qty-plus');
        const qtyDisplay = document.getElementById('detail-qty-display');
        const addCartBtn = document.getElementById('btn-add-to-cart-detail');
        const customBtn = document.getElementById('btn-customize-detail');
        const likeBtn = document.getElementById('btn-like-detail');

        quantity = 1;

        if (minusBtn) {
            minusBtn.onclick = () => {
                if (quantity > 1) {
                    quantity--;
                    if (qtyDisplay) qtyDisplay.textContent = quantity;
                }
            };
        }

        if (plusBtn) {
            plusBtn.onclick = () => {
                if (quantity < 10) {
                    quantity++;
                    if (qtyDisplay) qtyDisplay.textContent = quantity;
                }
            };
        }

        // Add to Cart with selected quantity
        if (addCartBtn) {
            addCartBtn.onclick = () => {
                for (let i = 0; i < quantity; i++) {
                    window.MrymifyProducts.handleAddToCart(currentProduct.id);
                }
            };
        }

        // Customize Piece Shortcut
        if (customBtn) {
            customBtn.onclick = (e) => {
                window.MrymifyProducts.handleCustomize(currentProduct.id, e);
            };
        }

        // Like Button
        if (likeBtn) {
            likeBtn.onclick = (e) => {
                window.MrymifyProducts.handleLike(currentProduct.id, e);
                updateLikeButtonState();
            };
        }
    }

    function updateLikeButtonState() {
        const likeBtn = document.getElementById('btn-like-detail');
        const heartIcon = document.getElementById('detail-like-icon');
        const likeCountEl = document.getElementById('detail-like-count');

        if (!likeBtn || !currentProduct) return;

        const liked = window.MrymifyProducts.isUserLiked(currentProduct.id);
        const count = window.MrymifyProducts.getProductLikes(currentProduct.id);
        const showLikes = window.MrymifyProducts.isLikeCountVisible ? window.MrymifyProducts.isLikeCountVisible() : true;

        if (liked) {
            likeBtn.classList.add('liked');
            if (heartIcon) heartIcon.textContent = '❤️';
        } else {
            likeBtn.classList.remove('liked');
            if (heartIcon) heartIcon.textContent = '🤍';
        }

        if (likeCountEl) {
            likeCountEl.textContent = count;
            likeCountEl.style.display = showLikes ? 'inline' : 'none';
        }
    }

    /**
     * Customer Reviews & Interactive Review Form
     */
    function initReviewsSection() {
        const toggleBtn = document.getElementById('btn-toggle-review-form');
        const formContainer = document.getElementById('write-review-container');
        const cancelBtn = document.getElementById('btn-cancel-review');
        const reviewForm = document.getElementById('product-review-form');

        if (toggleBtn && formContainer) {
            toggleBtn.onclick = () => {
                const isHidden = formContainer.style.display === 'none';
                formContainer.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            };
        }

        if (cancelBtn && formContainer) {
            cancelBtn.onclick = () => {
                formContainer.style.display = 'none';
            };
        }

        if (reviewForm) {
            reviewForm.onsubmit = function (e) {
                e.preventDefault();
                const author = document.getElementById('review-author').value.trim();
                const rating = parseInt(document.getElementById('review-rating').value, 10) || 5;
                const text = document.getElementById('review-text').value.trim();

                if (!author || !text) return;

                const newReview = {
                    author: author,
                    rating: rating,
                    text: text,
                    date: new Date().toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }),
                    isVerified: true
                };

                saveCustomReview(currentProduct.id, newReview);
                reviewForm.reset();
                if (formContainer) formContainer.style.display = 'none';
                renderReviewsList();

                // Quick confirmation feedback
                alert(`Thank you ${author}! Your verified review has been published ✨`);
            };
        }

        renderReviewsList();
    }

    function getProductReviewsList(productId) {
        const defaultReviews = [
            {
                author: 'Fatima Z.',
                rating: 5,
                text: 'The stitching is beyond neat! Super soft milk cotton yarn and arrived beautifully packaged in Mariyam\'s signature wax-sealed box.',
                date: 'Aug 24, 2026',
                isVerified: true
            },
            {
                author: 'Ayesha K.',
                rating: 5,
                text: 'Ordered as a birthday present and my sister absolutely cried of happiness! You can feel how much love went into making this piece.',
                date: 'Aug 18, 2026',
                isVerified: true
            },
            {
                author: 'Hina M.',
                rating: 5,
                text: 'Exceeded all my expectations! The colors are even prettier in person and the dimensions are just right.',
                date: 'Aug 12, 2026',
                isVerified: true
            }
        ];

        try {
            const saved = JSON.parse(localStorage.getItem(`mrymify_reviews_${productId}`) || '[]');
            if (Array.isArray(saved) && saved.length > 0) {
                return [...saved, ...defaultReviews];
            }
        } catch (e) {}

        return defaultReviews;
    }

    function saveCustomReview(productId, review) {
        try {
            const key = `mrymify_reviews_${productId}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.unshift(review);
            localStorage.setItem(key, JSON.stringify(existing));
        } catch (e) {
            console.error('Failed to save review', e);
        }
    }

    function renderReviewsList() {
        const container = document.getElementById('product-reviews-list');
        if (!container || !currentProduct) return;

        const reviews = getProductReviewsList(currentProduct.id);

        container.innerHTML = reviews.map(r => `
            <div class="review-item-card">
                <div class="review-item-header">
                    <div>
                        <span class="review-item-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</span>
                        <div class="review-item-author">${r.author}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="review-item-badge">✓ Verified Buyer</span>
                        <div class="review-item-date">${r.date || 'Recent Order'}</div>
                    </div>
                </div>
                <p class="review-item-body">"${r.text}"</p>
            </div>
        `).join('');

        const countEl = document.getElementById('detail-reviews-count');
        if (countEl) {
            countEl.textContent = `(${reviews.length} Verified Buyer Reviews)`;
        }
    }

    /**
     * Recommended / Similar Products
     */
    function renderRecommendedProducts() {
        const grid = document.getElementById('related-products-grid');
        if (!grid || !currentProduct) return;

        const catalog = (window.MrymifyProducts && window.MrymifyProducts.catalog) || [];

        // Find similar pieces from same category or others
        let recommended = catalog.filter(p => p.id !== currentProduct.id && p.category === currentProduct.category);
        if (recommended.length < 3) {
            const otherPieces = catalog.filter(p => p.id !== currentProduct.id && p.category !== currentProduct.category);
            recommended = [...recommended, ...otherPieces];
        }

        // Limit to 4 pieces
        recommended = recommended.slice(0, 4);

        grid.innerHTML = recommended.map(p => window.MrymifyProducts.createProductCardHtml(p)).join('');
    }

})();
