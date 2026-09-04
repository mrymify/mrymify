/**
 * Mrymify - Shared Navigation Bar Component
 * Handles rendering of responsive desktop navbar, search magnifier, mobile drawer, and cart badge.
 */

(function () {
    'use strict';

    const NAV_LINKS = [
        { name: 'Home', href: 'index.html', key: 'home' },
        { name: 'Shop', href: 'shop.html', key: 'shop' },
        { name: 'Collection', href: 'categories.html', key: 'categories' },
        { name: 'Custom Orders', href: 'custom-orders.html', key: 'custom-orders' },
        { name: 'About', href: 'about.html', key: 'about' },
        { name: 'Contact', href: 'contact.html', key: 'contact' }
    ];

    /**
     * Determines the active page key based on URL or parameter
     */
    function detectActivePage(explicitKey) {
        if (explicitKey) return explicitKey.toLowerCase();

        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('shop.html')) return 'shop';
        if (path.endsWith('categories.html')) return 'categories';
        if (path.endsWith('custom-orders.html')) return 'custom-orders';
        if (path.endsWith('about.html')) return 'about';
        if (path.endsWith('contact.html')) return 'contact';
        if (path.endsWith('cart.html')) return 'cart';
        return 'home';
    }

    /**
     * Calculates total cart quantity from localStorage or default
     */
    function getCartCount() {
        try {
            const cartData = localStorage.getItem('mrymify_cart');
            if (!cartData) return 0;
            const items = JSON.parse(cartData);
            if (Array.isArray(items)) {
                return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
            }
        } catch (e) {
            console.warn('Could not read cart count from localStorage', e);
        }
        return 0;
    }

    /**
     * Renders the complete responsive navbar into the target container
     */
    function renderNavbar(activePageKey) {
        const container = document.getElementById('navbar-container');
        if (!container) return;

        const currentActive = detectActivePage(activePageKey);
        const cartCount = getCartCount();

        // Build desktop links
        const desktopLinksHtml = NAV_LINKS.map(link => {
            const isActive = link.key === currentActive;
            return `
                <li class="nav-item">
                    <a href="${link.href}" class="nav-link ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
                        ${link.name}
                    </a>
                </li>
            `;
        }).join('');

        // Build mobile links
        const mobileLinksHtml = NAV_LINKS.map(link => {
            const isActive = link.key === currentActive;
            return `
                <li class="mobile-nav-item">
                    <a href="${link.href}" class="mobile-nav-link ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
                        <span>${link.name}</span>
                        <span>→</span>
                    </a>
                </li>
            `;
        }).join('');

        container.innerHTML = `
            <header class="site-header" id="site-header">
                <div class="container nav-container">
                    <!-- Brand Logo -->
                    <a href="index.html" class="brand-logo" aria-label="Mrymify Home">
                        <span class="brand-name">MRYMIFY</span>
                        <span class="brand-tagline">Handcrafted Boutique</span>
                    </a>

                    <!-- Desktop Navigation Links with Search Magnifier on left of Home -->
                    <nav class="desktop-nav" aria-label="Main Navigation">
                        <ul class="nav-links">
                            <!-- Search Icon Button on Left of Home Tab -->
                            <li class="nav-item nav-search-item">
                                <div class="nav-search-wrap" id="nav-search-wrap">
                                    <button type="button" class="nav-search-btn" id="nav-search-toggle" aria-label="Open search bar" title="Search products">
                                        <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </button>
                                    <form class="nav-search-dropdown" id="nav-search-form" action="shop.html" method="get">
                                        <input type="text" name="search" id="nav-search-input" class="nav-search-input" placeholder="Search handcrafted gifts..." autocomplete="off" />
                                        <button type="submit" class="nav-search-submit-btn" aria-label="Submit search">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                                <circle cx="11" cy="11" r="8"></circle>
                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                            </svg>
                                        </button>
                                    </form>
                                </div>
                            </li>

                            ${desktopLinksHtml}
                        </ul>
                    </nav>

                    <!-- Nav Actions (Cart & Hamburger) -->
                    <div class="nav-actions">
                        <!-- Cart Button -->
                        <a href="cart.html" class="cart-btn ${currentActive === 'cart' ? 'active' : ''}" aria-label="Shopping Cart (${cartCount} items)" title="Cart">
                            <span class="cart-btn-icon">🛒</span>
                            <span class="cart-btn-label">Cart</span>
                            <span class="cart-badge" id="cart-badge" style="${cartCount > 0 ? '' : 'display:none;'}">${cartCount}</span>
                        </a>

                        <!-- Mobile Hamburger Toggle -->
                        <button class="menu-toggle-btn" id="menu-toggle-btn" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobile-nav-drawer">
                            <span class="hamburger-bar"></span>
                            <span class="hamburger-bar"></span>
                            <span class="hamburger-bar"></span>
                        </button>
                    </div>
                </div>
            </header>

            <!-- Mobile Backdrop Overlay -->
            <div class="nav-backdrop" id="nav-backdrop"></div>

            <!-- Mobile Off-Canvas Drawer -->
            <aside class="mobile-nav-drawer" id="mobile-nav-drawer" aria-label="Mobile Navigation" aria-hidden="true">
                <div class="drawer-header">
                    <span class="drawer-title">MRYMIFY</span>
                    <button class="drawer-close-btn" id="drawer-close-btn" aria-label="Close menu">&times;</button>
                </div>

                <!-- Mobile Search Box -->
                <div class="mobile-search-box">
                    <form action="shop.html" method="get" class="mobile-search-form">
                        <input type="text" name="search" class="mobile-search-input" placeholder="Search products..." autocomplete="off" />
                        <button type="submit" class="mobile-search-btn" aria-label="Search">🔍</button>
                    </form>
                </div>

                <nav>
                    <ul class="mobile-nav-list">
                        ${mobileLinksHtml}
                    </ul>
                </nav>

                <div class="mobile-drawer-footer">
                    <a href="cart.html" class="btn btn-primary mobile-cart-btn">
                        <span>View Cart</span>
                        <span id="mobile-cart-badge">(${cartCount})</span>
                    </a>
                </div>
            </aside>
        `;

        initNavbarEvents();
    }

    /**
     * Sets up event listeners for search dropdown, mobile drawer, and keyboard navigation
     */
    function initNavbarEvents() {
        const header = document.getElementById('site-header');
        const menuBtn = document.getElementById('menu-toggle-btn');
        const closeBtn = document.getElementById('drawer-close-btn');
        const backdrop = document.getElementById('nav-backdrop');
        const drawer = document.getElementById('mobile-nav-drawer');

        const searchWrap = document.getElementById('nav-search-wrap');
        const searchToggle = document.getElementById('nav-search-toggle');
        const searchInput = document.getElementById('nav-search-input');

        // Search toggle behavior
        if (searchToggle && searchWrap && searchInput) {
            searchToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                const isOpen = searchWrap.classList.contains('active');
                if (isOpen) {
                    searchWrap.classList.remove('active');
                } else {
                    searchWrap.classList.add('active');
                    setTimeout(() => searchInput.focus(), 100);
                }
            });

            // Close search when clicking outside
            document.addEventListener('click', function (e) {
                if (searchWrap.classList.contains('active') && !searchWrap.contains(e.target)) {
                    searchWrap.classList.remove('active');
                }
            });
        }

        if (!menuBtn || !drawer || !backdrop) return;

        function openDrawer() {
            drawer.classList.add('is-open');
            backdrop.classList.add('is-visible');
            menuBtn.classList.add('is-active');
            menuBtn.setAttribute('aria-expanded', 'true');
            drawer.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            drawer.classList.remove('is-open');
            backdrop.classList.remove('is-visible');
            menuBtn.classList.remove('is-active');
            menuBtn.setAttribute('aria-expanded', 'false');
            drawer.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        menuBtn.addEventListener('click', function () {
            const isOpen = drawer.classList.contains('is-open');
            if (isOpen) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        backdrop.addEventListener('click', closeDrawer);

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (drawer.classList.contains('is-open')) closeDrawer();
                if (searchWrap && searchWrap.classList.contains('active')) searchWrap.classList.remove('active');
            }
        });

        // Sticky shadow on scroll
        window.addEventListener('scroll', function () {
            if (window.scrollY > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    /**
     * Updates the cart badge count in real time
     */
    function updateCartBadge(count) {
        const badge = document.getElementById('cart-badge');
        const mobileBadge = document.getElementById('mobile-cart-badge');
        const safeCount = Math.max(0, parseInt(count, 10) || 0);

        if (badge) {
            badge.textContent = safeCount;
            badge.style.display = safeCount > 0 ? '' : 'none';
        }
        if (mobileBadge) {
            mobileBadge.textContent = `(${safeCount})`;
        }
    }

    /**
     * Initializes universal smooth scroll reveal animations across all pages.
     * Elements already visible in the viewport remain completely untransformed to prevent jitter.
     */
    function initScrollReveal() {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -20px 0px'
        });

        // Target content sections, cards, and banners
        const targets = document.querySelectorAll(
            'section, .product-card, .founder-card, .contact-card, .timeline-card, .value-card, .social-card, .cart-card, .category-teaser-col, .newsletter-card'
        );

        const windowH = window.innerHeight;
        targets.forEach(function (target, idx) {
            const rect = target.getBoundingClientRect();
            // Critical jitter prevention: if already in initial viewport, leave 100% stationary
            if (rect.top < windowH && rect.bottom > 0) {
                return;
            }

            // Only elements below the fold receive scroll reveal
            target.classList.add('reveal-fade');
            if (target.classList.contains('product-card') || target.classList.contains('social-card') || target.classList.contains('category-teaser-col')) {
                const delayMod = (idx % 4) + 1;
                target.classList.add('delay-' + delayMod);
            }
            observer.observe(target);
        });
    }

    const PAGE_ORDER = {
        'index.html': 0,
        'home': 0,
        'shop.html': 1,
        'shop': 1,
        'categories.html': 2,
        'categories': 2,
        'about.html': 3,
        'about': 3,
        'contact.html': 4,
        'contact': 4,
        'cart.html': 5,
        'cart': 5
    };

    function getPageIndex(url) {
        if (!url) return 0;
        const clean = url.split('?')[0].split('#')[0].toLowerCase();
        for (const [key, idx] of Object.entries(PAGE_ORDER)) {
            if (clean.endsWith(key)) return idx;
        }
        return 0;
    }

    /**
     * Applies mobile-app horizontal swipe entrance animation on page load without lingering transforms
     */
    function applyAppSwipeEntrance() {
        const slideDir = sessionStorage.getItem('mrymify_slide_dir');
        sessionStorage.removeItem('mrymify_slide_dir');

        const mainEl = document.querySelector('.site-main');
        if (!mainEl) return;

        if (slideDir === 'backward') {
            mainEl.classList.add('page-slide-in-left');
        } else if (slideDir === 'forward') {
            mainEl.classList.add('page-slide-in-right');
        }

        // Clean up animation classes as soon as motion completes so sticky elements and text subpixels remain crisp
        const cleanup = function () {
            mainEl.classList.remove('page-slide-in-left', 'page-slide-in-right');
            mainEl.style.transform = '';
            mainEl.removeEventListener('animationend', cleanup);
        };

        mainEl.addEventListener('animationend', cleanup, { once: true });
        setTimeout(cleanup, 320);
    }

    /**
     * Initializes smooth mobile-app horizontal swipe transitions when switching tabs or clicking internal links
     */
    function initSmoothPageTransitions() {
        document.addEventListener('click', function (e) {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Ignore anchor jumps on same page, external links, and protocols
            if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
                return;
            }

            // Ignore new tab links
            if (link.target === '_blank') return;

            // Calculate swipe direction (forward vs backward)
            const currentIdx = getPageIndex(window.location.pathname);
            const targetIdx = getPageIndex(href);
            const isBackward = targetIdx < currentIdx;

            // Prevent abrupt reload
            e.preventDefault();

            // Highlight target nav link immediately
            if (link.classList.contains('nav-link') || link.classList.contains('mobile-nav-link')) {
                document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }

            const mainEl = document.querySelector('.site-main');
            if (mainEl) {
                mainEl.classList.remove('page-slide-in-left', 'page-slide-in-right');
                if (isBackward) {
                    mainEl.classList.add('page-slide-out-right');
                    sessionStorage.setItem('mrymify_slide_dir', 'backward');
                } else {
                    mainEl.classList.add('page-slide-out-left');
                    sessionStorage.setItem('mrymify_slide_dir', 'forward');
                }
            }

            // Smooth exit before redirect
            setTimeout(function () {
                window.location.href = href;
            }, 150);
        });

        // Ensure page is fully visible when using browser back/forward buttons
        window.addEventListener('pageshow', function () {
            const mainEl = document.querySelector('.site-main');
            if (mainEl) {
                mainEl.classList.remove('page-slide-out-left', 'page-slide-out-right', 'page-slide-in-left', 'page-slide-in-right');
                mainEl.style.transform = '';
            }
        });
    }

    // Auto-render navbar and animations
    function bootstrap() {
        renderNavbar();
        applyAppSwipeEntrance();
        initSmoothPageTransitions();
        // Defer scroll reveal slightly so it never contends with initial entrance
        setTimeout(initScrollReveal, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // Expose component API
    window.MrymifyNavbar = {
        render: renderNavbar,
        updateCartBadge: updateCartBadge,
        initScrollReveal: initScrollReveal,
        initSmoothPageTransitions: initSmoothPageTransitions
    };
})();
