/**
 * Mrymify - Shared Navigation Bar Component
 * Handles rendering of responsive desktop navbar, search magnifier, mobile drawer, and cart badge.
 */

(function () {
    'use strict';

    /* ==========================================================================
       Dark / Light Theme System (Moon when dark, Sun when light)
       ========================================================================== */
    const THEME_STORAGE_KEY = 'mrymify_theme';

    function getPreferredTheme() {
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
        } catch (e) {
            // Local storage access error fallback
        }
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    function applyTheme(theme, animate) {
        const targetTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', targetTheme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
        } catch (e) {
            // Ignore storage quota or security errors
        }

        // Update all theme toggle buttons across the page
        // Requirement: Just an icon of moon when dark (🌙) and sun when light (☀️)
        const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
        const iconChar = targetTheme === 'dark' ? '🌙' : '☀️';
        const labelText = targetTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

        toggleButtons.forEach(btn => {
            btn.setAttribute('aria-label', labelText);
            btn.setAttribute('title', labelText);
            const iconEl = btn.querySelector('.theme-toggle-icon');
            if (iconEl) {
                if (animate) {
                    iconEl.style.transform = 'scale(0.3) rotate(60deg)';
                    setTimeout(() => {
                        iconEl.textContent = iconChar;
                        iconEl.style.transform = 'scale(1) rotate(0deg)';
                    }, 140);
                } else {
                    iconEl.textContent = iconChar;
                }
            } else {
                btn.textContent = iconChar;
            }
        });

        window.dispatchEvent(new CustomEvent('mrymify-theme-changed', { detail: { theme: targetTheme } }));
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
        try {
            if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackThemeSwitch === 'function') {
                window.MrymifyAnalytics.trackThemeSwitch(next);
            }
        } catch (e) {
            console.warn('[Theme] Analytics tracking error:', e);
        }
    }

    // Apply preferred theme immediately upon script load to prevent any flash of unstyled theme
    applyTheme(getPreferredTheme(), false);

    // Listen to OS system color scheme changes if user hasn't set explicit preference
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
            try {
                if (!localStorage.getItem(THEME_STORAGE_KEY)) {
                    applyTheme(e.matches ? 'dark' : 'light', true);
                }
            } catch (err) {}
        });
    }

    const NAV_LINKS = [
        { name: 'Home', href: 'index.html', key: 'home' },
        { name: 'Shop', href: 'shop.html', key: 'shop' },
        { name: 'Collection', href: 'categories.html', key: 'categories' },
        { name: 'Custom Orders', href: 'custom-orders.html', key: 'custom-orders' },
        { name: 'About', href: 'about.html', key: 'about' },
        { name: 'Contact', href: 'contact.html', key: 'contact' }
    ];

    /**
     * Determines the active page key based on URL path with fallback to explicit parameter
     */
    function detectActivePage(explicitKey) {
        const fullUrl = (window.location.pathname + window.location.search + window.location.hash + window.location.href).toLowerCase();
        if (fullUrl.includes('custom-orders') || fullUrl.includes('custom-order')) return 'custom-orders';
        if (fullUrl.includes('categories') || fullUrl.includes('collection')) return 'categories';
        if (fullUrl.includes('shop') || fullUrl.includes('product')) return 'shop';
        if (fullUrl.includes('about')) return 'about';
        if (fullUrl.includes('contact')) return 'contact';
        if (fullUrl.includes('cart') || fullUrl.includes('checkout')) return 'cart';
        if (fullUrl.includes('index')) return 'home';

        if (explicitKey) return explicitKey.toLowerCase();
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

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    /**
     * Renders the complete responsive navbar into the target container
     */
    function renderNavbar(activePageKey) {
        const container = document.getElementById('navbar-container');
        if (!container) return;

        const currentActive = detectActivePage(activePageKey);
        const cartCount = getCartCount();
        let likedCount = 0;
        try {
            const userLiked = JSON.parse(localStorage.getItem('mrymify_user_liked') || '[]');
            likedCount = Array.isArray(userLiked) ? userLiked.length : 0;
        } catch(e) { likedCount = 0; }

        const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
        const themeIcon = currentTheme === 'dark' ? '🌙' : '☀️';
        const themeTitle = currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

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
                        <img src="images/logo.jpg" alt="Mrymify Bouquet Logo" class="brand-logo-img" />
                        <div class="brand-logo-text">
                            <span class="brand-name">MRYMIFY</span>
                            <span class="brand-tagline">Handcrafted Boutique</span>
                        </div>
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

                    <!-- Nav Actions (Theme Toggle, Liked, Account, Cart & Hamburger) -->
                    <div class="nav-actions">
                        <!-- Theme Toggle Button -->
                        <button type="button" class="theme-toggle-btn" id="theme-toggle-btn" aria-label="${themeTitle}" title="${themeTitle}">
                            <span class="theme-toggle-icon">${themeIcon}</span>
                        </button>

                        <!-- Liked Products Button -->
                        <button type="button" class="liked-nav-btn" id="nav-liked-btn" aria-label="Liked Products (${likedCount})" title="My Liked Creations" style="background: none; border: none; font-size: 1.15rem; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; color: var(--color-text-main); position: relative; transition: background-color 0.2s ease;">
                            <span>❤️</span>
                            <span class="liked-nav-badge" id="nav-liked-badge" style="${likedCount > 0 ? 'display: flex;' : 'display: none;'} position: absolute; top: 1px; right: 1px; background: var(--color-primary); color: #fff; font-size: 0.62rem; font-weight: 700; width: 17px; height: 17px; border-radius: 50%; align-items: center; justify-content: center; border: 2px solid var(--color-surface, #fff);">${likedCount}</span>
                        </button>

                        <!-- Customer Account Button -->
                        <button type="button" class="account-btn" id="nav-account-btn" aria-label="Customer Profile & Account" title="My Account & Delivery Profile" style="background: none; border: none; font-size: 1.15rem; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; color: var(--color-text-main); transition: background-color 0.2s ease;">
                            <span>👤</span>
                        </button>

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

            <!-- Mobile Navigation Backdrop -->
            <div class="nav-backdrop" id="nav-backdrop" aria-hidden="true"></div>

            <!-- Mobile Navigation Drawer -->
            <aside class="mobile-nav-drawer" id="mobile-nav-drawer" aria-label="Mobile Navigation" aria-hidden="true">
                <div class="mobile-drawer-header">
                    <div class="brand-logo">
                        <img src="images/logo.jpg" alt="Mrymify Boutique Logo" class="brand-logo-img" />
                        <div class="brand-logo-text">
                            <span class="brand-name">MRYMIFY</span>
                            <span class="brand-tagline">Handcrafted Boutique</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button type="button" class="theme-toggle-btn" id="drawer-theme-toggle-btn" aria-label="${themeTitle}" title="${themeTitle}">
                            <span class="theme-toggle-icon">${themeIcon}</span>
                        </button>
                        <button class="drawer-close-btn" id="drawer-close-btn" aria-label="Close navigation menu">✕</button>
                    </div>
                </div>

                <!-- Mobile Search Input Box -->
                <div class="mobile-search-box">
                    <form class="mobile-search-form" action="shop.html" method="get">
                        <input type="text" name="search" class="mobile-search-input" placeholder="Search handcrafted gifts..." autocomplete="off" />
                        <button type="submit" class="mobile-search-submit-btn" aria-label="Submit search">🔍</button>
                    </form>
                </div>

                <nav>
                    <ul class="mobile-nav-list">
                        ${mobileLinksHtml}
                        <li class="mobile-nav-item">
                            <a href="#" class="mobile-nav-link" id="drawer-liked-link">
                                <span>❤️ Liked Products (<span id="drawer-liked-count">${likedCount}</span>)</span>
                                <span>→</span>
                            </a>
                        </li>
                        <li class="mobile-nav-item">
                            <a href="#" class="mobile-nav-link" id="drawer-account-link">
                                <span>👤 My Account & Profile</span>
                                <span>→</span>
                            </a>
                        </li>
                    </ul>
                </nav>

                <div class="mobile-drawer-footer">
                    <a href="cart.html" class="btn btn-primary mobile-cart-btn">
                        <span>View Cart</span>
                        <span id="mobile-cart-badge">(${cartCount})</span>
                    </a>
                </div>
            </aside>

            <!-- Customer Account Profile Modal -->
            <div id="mrymify-account-modal" class="account-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(5px); z-index: 99999; align-items: center; justify-content: center; padding: 1rem;">
                <div class="account-modal-card" style="background: var(--color-surface, #ffffff); border-radius: 20px; max-width: 460px; width: 100%; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); border: 1.5px solid var(--color-border, #eee); position: relative; max-height: 90vh; overflow-y: auto;">
                    <button type="button" id="account-modal-close" style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; font-size: 1.6rem; cursor: pointer; color: var(--color-text-muted); line-height: 1;">&times;</button>
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">👤</div>
                        <h3 style="font-size: 1.35rem; font-weight: 700; color: var(--color-text-main); margin: 0;">My Boutique Account</h3>
                        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin: 0.35rem 0 0;">Saved locally on this device for instant auto-fill on orders.</p>
                    </div>
                    <form id="account-profile-form" style="display: flex; flex-direction: column; gap: 0.85rem;">
                        <div>
                            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">Full Name</label>
                            <input type="text" id="acc-name" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg); color: var(--color-text-main); font-size: 0.9rem;" placeholder="e.g. Mariyam Tariq" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">Phone / WhatsApp</label>
                            <input type="tel" id="acc-phone" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg); color: var(--color-text-main); font-size: 0.9rem;" placeholder="0300-1234567" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">Email Address</label>
                            <input type="email" id="acc-email" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg); color: var(--color-text-main); font-size: 0.9rem;" placeholder="e.g. mariyam@example.com" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">City</label>
                            <input type="text" id="acc-city" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg); color: var(--color-text-main); font-size: 0.9rem;" placeholder="e.g. Gujranwala, Lahore, Islamabad" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">Delivery Address</label>
                            <textarea id="acc-address" rows="2" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--color-border); border-radius: 10px; background: var(--color-bg); color: var(--color-text-main); font-size: 0.9rem; resize: none;" placeholder="House/Street, Area details"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary" style="padding: 0.75rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; margin-top: 0.35rem;">
                            <span>Save Profile</span>
                        </button>
                        <div id="acc-feedback" style="font-size: 0.85rem; color: #10b981; text-align: center; display: none; font-weight: 600;">✓ Details saved! Pre-filled on future orders.</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--color-border); padding-top: 0.75rem; margin-top: 0.5rem; font-size: 0.85rem;">
                            <a href="cart.html?view=orders" style="color: var(--color-primary); font-weight: 600; text-decoration: underline;">📦 View Your Placed Orders</a>
                            <button type="button" id="acc-clear-btn" style="background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer;">Clear Saved Info</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Liked Products (Wishlist) Modal -->
            <div id="mrymify-liked-modal" class="liked-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(5px); z-index: 99999; align-items: center; justify-content: center; padding: 1rem;">
                <div class="liked-modal-card" style="background: var(--color-surface, #ffffff); border-radius: 20px; max-width: 520px; width: 100%; padding: 1.75rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); border: 1.5px solid var(--color-border, #eee); position: relative; max-height: 85vh; display: flex; flex-direction: column;">
                    <button type="button" id="liked-modal-close" style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; font-size: 1.6rem; cursor: pointer; color: var(--color-text-muted); line-height: 1;">&times;</button>
                    
                    <div style="margin-bottom: 1.25rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.6rem;">❤️</span>
                            <h3 style="font-size: 1.35rem; font-weight: 700; color: var(--color-text-main); margin: 0;">My Liked Pieces</h3>
                            <span id="liked-modal-header-count" style="font-size: 0.8rem; background: var(--color-primary-light, rgba(184,93,67,0.12)); color: var(--color-primary); font-weight: 700; padding: 0.15rem 0.6rem; border-radius: 20px;">0 saved</span>
                        </div>
                        <p style="font-size: 0.82rem; color: var(--color-text-muted); margin: 0.35rem 0 0;">Handcrafted creations you have loved. Saved directly on this device.</p>
                    </div>

                    <div id="liked-modal-items-wrap" style="flex: 1; overflow-y: auto; padding-right: 0.35rem; margin-bottom: 1rem; min-height: 150px; display: flex; flex-direction: column; gap: 0.85rem;">
                        <!-- Injected dynamically by JavaScript -->
                    </div>

                    <div style="border-top: 1px solid var(--color-border); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                        <button type="button" id="liked-modal-clear-all" style="background: none; border: none; color: #ef4444; font-size: 0.82rem; cursor: pointer; font-weight: 600;">Clear All Liked</button>
                        <a href="shop.html" class="btn btn-primary btn-sm" style="border-radius: 20px; padding: 0.5rem 1.25rem;">
                            <span>Explore More Pieces &rarr;</span>
                        </a>
                    </div>
                </div>
            </div>
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

        // Theme Toggle Buttons event listener
        const themeBtn = document.getElementById('theme-toggle-btn');
        const drawerThemeBtn = document.getElementById('drawer-theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', toggleTheme);
        }
        if (drawerThemeBtn) {
            drawerThemeBtn.addEventListener('click', toggleTheme);
        }

        if (!menuBtn || !drawer || !backdrop) return;

        function openDrawer() {
            drawer.classList.add('is-open');
            backdrop.classList.add('is-visible');
            menuBtn.classList.add('is-active');
            menuBtn.setAttribute('aria-expanded', 'true');
            drawer.setAttribute('aria-hidden', 'false');
            document.body.classList.add('drawer-open');
        }

        function closeDrawer() {
            drawer.classList.remove('is-open');
            backdrop.classList.remove('is-visible');
            menuBtn.classList.remove('is-active');
            menuBtn.setAttribute('aria-expanded', 'false');
            drawer.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('drawer-open');
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

        // Auto-close drawer whenever a navigation link inside the drawer is tapped
        drawer.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeDrawer);
        });

        // Ensure clean state on page restore / history navigation
        window.addEventListener('pageshow', closeDrawer);

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

        // Account Modal Management
        const accountBtn = document.getElementById('nav-account-btn');
        const drawerAccLink = document.getElementById('drawer-account-link');
        const accModal = document.getElementById('mrymify-account-modal');
        const accClose = document.getElementById('account-modal-close');
        const accForm = document.getElementById('account-profile-form');
        const accClear = document.getElementById('acc-clear-btn');
        const accFeedback = document.getElementById('acc-feedback');

        function openAccountModal() {
            if (!accModal) return;
            try {
                const profile = JSON.parse(localStorage.getItem('mrymify_user_profile') || '{}');
                const nameIn = document.getElementById('acc-name');
                const phoneIn = document.getElementById('acc-phone');
                const emailIn = document.getElementById('acc-email');
                const cityIn = document.getElementById('acc-city');
                const addrIn = document.getElementById('acc-address');
                if (nameIn) nameIn.value = profile.name || '';
                if (phoneIn) phoneIn.value = profile.phone || '';
                if (emailIn) emailIn.value = profile.email || '';
                if (cityIn) cityIn.value = profile.city || '';
                if (addrIn) addrIn.value = profile.address || '';
            } catch(e) {}
            if (accFeedback) accFeedback.style.display = 'none';
            accModal.style.display = 'flex';
        }

        function closeAccountModal() {
            if (accModal) accModal.style.display = 'none';
        }

        if (accountBtn) accountBtn.addEventListener('click', openAccountModal);
        if (drawerAccLink) {
            drawerAccLink.addEventListener('click', function(e) {
                e.preventDefault();
                closeDrawer();
                openAccountModal();
            });
        }
        if (accClose) accClose.addEventListener('click', closeAccountModal);
        if (accModal) {
            accModal.addEventListener('click', function(e) {
                if (e.target === accModal) closeAccountModal();
            });
        }
        if (accForm) {
            accForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const name = (document.getElementById('acc-name')?.value || '').trim();
                const phone = (document.getElementById('acc-phone')?.value || '').trim();
                const email = (document.getElementById('acc-email')?.value || '').trim();
                const city = (document.getElementById('acc-city')?.value || '').trim();
                const address = (document.getElementById('acc-address')?.value || '').trim();

                const profile = { name, phone, email, city, address, lastUpdated: new Date().toISOString() };
                localStorage.setItem('mrymify_user_profile', JSON.stringify(profile));

                try {
                    if (city && window.MrymifyAnalytics && typeof window.MrymifyAnalytics.updateUserCity === 'function') {
                        window.MrymifyAnalytics.updateUserCity(city);
                    }
                    if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackAction === 'function') {
                        window.MrymifyAnalytics.trackAction('Profile Updated', `Saved customer profile (City: ${city || 'Not specified'})`);
                    }
                } catch(err) {
                    console.warn('[Profile] Analytics update error:', err);
                }

                if (accFeedback) {
                    accFeedback.style.display = 'block';
                    setTimeout(() => { if (accFeedback) accFeedback.style.display = 'none'; }, 3000);
                }
            });
        }
        if (accClear) {
            accClear.addEventListener('click', function() {
                if (!confirm('Clear your saved customer profile?')) return;
                localStorage.removeItem('mrymify_user_profile');
                if (document.getElementById('acc-name')) document.getElementById('acc-name').value = '';
                if (document.getElementById('acc-phone')) document.getElementById('acc-phone').value = '';
                if (document.getElementById('acc-email')) document.getElementById('acc-email').value = '';
                if (document.getElementById('acc-city')) document.getElementById('acc-city').value = '';
                if (document.getElementById('acc-address')) document.getElementById('acc-address').value = '';
                alert('Saved customer profile cleared.');
            });
        }

        // ======================================================================
        // Liked Products (Wishlist) Tab & Modal Management
        // ======================================================================
        const likedBtn = document.getElementById('nav-liked-btn');
        const drawerLikedLink = document.getElementById('drawer-liked-link');
        const likedModal = document.getElementById('mrymify-liked-modal');
        const likedClose = document.getElementById('liked-modal-close');
        const likedClearAll = document.getElementById('liked-modal-clear-all');
        const likedBadge = document.getElementById('nav-liked-badge');
        const drawerLikedCount = document.getElementById('drawer-liked-count');
        const likedHeaderCount = document.getElementById('liked-modal-header-count');
        const likedItemsWrap = document.getElementById('liked-modal-items-wrap');

        function getLikedProductIds() {
            try {
                const list = JSON.parse(localStorage.getItem('mrymify_user_liked') || '[]');
                return Array.isArray(list) ? list : [];
            } catch(e) {
                return [];
            }
        }

        function updateLikedBadges(count) {
            const safeCount = typeof count === 'number' ? count : getLikedProductIds().length;
            if (likedBadge) {
                likedBadge.textContent = safeCount;
                likedBadge.style.display = safeCount > 0 ? 'flex' : 'none';
            }
            if (drawerLikedCount) {
                drawerLikedCount.textContent = safeCount;
            }
            if (likedHeaderCount) {
                likedHeaderCount.textContent = `${safeCount} saved piece${safeCount === 1 ? '' : 's'}`;
            }
        }

        function renderLikedItems() {
            if (!likedItemsWrap) return;
            const likedIds = getLikedProductIds();
            updateLikedBadges(likedIds.length);

            if (likedIds.length === 0) {
                likedItemsWrap.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem 1rem; color: var(--color-text-muted);">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem; line-height: 1;">🧶🤍</div>
                        <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--color-text-main); margin: 0 0 0.4rem;">No Liked Pieces Yet</h4>
                        <p style="font-size: 0.85rem; margin: 0 auto 1.25rem; max-width: 320px; line-height: 1.45;">Tap the heart icon ❤️ on any creation in our boutique to save your favorites here!</p>
                        <a href="shop.html" class="btn btn-outline btn-sm" style="border-radius: 20px; padding: 0.45rem 1.25rem; display: inline-block;" onclick="MrymifyLiked.close();">Browse Catalog</a>
                    </div>
                `;
                return;
            }

            // Retrieve products from catalog
            const allProducts = (window.MrymifyProducts && typeof window.MrymifyProducts.getEffectiveCatalog === 'function')
                ? window.MrymifyProducts.getEffectiveCatalog(true)
                : (window.MrymifyProducts?.catalog || []);

            const items = likedIds.map(id => {
                return allProducts.find(p => p.id === id) || {
                    id: id,
                    title: 'Handcrafted Piece (' + id + ')',
                    categoryLabel: 'CROCHET',
                    price: 1200,
                    image: 'images/products/01_Royal_Crown_Froggy.png',
                    estimatedMakingTime: '2-3 Business Days'
                };
            });

            likedItemsWrap.innerHTML = items.map(p => `
                <div class="liked-item-card" style="display: flex; gap: 0.85rem; align-items: center; background: var(--color-bg); padding: 0.75rem 0.85rem; border-radius: 14px; border: 1.5px solid var(--color-border); transition: border-color 0.2s ease;">
                    <a href="product-details.html?id=${encodeURIComponent(p.id)}" style="text-decoration: none; flex-shrink: 0;" onclick="MrymifyLiked.close();">
                        <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width: 64px; height: 64px; border-radius: 10px; object-fit: cover; display: block; border: 1px solid var(--color-border);" />
                    </a>
                    <div style="flex: 1; min-width: 0;">
                        <a href="product-details.html?id=${encodeURIComponent(p.id)}" style="text-decoration: none; color: inherit;" onclick="MrymifyLiked.close();">
                            <h4 style="font-size: 0.95rem; font-weight: 700; margin: 0 0 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text-main);">${escapeHtml(p.title)}</h4>
                        </a>
                        <div style="font-size: 0.78rem; color: var(--color-text-muted);">
                            ${escapeHtml(p.categoryLabel || p.category || 'Handmade')} • ⏳ ${escapeHtml(p.estimatedMakingTime || '2-3 Business Days')}
                        </div>
                        <div style="font-size: 0.92rem; font-weight: 700; color: var(--color-primary); margin-top: 0.25rem;">
                            Rs. ${Number(p.price).toLocaleString('en-PK')}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; flex-shrink: 0;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="MrymifyLiked.addToCart('${p.id}')" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-radius: 8px; white-space: nowrap;">
                            <span>+ Cart</span>
                        </button>
                        <button type="button" onclick="MrymifyLiked.removeLiked('${p.id}')" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; padding: 0; font-weight: 600;" title="Remove from favorites">
                            <span>✕ Remove</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function openLikedModal() {
            if (!likedModal) return;
            renderLikedItems();
            likedModal.style.display = 'flex';
        }

        function closeLikedModal() {
            if (likedModal) likedModal.style.display = 'none';
        }

        if (likedBtn) likedBtn.addEventListener('click', openLikedModal);
        if (drawerLikedLink) {
            drawerLikedLink.addEventListener('click', function(e) {
                e.preventDefault();
                closeDrawer();
                openLikedModal();
            });
        }
        if (likedClose) likedClose.addEventListener('click', closeLikedModal);
        if (likedModal) {
            likedModal.addEventListener('click', function(e) {
                if (e.target === likedModal) closeLikedModal();
            });
        }
        if (likedClearAll) {
            likedClearAll.addEventListener('click', function() {
                const current = getLikedProductIds();
                if (!current.length) return;
                if (!confirm('Remove all pieces from your liked wishlist?')) return;
                
                // Clear user liked list
                localStorage.setItem('mrymify_user_liked', JSON.stringify([]));
                window.dispatchEvent(new CustomEvent('mrymify:likes_updated', { detail: { count: 0, userLiked: [] } }));
                renderLikedItems();
            });
        }

        // Global Controller for Liked Products
        window.MrymifyLiked = {
            open: openLikedModal,
            close: closeLikedModal,
            refresh: function() {
                updateLikedBadges();
                if (likedModal && likedModal.style.display === 'flex') {
                    renderLikedItems();
                }
            },
            addToCart: function(id) {
                if (window.MrymifyProducts && typeof window.MrymifyProducts.handleAddToCart === 'function') {
                    window.MrymifyProducts.handleAddToCart(id);
                } else {
                    alert('Item added to cart!');
                }
            },
            removeLiked: function(id) {
                if (window.MrymifyProducts && typeof window.MrymifyProducts.handleLike === 'function') {
                    window.MrymifyProducts.handleLike(id);
                } else {
                    let list = getLikedProductIds();
                    list = list.filter(item => item !== id);
                    localStorage.setItem('mrymify_user_liked', JSON.stringify(list));
                    window.dispatchEvent(new CustomEvent('mrymify:likes_updated', { detail: { count: list.length, userLiked: list } }));
                }
                renderLikedItems();
            }
        };

        // Listen for like toggle updates across anywhere on the page
        window.addEventListener('mrymify:likes_updated', function(e) {
            const count = e.detail && typeof e.detail.count === 'number' ? e.detail.count : getLikedProductIds().length;
            updateLikedBadges(count);
            if (likedModal && likedModal.style.display === 'flex') {
                renderLikedItems();
            }
        });

        window.addEventListener('storage', function(e) {
            if (e.key === 'mrymify_user_liked') {
                updateLikedBadges();
                if (likedModal && likedModal.style.display === 'flex') {
                    renderLikedItems();
                }
            }
        });
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
        // On mobile devices, skip scroll-reveal to maintain 100% native momentum scrolling with zero GPU contention
        if (window.innerWidth <= 768 || !('IntersectionObserver' in window)) return;

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
        'custom-orders.html': 3,
        'custom-orders': 3,
        'custom': 3,
        'about.html': 4,
        'about': 4,
        'contact.html': 5,
        'contact': 5,
        'cart.html': 6,
        'cart': 6
    };

    function getPageIndex(url) {
        if (!url) return 0;
        const clean = url.split('?')[0].split('#')[0].toLowerCase();
        for (const [key, idx] of Object.entries(PAGE_ORDER)) {
            if (clean.includes(key)) return idx;
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
            // On mobile devices or touch screens, allow native instant navigation to prevent touch delays or scroll contention
            if (window.innerWidth <= 768 || 'ontouchstart' in window) return;

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

    /* ==========================================================================
       Global Branding & SEO Meta Synchronizer (Connected to DevTools)
       ========================================================================== */
    function applyGlobalBranding() {
        try {
            const raw = localStorage.getItem('mrymify_branding_config');
            if (!raw) return;
            const config = JSON.parse(raw);
            if (!config) return;

            // 1. Sync Website SEO Description
            if (config.siteDesc) {
                let metaDesc = document.querySelector('meta[name="description"]');
                if (!metaDesc) {
                    metaDesc = document.createElement('meta');
                    metaDesc.name = 'description';
                    document.head.appendChild(metaDesc);
                }
                metaDesc.content = config.siteDesc;
            }

            // 2. Sync Website Title (on homepage or general branding)
            if (config.siteTitle) {
                const p = window.location.pathname;
                if (p.endsWith('index.html') || p === '/' || p.endsWith('/')) {
                    document.title = config.siteTitle;
                }
            }

            // 3. Sync WhatsApp phone links
            if (config.contactPhone) {
                const phone = config.contactPhone.replace(/[^0-9]/g, '');
                if (phone) {
                    document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
                        const href = link.getAttribute('href');
                        try {
                            const url = new URL(href, window.location.href);
                            const search = url.search;
                            link.setAttribute('href', `https://wa.me/${phone}${search}`);
                        } catch (e) {
                            link.setAttribute('href', `https://wa.me/${phone}`);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Error applying global branding', e);
        }
    }

    // Auto-render navbar and animations
    function bootstrap() {
        applyGlobalBranding();
        renderNavbar();
        applyAppSwipeEntrance();
        initSmoothPageTransitions();
        // Defer scroll reveal slightly so it never contends with initial entrance
        setTimeout(initScrollReveal, 250);
        try {
            const profile = JSON.parse(localStorage.getItem('mrymify_user_profile') || '{}');
            if (profile.city && window.MrymifyAnalytics && typeof window.MrymifyAnalytics.updateUserCity === 'function') {
                window.MrymifyAnalytics.updateUserCity(profile.city);
            }
        } catch(e) {}
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

    window.MrymifyTheme = {
        get: () => document.documentElement.getAttribute('data-theme') || getPreferredTheme(),
        set: (theme) => applyTheme(theme, true),
        toggle: toggleTheme
    };
})();
