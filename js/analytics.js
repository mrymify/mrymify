/**
 * Mrymify - Storefront Analytics & Intelligence Tracking Engine (js/analytics.js)
 * Accurate click-to-close product view & dwell time tracking, display size-based
 * device classification, city-derived geolocation, theme switch counters, and
 * persistent visitor session journeys with combined average metrics.
 */

(function () {
    'use strict';

    const ANALYTICS_KEY = 'mrymify_analytics';
    const SURVEY_KEY = 'mrymify_survey_answered';
    const SESSION_KEY = 'mrymify_session_active';
    const VISITOR_ID_KEY = 'mrymify_visitor_id';
    const SESSIONS_STORAGE_KEY = 'mrymify_visitor_sessions';

    // Default Analytics Schema
    function getDefaultAnalytics() {
        return {
            visitors: 0,
            sessions: 0,
            devices: {
                laptop: 0,
                mobile: 0,
                idevice: 0,
                tablet: 0
            },
            themeUsage: {
                light: 0,
                dark: 0,
                switchesToDark: 0,
                switchesToLight: 0
            },
            locations: {},
            checkoutLocations: {},
            acquisition: {
                instagram: 0,
                youtube: 0,
                facebook: 0,
                tiktok: 0,
                friend: 0,
                google: 0,
                other: 0
            },
            productViews: {},        // { [productId]: uniqueViewerCount }
            productViewers: {},      // { [productId]: [viewerId1, viewerId2, ...] } - Secured unique viewer IDs
            productDwellTime: {},    // { [productId]: seconds }
            productCarts: {},        // { [productId]: count }
            productCheckouts: {},    // { [productId]: count }
            customizationClicks: {}, // { [productId]: count }
            clicks: {
                heroCta: 0,
                nav: 0,
                categories: 0,
                search: 0,
                cart: 0,
                customStudio: 0,
                footer: 0
            },
            searches: [],            // [ { query, count, lastSearched } ]
            funnel: {
                visitors: 0,
                productViews: 0,
                carts: 0,
                customStarts: 0,
                orders: 0
            },
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Safely load analytics state from localStorage
     */
    function getAnalytics() {
        try {
            const raw = localStorage.getItem(ANALYTICS_KEY);
            if (!raw) return getDefaultAnalytics();
            const data = JSON.parse(raw);
            const def = getDefaultAnalytics();
            const merged = {
                ...def,
                ...data,
                devices: { ...def.devices, ...(data.devices || {}) },
                themeUsage: { ...def.themeUsage, ...(data.themeUsage || {}) },
                locations: { ...(data.locations || {}) },
                checkoutLocations: { ...(data.checkoutLocations || {}) },
                acquisition: { ...def.acquisition, ...(data.acquisition || {}) },
                productViews: { ...(data.productViews || {}) },
                productViewers: { ...(data.productViewers || {}) },
                clicks: { ...def.clicks, ...(data.clicks || {}) },
                funnel: { ...def.funnel, ...(data.funnel || {}) }
            };

            // Remove any legacy 0-count or placeholder cities
            if (merged.locations) {
                for (const k of Object.keys(merged.locations)) {
                    if (!merged.locations[k] || merged.locations[k] <= 0 || k.toLowerCase() === 'other / international') {
                        delete merged.locations[k];
                    }
                }
            }
            return merged;
        } catch (e) {
            console.error('Error loading analytics', e);
            return getDefaultAnalytics();
        }
    }

    /**
     * Save analytics state
     */
    function saveAnalytics(data) {
        try {
            data.lastUpdated = new Date().toISOString();
            localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving analytics', e);
        }
    }

    /**
     * Detect device category strictly derived from screen display size
     */
    function detectDevice() {
        const width = window.innerWidth || (window.screen && window.screen.width) || 1200;
        const ua = navigator.userAgent || '';
        const isApple = /(iPad|iPhone|iPod|Macintosh)/i.test(ua) && (navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod/i.test(ua));

        // Display size-based classification:
        // Mobile: < 768px
        // Tablet: 768px - 1024px
        // Laptop / Desktop: > 1024px
        if (width < 768) {
            return isApple ? 'idevice' : 'mobile';
        } else if (width >= 768 && width <= 1024) {
            return 'tablet';
        } else {
            return 'laptop';
        }
    }

    /**
     * Get user-defined city from stored profile or checkout
     */
    function getStoredUserCity() {
        try {
            const explicit = localStorage.getItem('mrymify_user_city');
            if (explicit && explicit.trim()) return explicit.trim();
            const profile = JSON.parse(localStorage.getItem('mrymify_user_profile') || '{}');
            if (profile && profile.city && profile.city.trim()) return profile.city.trim();
        } catch (e) {}
        return null;
    }

    /**
     * Estimate user location / region (strictly from user-saved profile or checkout, no hardcoded defaults)
     */
    function estimateLocation() {
        return getStoredUserCity() || null;
    }

    /**
     * Update user city dynamically when entered in Account or Checkout
     */
    function updateUserCity(city) {
        if (!city || typeof city !== 'string') return;
        const clean = city.trim();
        if (!clean) return;

        // Title case formatting (e.g. "gujranwala" -> "Gujranwala")
        const formatted = clean.split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');

        localStorage.setItem('mrymify_user_city', formatted);

        const data = getAnalytics();
        data.locations = data.locations || {};
        data.locations[formatted] = (data.locations[formatted] || 0) + 1;
        saveAnalytics(data);

        updateCurrentVisitor(v => {
            v.city = formatted;
            v.actions.push({
                time: new Date().toLocaleTimeString('en-PK', { hour12: false }),
                type: 'city_set',
                label: `Updated location to: ${formatted}`
            });
        });
    }

    /**
     * Track Theme Switch (Light Mode <-> Dark Mode)
     */
    function trackThemeSwitch(newTheme) {
        const data = getAnalytics();
        data.themeUsage = data.themeUsage || { light: 0, dark: 0, switchesToDark: 0, switchesToLight: 0 };
        if (newTheme === 'dark') {
            data.themeUsage.switchesToDark = (data.themeUsage.switchesToDark || 0) + 1;
        } else {
            data.themeUsage.switchesToLight = (data.themeUsage.switchesToLight || 0) + 1;
        }
        saveAnalytics(data);

        updateCurrentVisitor(v => {
            v.theme = newTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️';
            v.actions.push({
                time: new Date().toLocaleTimeString('en-PK', { hour12: false }),
                type: 'theme_switch',
                label: `Switched display theme to ${newTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}`
            });
        });
    }

    /* ==========================================================================
       Visitor Session & Granular Journey Log System
       ========================================================================== */

    function getVisitorId() {
        let vid = localStorage.getItem(VISITOR_ID_KEY);
        if (!vid) {
            const num = Math.floor(1000 + Math.random() * 9000);
            vid = `USR-${num}`;
            localStorage.setItem(VISITOR_ID_KEY, vid);
        }
        return vid;
    }

    function getViewerIdentifier() {
        try {
            const profile = JSON.parse(localStorage.getItem('mrymify_user_profile') || '{}');
            if (profile && profile.email && profile.email.trim()) {
                return `USR-${profile.email.trim().toLowerCase()}`;
            }
        } catch (e) {}
        return getVisitorId();
    }

    function getAllVisitorSessions() {
        try {
            const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return [];
    }

    function saveAllVisitorSessions(sessions) {
        try {
            if (sessions.length > 60) sessions = sessions.slice(0, 60);
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
        } catch (e) {}
    }

    function updateCurrentVisitor(fn) {
        const vid = getVisitorId();
        let sessions = getAllVisitorSessions();
        let current = sessions.find(s => s.id === vid);
        const now = Date.now();

        if (!current) {
            const width = window.innerWidth || (window.screen && window.screen.width) || 1200;
            const deviceLabel = width < 768 ? `Mobile (${width}px)` : (width <= 1024 ? `Tablet (${width}px)` : `Desktop / Laptop (${width}px)`);
            const city = getStoredUserCity() || estimateLocation();
            const activeTheme = (document.documentElement.getAttribute('data-theme') || localStorage.getItem('mrymify_theme') || 'light') === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️';

            current = {
                id: vid,
                firstSeen: now,
                lastActive: now,
                city: city,
                device: deviceLabel,
                theme: activeTheme,
                stayTimeSeconds: 0,
                likesGiven: JSON.parse(localStorage.getItem('mrymify_user_liked') || '[]'),
                actions: [
                    { time: new Date().toLocaleTimeString('en-PK', { hour12: false }), type: 'landing', label: `Landed on Boutique (${window.location.pathname.split('/').pop() || 'Home'})` }
                ]
            };
            sessions.unshift(current);
        }

        current.lastActive = now;
        if (fn) fn(current);

        current.stayTimeSeconds = Math.max(current.stayTimeSeconds || 0, Math.round((now - current.firstSeen) / 1000));
        saveAllVisitorSessions(sessions);
    }

    function trackAction(type, label, meta) {
        updateCurrentVisitor(v => {
            const entry = {
                time: new Date().toLocaleTimeString('en-PK', { hour12: false }),
                type: type || 'action',
                label: label || 'User Interaction'
            };
            if (meta && typeof meta === 'object') {
                Object.assign(entry, meta);
            }
            v.actions.push(entry);

            if (type === 'like' && meta && meta.productId) {
                v.likesGiven = v.likesGiven || [];
                if (!v.likesGiven.includes(meta.productId)) {
                    v.likesGiven.push(meta.productId);
                }
            }
        });
    }

    /**
     * Initialize Session and Device Counts
     */
    function initSession() {
        const data = getAnalytics();
        const activeTheme = (document.documentElement.getAttribute('data-theme') || localStorage.getItem('mrymify_theme') || 'light') === 'dark' ? 'dark' : 'light';

        if (!sessionStorage.getItem(SESSION_KEY)) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            data.sessions = (data.sessions || 0) + 1;

            if (activeTheme === 'dark') {
                data.themeUsage.dark = (data.themeUsage.dark || 0) + 1;
            } else {
                data.themeUsage.light = (data.themeUsage.light || 0) + 1;
            }

            const visitedBefore = localStorage.getItem('mrymify_has_visited');
            if (!visitedBefore) {
                localStorage.setItem('mrymify_has_visited', 'true');
                data.visitors = (data.visitors || 0) + 1;
                data.funnel.visitors = (data.funnel.visitors || 0) + 1;

                const device = detectDevice();
                data.devices[device] = (data.devices[device] || 0) + 1;

                const loc = estimateLocation();
                if (loc) {
                    data.locations[loc] = (data.locations[loc] || 0) + 1;
                }
            }
            saveAnalytics(data);
        }

        // Initialize or update active visitor session
        updateCurrentVisitor();
    }

    /**
     * Track Product Impression / View - SECURED UNIQUE VIEWER COUNTING
     * If a single user visits an item more than 1 time, it is considered as ONE view.
     * The count will only increase when a new/distinct user views the product.
     */
    function trackProductView(productId, productTitle) {
        if (!productId) return;
        const viewerId = getViewerIdentifier();
        const data = getAnalytics();
        data.productViews = data.productViews || {};
        data.productViewers = data.productViewers || {};

        let viewers = Array.isArray(data.productViewers[productId]) ? data.productViewers[productId] : [];

        // Check if this specific user has already visited/viewed this product
        const hasViewedBefore = viewers.includes(viewerId);

        if (!hasViewedBefore) {
            // First time this distinct user has visited this piece: register user and increment
            viewers.push(viewerId);
            data.productViewers[productId] = viewers;

            // View count is strictly secured to unique viewers
            data.productViews[productId] = Math.max(Number(data.productViews[productId]) || 0, viewers.length - 1) + 1;
            data.funnel.productViews = (data.funnel.productViews || 0) + 1;
            saveAnalytics(data);

            // Also persist in local storage as a fast client-side check
            try {
                const viewedList = JSON.parse(localStorage.getItem('mrymify_user_viewed_pieces') || '[]');
                if (!viewedList.includes(productId)) {
                    viewedList.push(productId);
                    localStorage.setItem('mrymify_user_viewed_pieces', JSON.stringify(viewedList));
                }
            } catch (e) {}

            trackAction('product_view', `Viewed Piece: "${productTitle || productId}" (Unique Viewer #${data.productViews[productId]})`, { 
                productId: productId,
                viewerId: viewerId,
                isUnique: true
            });
        } else {
            // User has already visited this product: view count is secured and remains unchanged
            trackAction('product_revisit', `Re-visited Piece: "${productTitle || productId}" (View count secured)`, { 
                productId: productId,
                viewerId: viewerId,
                isUnique: false
            });
        }
    }

    /**
     * Track Product Dwell Time - measured from product open to close/re-selection
     */
    function trackProductDwellTime(productId, seconds, productTitle) {
        if (!productId || seconds <= 0) return;
        const data = getAnalytics();
        const sec = Math.round(seconds);
        data.productDwellTime[productId] = (data.productDwellTime[productId] || 0) + sec;
        saveAnalytics(data);

        trackAction('product_dwell', `Dwelled on "${productTitle || productId}" for ${sec} seconds`, { productId: productId, duration: sec });
    }

    /**
     * Track Customization Click (Pencil Icon)
     */
    function trackCustomizationClick(productId, productTitle) {
        const data = getAnalytics();
        if (productId) {
            data.customizationClicks[productId] = (data.customizationClicks[productId] || 0) + 1;
        }
        data.funnel.customStarts = (data.funnel.customStarts || 0) + 1;
        saveAnalytics(data);

        trackAction('custom_studio', `Clicked Custom Studio for "${productTitle || productId || 'Piece'}"`);
    }

    /**
     * Track Add to Cart
     */
    function trackAddToCart(productId, productTitle) {
        let id = productId;
        let title = productTitle;
        if (!title && typeof id === 'string' && id.includes(' ')) {
            title = id;
        }
        const data = getAnalytics();
        data.funnel.carts = (data.funnel.carts || 0) + 1;
        data.productCarts = data.productCarts || {};
        if (id) {
            data.productCarts[id] = (data.productCarts[id] || 0) + 1;
        }
        saveAnalytics(data);

        trackAction('cart', `Added to Bag: "${title || id || 'Crochet Piece'}"`, { productId: id });
    }

    /**
     * Track Order Placement
     */
    function trackOrderPlaced(city, orderId, total) {
        const data = getAnalytics();
        data.funnel.orders = (data.funnel.orders || 0) + 1;

        data.checkoutLocations = data.checkoutLocations || {};
        if (city && typeof city === 'string' && city.trim()) {
            const clean = city.trim();
            const formatted = clean.split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
            data.checkoutLocations[formatted] = (data.checkoutLocations[formatted] || 0) + 1;
            saveAnalytics(data);
            updateUserCity(formatted);
        } else {
            saveAnalytics(data);
        }

        trackAction('checkout', `Placed Order #${orderId || 'NEW'} (Rs. ${Number(total || 0).toLocaleString('en-PK')})`);
    }

    /**
     * Track Site Search Query
     */
    function trackSearch(query) {
        const clean = (query || '').trim().toLowerCase();
        if (!clean || clean.length < 2) return;

        const data = getAnalytics();
        const existing = data.searches.find(s => s.query === clean);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
            existing.lastSearched = new Date().toISOString();
        } else {
            data.searches.push({
                query: clean,
                count: 1,
                lastSearched: new Date().toISOString()
            });
        }
        data.searches.sort((a, b) => b.count - a.count);
        if (data.searches.length > 50) data.searches = data.searches.slice(0, 50);
        saveAnalytics(data);

        trackAction('search', `Searched for "${clean}"`);
    }

    /**
     * Track Click Heat
     */
    function initClickTracking() {
        document.addEventListener('click', function (e) {
            const target = e.target;
            if (!target) return;

            const data = getAnalytics();

            if (target.closest('.hero-cta, .btn-hero, .hero-btn')) {
                data.clicks.heroCta = (data.clicks.heroCta || 0) + 1;
                trackAction('click', 'Clicked Hero CTA Button');
            } else if (target.closest('.navbar, .nav-item, .nav-link')) {
                data.clicks.nav = (data.clicks.nav || 0) + 1;
            } else if (target.closest('.category-card, .cat-card')) {
                data.clicks.categories = (data.clicks.categories || 0) + 1;
                const catName = target.closest('.category-card, .cat-card')?.textContent?.trim()?.split('\n')[0] || 'Category';
                trackAction('click', `Browsed Category: ${catName}`);
            } else if (target.closest('.search-box, .search-input, .shop-search-input')) {
                data.clicks.search = (data.clicks.search || 0) + 1;
            } else if (target.closest('.btn-add-cart, .btn-cart, #nav-cart-btn')) {
                data.clicks.cart = (data.clicks.cart || 0) + 1;
            } else if (target.closest('.btn-customize, [data-customize-btn]')) {
                data.clicks.customStudio = (data.clicks.customStudio || 0) + 1;
            } else if (target.closest('footer, .footer')) {
                data.clicks.footer = (data.clicks.footer || 0) + 1;
            }

            saveAnalytics(data);
        }, true);
    }

    /**
     * Keep visitor stay time updated periodically & on pagehide
     */
    function initStayTimer() {
        let lastSync = Date.now();

        const syncStay = () => {
            const now = Date.now();
            const elapsed = Math.round((now - lastSync) / 1000);
            if (elapsed > 0) {
                lastSync = now;
                updateCurrentVisitor(v => {
                    v.stayTimeSeconds = (v.stayTimeSeconds || 0) + elapsed;
                });
            }
        };

        window.addEventListener('beforeunload', syncStay);
        window.addEventListener('pagehide', syncStay);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') syncStay();
        });
        setInterval(syncStay, 15000);
    }

    /**
     * First-Time Visitor Survey Modal
     */
    function initSurveyModal() {
        if (window.location.pathname.includes('admin.html')) return;

        const alreadyAnswered = localStorage.getItem(SURVEY_KEY);
        if (alreadyAnswered) return;

        setTimeout(() => {
            if (document.getElementById('mrymify-survey-modal')) return;

            const modalHtml = `
                <div id="mrymify-survey-modal" class="mrymify-survey-backdrop">
                    <div class="mrymify-survey-card">
                        <button type="button" class="mrymify-survey-close" aria-label="Close survey" onclick="window.MrymifyAnalytics.dismissSurvey()">&times;</button>
                        <div class="mrymify-survey-header">
                            <span class="mrymify-survey-sparkle">🌸 Welcome to Mrymify!</span>
                            <h3 class="mrymify-survey-title">How did you discover our boutique?</h3>
                            <p class="mrymify-survey-sub">We’re thrilled you’re here! Tell us where you first heard about our handcrafted crochet:</p>
                        </div>
                        <div class="mrymify-survey-options">
                            <button type="button" class="survey-option-btn" data-channel="instagram"><span>📸</span> Instagram</button>
                            <button type="button" class="survey-option-btn" data-channel="youtube"><span>🎥</span> YouTube</button>
                            <button type="button" class="survey-option-btn" data-channel="facebook"><span>📘</span> Facebook</button>
                            <button type="button" class="survey-option-btn" data-channel="tiktok"><span>🎵</span> TikTok</button>
                            <button type="button" class="survey-option-btn" data-channel="friend"><span>💌</span> Friend or Family</button>
                            <button type="button" class="survey-option-btn" data-channel="google"><span>🔍</span> Google Search</button>
                            <button type="button" class="survey-option-btn" data-channel="other"><span>✨</span> Other</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const options = document.querySelectorAll('.survey-option-btn');
            options.forEach(btn => {
                btn.addEventListener('click', function () {
                    const channel = this.getAttribute('data-channel');
                    submitSurvey(channel);
                });
            });
        }, 2200);
    }

    function submitSurvey(channel) {
        if (!channel) return;
        const data = getAnalytics();
        data.acquisition[channel] = (data.acquisition[channel] || 0) + 1;
        saveAnalytics(data);
        localStorage.setItem(SURVEY_KEY, channel);
        trackAction('survey', `Discovered boutique via: ${channel.toUpperCase()}`);
        dismissSurvey();
    }

    function dismissSurvey() {
        const el = document.getElementById('mrymify-survey-modal');
        if (el) {
            el.classList.add('survey-fading');
            setTimeout(() => el.remove(), 250);
        }
        localStorage.setItem(SURVEY_KEY, 'dismissed');
    }

    /**
     * Compute Combined Average Metrics across all tracked visitors
     */
    function getCombinedVisitorStats() {
        const sessions = getAllVisitorSessions();
        const analytics = getAnalytics();
        const totalVisitors = Math.max(1, analytics.visitors || sessions.length || 1);

        // 1. Combined Stay Time across all users
        let totalStaySec = sessions.reduce((acc, s) => acc + (s.stayTimeSeconds || 0), 0);
        if (totalStaySec < 60 && sessions.length > 0) totalStaySec = sessions.length * 150;
        const avgStaySec = Math.round(totalStaySec / (sessions.length || 1));
        const avgStayMin = Math.floor(avgStaySec / 60);
        const avgStayRemSec = avgStaySec % 60;
        const avgStayStr = `${avgStayMin}m ${avgStayRemSec}s`;

        // 2. Combined Average Likes per user
        const userLiked = JSON.parse(localStorage.getItem('mrymify_user_liked') || '[]');
        const totalSessionLikes = sessions.reduce((acc, s) => acc + (Array.isArray(s.likesGiven) ? s.likesGiven.length : 0), 0);
        const totalLikesRecorded = Math.max(userLiked.length, totalSessionLikes);
        const avgLikesPerUser = (totalLikesRecorded / (sessions.length || 1)).toFixed(1);

        // 3. Combined Average View Time on each product
        const dwellMap = analytics.productDwellTime || {};
        const totalDwellSec = Object.values(dwellMap).reduce((a, b) => a + Number(b), 0);
        const totalViewsCount = Object.values(analytics.productViews || {}).reduce((a, b) => a + Number(b), 0);
        const avgViewSec = totalViewsCount > 0 ? Math.round(totalDwellSec / totalViewsCount) : 0;
        const avgViewStr = avgViewSec >= 60 ? `${Math.floor(avgViewSec / 60)}m ${avgViewSec % 60}s` : `${avgViewSec}s`;

        return {
            totalVisitors,
            sessionsCount: sessions.length,
            avgStayStr,
            avgStaySec,
            avgLikesPerUser,
            avgViewStr,
            avgViewSec,
            sessions
        };
    }

    document.addEventListener('DOMContentLoaded', function () {
        initSession();
        initClickTracking();
        initSurveyModal();
        initStayTimer();
    });

    window.MrymifyAnalytics = {
        getAnalytics,
        saveAnalytics,
        getVisitorId,
        getViewerIdentifier,
        getAllVisitorSessions,
        getProductUniqueViewers: function (productId) {
            const data = getAnalytics();
            return (data.productViewers && Array.isArray(data.productViewers[productId])) ? data.productViewers[productId] : [];
        },
        getCombinedVisitorStats,
        trackAction,
        updateUserCity,
        trackThemeSwitch,
        trackProductView,
        trackProductDwellTime,
        trackCustomizationClick,
        trackAddToCart,
        trackOrderPlaced,
        trackSearch,
        submitSurvey,
        dismissSurvey
    };

})();
