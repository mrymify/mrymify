/**
 * Mrymify - Admin Portal Scripts (js/admin.js)
 * Cryptographic Web Crypto SHA-256 Authentication, Executive Intelligence Dashboard,
 * Order Pipeline Management, Product Studio with WhatsApp PFP-Style Canvas Cropper,
 * PC-Style Folder Views, Promotions & Referral System, and Showcase Management.
 */

(function () {
    'use strict';

    // Cryptographic Salt for Master Password Hashing
    const CRYPTO_SALT = 'mrymify_artisan_boutique_salt_2026';
    const DEFAULT_PASSCODE = 'mrymify@2026';
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes
    const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

    // Clean Chrome/Material SVG Edit Pencil Vector Icon
    const EDIT_PENCIL_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 4px;" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;

    // Store state
    let currentOrders = [];
    let currentCatalog = [];
    let activeTab = 'overview';
    let productViewMode = localStorage.getItem('mrymify_prod_view_mode') || 'folders';
    let productSearchQuery = '';
    let lockoutInterval = null;

    /* ==========================================================================
       Dark / Light Theme System (Moon when dark, Sun when light)
       ========================================================================== */
    const THEME_STORAGE_KEY = 'mrymify_theme';

    function getPreferredTheme() {
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
        } catch (e) {}
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    function applyAdminTheme(theme, animate) {
        const targetTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', targetTheme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
        } catch (e) {}

        const buttons = document.querySelectorAll('#admin-theme-toggle, #admin-auth-theme-toggle, .theme-toggle-btn');
        buttons.forEach(btn => {
            const iconChar = targetTheme === 'dark' ? '🌙' : '☀️';
            const labelText = targetTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
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
    }

    function toggleAdminTheme() {
        const current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
        applyAdminTheme(current === 'dark' ? 'light' : 'dark', true);
    }

    applyAdminTheme(getPreferredTheme(), false);

    document.addEventListener('DOMContentLoaded', function () {
        initAuthSecurity();
        initClock();
        document.querySelectorAll('#admin-theme-toggle, #admin-auth-theme-toggle, .theme-toggle-btn').forEach(btn => {
            btn.addEventListener('click', toggleAdminTheme);
        });
        applyAdminTheme(getPreferredTheme(), false);
    });

    /* ==========================================================================
       1. Cryptographic Security & Authentication System
       ========================================================================== */

    async function hashPassword(password, salt) {
        const enc = new TextEncoder();
        const data = enc.encode(salt + password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function initMasterKeyHash() {
        const existingHash = localStorage.getItem('mrymify_admin_hash');
        if (!existingHash) {
            const defaultHash = await hashPassword(DEFAULT_PASSCODE, CRYPTO_SALT);
            localStorage.setItem('mrymify_admin_hash', defaultHash);
        }
    }

    function initAuthSecurity() {
        initMasterKeyHash();

        const loginForm = document.getElementById('admin-login-form');
        const passInput = document.getElementById('admin-password-input');
        const togglePwdBtn = document.getElementById('btn-toggle-password');
        const logoutBtn = document.getElementById('btn-admin-logout');

        checkLockoutStatus();

        if (togglePwdBtn && passInput) {
            togglePwdBtn.addEventListener('click', function () {
                const type = passInput.type === 'password' ? 'text' : 'password';
                passInput.type = type;
                togglePwdBtn.textContent = type === 'password' ? '👁️' : '🙈';
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                if (confirm('Sign out of your Mrymify Admin session?')) {
                    sessionStorage.removeItem('mrymify_admin_authenticated');
                    sessionStorage.removeItem('mrymify_admin_login_time');
                    showAuthScreen();
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                await handleAdminLogin();
            });
        }

        if (isSessionValid()) {
            showDashboardScreen();
        } else {
            showAuthScreen();
        }
    }

    function isSessionValid() {
        const isAuth = sessionStorage.getItem('mrymify_admin_authenticated') === 'true';
        const loginTime = parseInt(sessionStorage.getItem('mrymify_admin_login_time') || '0', 10);
        if (!isAuth || !loginTime) return false;
        if (Date.now() - loginTime > SESSION_IDLE_TIMEOUT_MS) {
            sessionStorage.removeItem('mrymify_admin_authenticated');
            sessionStorage.removeItem('mrymify_admin_login_time');
            return false;
        }
        return true;
    }

    async function handleAdminLogin() {
        if (isLockedOut()) return;

        const passInput = document.getElementById('admin-password-input');
        const submitBtn = document.getElementById('btn-admin-submit');
        const enteredPassword = passInput?.value || '';

        if (!enteredPassword) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Verifying key... ⏳</span>';

        const enteredHash = await hashPassword(enteredPassword, CRYPTO_SALT);
        const storedHash = localStorage.getItem('mrymify_admin_hash');

        if (enteredHash === storedHash) {
            localStorage.removeItem('mrymify_failed_attempts');
            localStorage.removeItem('mrymify_lockout_until');
            sessionStorage.setItem('mrymify_admin_authenticated', 'true');
            sessionStorage.setItem('mrymify_admin_login_time', Date.now().toString());

            showAuthAlert('', 'none');
            passInput.value = '';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Unlock Dashboard ✨</span>';

            showDashboardScreen();
        } else {
            let failedAttempts = parseInt(localStorage.getItem('mrymify_failed_attempts') || '0', 10) + 1;
            localStorage.setItem('mrymify_failed_attempts', failedAttempts.toString());

            const remaining = MAX_FAILED_ATTEMPTS - failedAttempts;
            if (remaining <= 0) {
                const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
                localStorage.setItem('mrymify_lockout_until', lockoutUntil.toString());
                checkLockoutStatus();
            } else {
                showAuthAlert(`Incorrect master passcode. ${remaining} attempt(s) remaining before lockout.`, 'error');
                passInput.value = '';
                passInput.focus();
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Unlock Dashboard ✨</span>';
            }
        }
    }

    function isLockedOut() {
        const lockoutUntil = parseInt(localStorage.getItem('mrymify_lockout_until') || '0', 10);
        return lockoutUntil > Date.now();
    }

    function checkLockoutStatus() {
        const lockoutUntil = parseInt(localStorage.getItem('mrymify_lockout_until') || '0', 10);
        const submitBtn = document.getElementById('btn-admin-submit');
        const passInput = document.getElementById('admin-password-input');

        if (lockoutUntil > Date.now()) {
            if (submitBtn) submitBtn.disabled = true;
            if (passInput) passInput.disabled = true;

            clearInterval(lockoutInterval);
            lockoutInterval = setInterval(() => {
                const remainingSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
                if (remainingSec <= 0) {
                    clearInterval(lockoutInterval);
                    localStorage.removeItem('mrymify_failed_attempts');
                    localStorage.removeItem('mrymify_lockout_until');
                    if (submitBtn) submitBtn.disabled = false;
                    if (passInput) passInput.disabled = false;
                    showAuthAlert('Lockout expired. You may now attempt to log in.', 'warning');
                } else {
                    const mins = Math.floor(remainingSec / 60);
                    const secs = remainingSec % 60;
                    showAuthAlert(`Portal locked due to repeated incorrect attempts. Please wait ${mins}m ${secs}s before retrying.`, 'error');
                }
            }, 1000);
        } else {
            if (submitBtn) submitBtn.disabled = false;
            if (passInput) passInput.disabled = false;
        }
    }

    function showAuthAlert(msg, type) {
        const alertBox = document.getElementById('admin-auth-alert');
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = 'auth-alert ' + (type || 'error');
    }

    function showAuthScreen() {
        const authScreen = document.getElementById('admin-auth-screen');
        const dashScreen = document.getElementById('admin-dashboard-screen');
        if (authScreen) authScreen.style.display = 'flex';
        if (dashScreen) dashScreen.style.display = 'none';
    }

    function showDashboardScreen() {
        const authScreen = document.getElementById('admin-auth-screen');
        const dashScreen = document.getElementById('admin-dashboard-screen');
        if (authScreen) authScreen.style.display = 'none';
        if (dashScreen) {
            dashScreen.style.display = 'flex';
            bootstrapDashboard();
        }
    }

    /* ==========================================================================
       2. Dashboard Bootstrap & Navigation
       ========================================================================== */

    function bootstrapDashboard() {
        initNavigation();
        loadOrders();
        loadProducts();
        renderOverviewMetrics();
        initModalEvents();
        initSettingsHandlers();
        initProductStudioCropper();
        initDedicatedSearches();
        initEasterEggSuite();
        renderYarnPalette();
        setProductViewMode(productViewMode);
        initHorizontalWheelScroll();
    }

    function initNavigation() {
        const navButtons = document.querySelectorAll('.admin-nav-item');
        navButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const targetTab = this.getAttribute('data-tab');
                switchTab(targetTab);
            });
        });

        const logoutBtn = document.getElementById('btn-admin-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                sessionStorage.removeItem('mrymify_admin_authenticated');
                sessionStorage.removeItem('mrymify_admin_login_time');
                lockDevTools();
                showAuthScreen();
            });
        }
    }

    function switchTab(tabId) {
        closeMobileSidebar();

        if (tabId === 'unlisted') {
            activeTab = 'products';
            document.querySelectorAll('.admin-nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-tab') === 'unlisted');
            });
            document.querySelectorAll('.admin-tab-pane').forEach(pane => {
                pane.classList.toggle('active', pane.id === 'tab-products');
            });
            setProductViewMode('unlisted');
            return;
        }

        activeTab = tabId;
        document.querySelectorAll('.admin-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });
        document.querySelectorAll('.admin-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabId}`);
        });

        if (tabId === 'overview') {
            renderOverviewMetrics();
        } else if (tabId === 'orders') {
            renderOrdersTable();
        } else if (tabId === 'products') {
            renderProducts();
        } else if (tabId === 'promotions') {
            renderPromotions();
        } else if (tabId === 'showcase') {
            renderShowcaseManager();
        } else if (tabId === 'settings') {
            renderSettings();
        } else if (tabId === 'devtools') {
            renderDevToolsTab();
        }
    }

    /**
     * Toggles mobile off-canvas sidebar drawer
     */
    function toggleMobileSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        const backdrop = document.getElementById('admin-sidebar-backdrop');
        if (!sidebar) return;
        const isOpen = sidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    /**
     * Closes mobile off-canvas sidebar drawer
     */
    function closeMobileSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        const backdrop = document.getElementById('admin-sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    function initClock() {
        const clockEl = document.getElementById('admin-live-clock');
        function updateClock() {
            if (!clockEl) return;
            const now = new Date();
            clockEl.textContent = now.toLocaleDateString('en-PK', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        updateClock();
        setInterval(updateClock, 30000);
    }

    /* ==========================================================================
       3. Intelligence & Analytics Dashboard Renderer
       ========================================================================== */

    function getStoreAnalytics() {
        if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.getAnalytics === 'function') {
            return window.MrymifyAnalytics.getAnalytics();
        }
        try {
            return JSON.parse(localStorage.getItem('mrymify_analytics') || '{}');
        } catch(e) {
            return {};
        }
    }

    function renderOverviewMetrics() {
        const analytics = getStoreAnalytics();

        // 1. Calculate Top Metrics
        const totalRevenue = currentOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
        const totalOrders = currentOrders.length;
        const totalVisitors = Number(analytics.visitors) || 0;
        const conversionRate = totalVisitors > 0 ? ((totalOrders / totalVisitors) * 100).toFixed(1) : '0.0';

        const revEl = document.getElementById('metric-total-revenue');
        const ordEl = document.getElementById('metric-total-orders');
        const visEl = document.getElementById('metric-total-visitors');
        const crEl = document.getElementById('metric-conversion-rate');

        const baselineRevenue = 10000;
        const revGrowthPct = baselineRevenue > 0 ? Math.round(((totalRevenue - baselineRevenue) / baselineRevenue) * 100) : 100;
        const revGrowthSign = revGrowthPct >= 0 ? '+' : '';

        const revSubEl = document.getElementById('metric-revenue-sub');
        if (revSubEl) {
            revSubEl.textContent = 'From customer orders';
        }

        const ordSubEl = document.getElementById('metric-orders-sub');
        if (ordSubEl) {
            ordSubEl.textContent = 'All-time received';
        }

        if (revEl) revEl.textContent = `Rs. ${totalRevenue.toLocaleString('en-PK')}`;
        if (ordEl) ordEl.textContent = totalOrders.toString();
        if (visEl) visEl.textContent = totalVisitors.toString();
        if (crEl) crEl.textContent = `${conversionRate}%`;

        // 2. Render Conversion Funnel (Compact Steps)
        const funnelGrid = document.getElementById('analytics-funnel-grid');
        if (funnelGrid) {
            const f = analytics.funnel || {};
            const vCount = f.visitors !== undefined ? Number(f.visitors) : totalVisitors;
            const pvCount = Number(f.productViews) || 0;
            const cartCount = Number(f.carts) || 0;
            const customCount = Number(f.customStarts) || 0;
            const orderCount = totalOrders;

            const steps = [
                { num: 'Step 1', name: '👥 Traffic', val: vCount, rate: vCount > 0 ? '100%' : '0%' },
                { num: 'Step 2', name: '🧶 Views', val: pvCount, rate: vCount > 0 ? `${Math.round((pvCount / vCount) * 100)}%` : '0%' },
                { num: 'Step 3', name: '🧺 Bagged', val: cartCount, rate: vCount > 0 ? `${((cartCount / vCount) * 100).toFixed(1)}%` : '0%' },
                { num: 'Step 4', name: `${EDIT_PENCIL_SVG} Custom`, val: customCount, rate: `${customCount} starts` },
                { num: 'Step 5', name: '📦 Orders', val: orderCount, rate: `${conversionRate}%` }
            ];

            funnelGrid.innerHTML = steps.map(s => `
                <div class="funnel-step-card" style="padding: 0.65rem 0.5rem; text-align: center;">
                    <div class="funnel-step-num" style="font-size: 0.7rem; margin-bottom: 0.15rem;">${s.num}</div>
                    <div class="funnel-step-name" style="font-size: 0.78rem; font-weight: 700;">${s.name}</div>
                    <div class="funnel-step-val" style="font-size: 1.05rem; font-weight: 800; margin: 0.15rem 0;">${Number(s.val).toLocaleString('en-PK')}</div>
                    <div class="funnel-step-rate" style="font-size: 0.72rem;">${s.rate}</div>
                </div>
            `).join('');
        }

        // 3. Render Device Breakdown (Circle Donut Graph)
        const devContainer = document.getElementById('analytics-devices-container');
        if (devContainer) {
            const devices = analytics.devices || { laptop: 0, mobile: 0, idevice: 0, tablet: 0 };
            const lap = Number(devices.laptop) || 0;
            const mob = Number(devices.mobile) || 0;
            const idev = Number(devices.idevice) || 0;
            const tab = Number(devices.tablet) || 0;
            const total = Math.max(1, lap + mob + idev + tab);

            const pLap = Math.round((lap / total) * 100);
            const pMob = Math.round((mob / total) * 100);
            const pIdev = Math.round((idev / total) * 100);
            const pTab = Math.max(0, 100 - (pLap + pMob + pIdev));

            const deg1 = pLap * 3.6;
            const deg2 = deg1 + (pMob * 3.6);
            const deg3 = deg2 + (pIdev * 3.6);

            const hasData = (lap + mob + idev + tab) > 0;
            const conicBg = hasData
                ? `conic-gradient(var(--admin-primary) 0deg ${deg1}deg, #3b82f6 ${deg1}deg ${deg2}deg, #8b5cf6 ${deg2}deg ${deg3}deg, #10b981 ${deg3}deg 360deg)`
                : `conic-gradient(var(--admin-primary) 0deg 216deg, #3b82f6 216deg 360deg)`;

            const dominantPct = hasData ? Math.max(pLap, pMob, pIdev, pTab) : 60;
            const dominantLabel = pMob >= pLap ? 'Mobile' : 'Desktop';

            devContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-around; gap: 0.85rem;">
                    <div style="width: 96px; height: 96px; border-radius: 50%; background: ${conicBg}; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                        <div style="width: 58px; height: 58px; border-radius: 50%; background: var(--admin-surface); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <span style="font-size: 0.95rem; font-weight: 800; color: var(--admin-text-main); font-family: 'Outfit', sans-serif;">${dominantPct}%</span>
                            <span style="font-size: 0.62rem; color: var(--admin-text-muted);">${dominantLabel}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--admin-primary); flex-shrink: 0;"></span> Desktop</span>
                            <strong>${pLap}%</strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; flex-shrink: 0;"></span> Mobile</span>
                            <strong>${pMob}%</strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6; flex-shrink: 0;"></span> Apple</span>
                            <strong>${pIdev}%</strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; flex-shrink: 0;"></span> Tablet</span>
                            <strong>${pTab}%</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // 4. Render Active Theme Mode (Active Users Only - Circle Donut Graph)
        const themeContainer = document.getElementById('analytics-theme-container');
        if (themeContainer) {
            const themeUsage = analytics.themeUsage || { light: 0, dark: 0 };
            const lightCount = Number(themeUsage.light) || 0;
            const darkCount = Number(themeUsage.dark) || 0;
            const totalThemeUsers = Math.max(1, lightCount + darkCount);
            const lightPct = Math.round((lightCount / totalThemeUsers) * 100);
            const darkPct = 100 - lightPct;

            const degLight = lightPct * 3.6;
            const hasThemeData = (lightCount + darkCount) > 0;
            const conicTheme = hasThemeData
                ? `conic-gradient(#f59e0b 0deg ${degLight}deg, #6366f1 ${degLight}deg 360deg)`
                : `conic-gradient(#f59e0b 0deg 180deg, #6366f1 180deg 360deg)`;

            const dominantThemePct = hasThemeData ? Math.max(lightPct, darkPct) : 50;
            const dominantThemeLabel = lightPct >= darkPct ? 'Light' : 'Dark';

            themeContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-around; gap: 0.85rem;">
                    <div style="width: 96px; height: 96px; border-radius: 50%; background: ${conicTheme}; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                        <div style="width: 58px; height: 58px; border-radius: 50%; background: var(--admin-surface); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <span style="font-size: 0.95rem; font-weight: 800; color: var(--admin-text-main); font-family: 'Outfit', sans-serif;">${dominantThemePct}%</span>
                            <span style="font-size: 0.62rem; color: var(--admin-text-muted);">${dominantThemeLabel}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.8rem; flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.55rem; background: var(--admin-bg); border-radius: 6px; border: 1px solid var(--admin-border);">
                            <span style="display: flex; align-items: center; gap: 0.4rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; flex-shrink: 0;"></span> ☀️ Light</span>
                            <strong>${lightCount} <span style="font-size: 0.72rem; color: var(--admin-text-muted);">(${lightPct}%)</span></strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.55rem; background: var(--admin-bg); border-radius: 6px; border: 1px solid var(--admin-border);">
                            <span style="display: flex; align-items: center; gap: 0.4rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #6366f1; flex-shrink: 0;"></span> 🌙 Dark</span>
                            <strong>${darkCount} <span style="font-size: 0.72rem; color: var(--admin-text-muted);">(${darkPct}%)</span></strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // 5. Render Acquisition Channels (Circle Donut Graph)
        const acqContainer = document.getElementById('analytics-acquisition-container');
        if (acqContainer) {
            const acq = analytics.acquisition || {};
            const ig = Number(acq.instagram) || 0;
            const fb = Number(acq.facebook) || 0;
            const tt = Number(acq.tiktok) || 0;
            const yt = Number(acq.youtube) || 0;
            const other = (Number(acq.friend) || 0) + (Number(acq.google) || 0) + (Number(acq.other) || 0);
            const totalAcq = Math.max(1, ig + fb + tt + yt + other);

            const pIg = Math.round((ig / totalAcq) * 100);
            const pFb = Math.round((fb / totalAcq) * 100);
            const pTt = Math.round((tt / totalAcq) * 100);
            const pYt = Math.round((yt / totalAcq) * 100);
            const pOther = Math.max(0, 100 - (pIg + pFb + pTt + pYt));

            const deg1 = pIg * 3.6;
            const deg2 = deg1 + (pFb * 3.6);
            const deg3 = deg2 + (pTt * 3.6);
            const deg4 = deg3 + (pYt * 3.6);

            const hasAcqData = (ig + fb + tt + yt + other) > 0;
            const conicAcq = hasAcqData
                ? `conic-gradient(#e1306c 0deg ${deg1}deg, #1877f2 ${deg1}deg ${deg2}deg, #25f4ee ${deg2}deg ${deg3}deg, #ff0000 ${deg3}deg ${deg4}deg, #10b981 ${deg4}deg 360deg)`
                : `conic-gradient(#e1306c 0deg 180deg, #1877f2 180deg 360deg)`;

            const dominantAcqPct = hasAcqData ? Math.max(pIg, pFb, pTt, pYt, pOther) : 50;
            const dominantAcqLabel = pIg >= pFb ? 'Instagram' : 'Channels';

            acqContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-around; gap: 0.85rem;">
                    <div style="width: 96px; height: 96px; border-radius: 50%; background: ${conicAcq}; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                        <div style="width: 58px; height: 58px; border-radius: 50%; background: var(--admin-surface); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <span style="font-size: 0.95rem; font-weight: 800; color: var(--admin-text-main); font-family: 'Outfit', sans-serif;">${dominantAcqPct}%</span>
                            <span style="font-size: 0.62rem; color: var(--admin-text-muted);">${dominantAcqLabel}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #e1306c; flex-shrink: 0;"></span> Instagram</span>
                            <strong>${pIg}%</strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #1877f2; flex-shrink: 0;"></span> Facebook</span>
                            <strong>${pFb}%</strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #25f4ee; flex-shrink: 0;"></span> TikTok</span>
                            <strong>${pTt}%</strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; flex-shrink: 0;"></span> Direct / Other</span>
                            <strong>${pOther}%</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // 6. Quick Clicks in Conversion Funnel Header
        const quickClicksEl = document.getElementById('analytics-quick-clicks-bar');
        if (quickClicksEl) {
            const clk = analytics.clicks || {};
            quickClicksEl.innerHTML = `
                <span style="padding: 0.2rem 0.5rem; background: var(--admin-bg); border-radius: 6px; border: 1px solid var(--admin-border); display: inline-flex; align-items: center; gap: 0.3rem;">
                    <span>🎯 Hero:</span> <strong>${clk.heroCta || 0}</strong>
                </span>
                <span style="padding: 0.2rem 0.5rem; background: var(--admin-bg); border-radius: 6px; border: 1px solid var(--admin-border); display: inline-flex; align-items: center; gap: 0.3rem;">
                    <span>🧺 Bag:</span> <strong>${clk.cart || 0}</strong>
                </span>
                <span style="padding: 0.2rem 0.5rem; background: var(--admin-bg); border-radius: 6px; border: 1px solid var(--admin-border); display: inline-flex; align-items: center; gap: 0.3rem;">
                    <span>${EDIT_PENCIL_SVG} Custom:</span> <strong>${clk.customStudio || 0}</strong>
                </span>
            `;
        }

        // Helper: Dynamic Circle Donut Chart for Cities as they add up
        function renderCityCircleDonut(containerEl, cityMap, emptyMsg, palette) {
            if (!containerEl) return;
            const entries = Object.entries(cityMap || {})
                .filter(([city, count]) => city && Number(count) > 0 && city.toLowerCase() !== 'other / international')
                .sort((a, b) => Number(b[1]) - Number(a[1]));

            if (entries.length === 0) {
                containerEl.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 110px; text-align: center; color: var(--admin-text-muted); padding: 0.75rem;">
                        <span style="font-size: 1.6rem; margin-bottom: 0.35rem; opacity: 0.5;">🏙️</span>
                        <p style="font-size: 0.8rem; margin: 0; line-height: 1.4;">${emptyMsg}</p>
                    </div>
                `;
                return;
            }

            const total = entries.reduce((sum, [_, cnt]) => sum + Number(cnt), 0);
            const colors = palette || ['#ec4899', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#6366f1'];

            let currentDeg = 0;
            const conicStops = [];
            const cityData = entries.map(([city, count], idx) => {
                const num = Number(count);
                const pct = total > 0 ? Math.round((num / total) * 100) : 0;
                const color = colors[idx % colors.length];
                const deg = total > 0 ? (num / total) * 360 : 0;
                const startDeg = currentDeg;
                const endDeg = currentDeg + deg;
                currentDeg = endDeg;
                conicStops.push(`${color} ${startDeg.toFixed(1)}deg ${endDeg.toFixed(1)}deg`);
                return { city, count: num, pct, color };
            });

            if (conicStops.length > 0) {
                const lastIdx = conicStops.length - 1;
                const parts = conicStops[lastIdx].split(' ');
                conicStops[lastIdx] = `${parts[0]} ${parts[1]} 360deg`;
            }

            const conicBg = `conic-gradient(${conicStops.join(', ')})`;
            const topCity = cityData[0];

            containerEl.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-around; gap: 0.85rem; flex-wrap: wrap;">
                    <div style="width: 96px; height: 96px; border-radius: 50%; background: ${conicBg}; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                        <div style="width: 58px; height: 58px; border-radius: 50%; background: var(--admin-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; text-align: center;">
                            <span style="font-size: 0.95rem; font-weight: 800; color: var(--admin-text-main); font-family: 'Outfit', sans-serif;">${topCity.pct}%</span>
                            <span style="font-size: 0.6rem; color: var(--admin-text-muted); max-width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(topCity.city)}">${escapeHtml(topCity.city)}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; flex: 1; min-width: 140px; max-height: 110px; overflow-y: auto; padding-right: 0.2rem;">
                        ${cityData.map(c => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.25rem 0.45rem; background: var(--admin-bg); border-radius: 6px; border: 1px solid var(--admin-border);">
                                <span style="display: flex; align-items: center; gap: 0.35rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;" title="${escapeHtml(c.city)}">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${c.color}; flex-shrink: 0;"></span>
                                    ${escapeHtml(c.city)}
                                </span>
                                <span style="font-size: 0.75rem; white-space: nowrap;"><strong>${c.count}</strong> <span style="color: var(--admin-text-muted); font-size: 0.68rem;">(${c.pct}%)</span></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 7. Render Visitor Cities Graph (Dynamic - strictly from user activity, no pre-fixed cities)
        const visCitiesContainer = document.getElementById('analytics-visitor-cities-container');
        if (visCitiesContainer) {
            const visitorCities = {};
            if (analytics.locations && typeof analytics.locations === 'object') {
                Object.entries(analytics.locations).forEach(([city, count]) => {
                    const clean = (city || '').trim();
                    if (clean && Number(count) > 0 && clean.toLowerCase() !== 'other / international') {
                        visitorCities[clean] = (visitorCities[clean] || 0) + Number(count);
                    }
                });
            }
            renderCityCircleDonut(
                visCitiesContainer,
                visitorCities,
                'No visitor cities registered yet. Graph will build dynamically as visitors provide their city in profile or checkout.',
                ['#ec4899', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#6366f1']
            );
        }

        // 8. Render Checkout Cities Graph (Dynamic - strictly from completed orders)
        const checkCitiesContainer = document.getElementById('analytics-checkout-cities-container');
        if (checkCitiesContainer) {
            const checkoutCities = {};
            currentOrders.forEach(o => {
                const rawCity = (o.customer?.city || o.city || '').trim();
                if (rawCity) {
                    const formatted = rawCity.split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
                    checkoutCities[formatted] = (checkoutCities[formatted] || 0) + 1;
                }
            });
            if (analytics.checkoutLocations && typeof analytics.checkoutLocations === 'object') {
                Object.entries(analytics.checkoutLocations).forEach(([city, count]) => {
                    const clean = (city || '').trim();
                    if (clean && Number(count) > 0 && !checkoutCities[clean]) {
                        checkoutCities[clean] = Number(count);
                    }
                });
            }
            renderCityCircleDonut(
                checkCitiesContainer,
                checkoutCities,
                'No checkout cities recorded yet. Completed orders will graph customer delivery cities here.',
                ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f97316']
            );
        }

        // 9. Render Top Products Performance Champions Card (Click opens Individual Count Graph Modal)
        const topProductsContainer = document.getElementById('analytics-top-products-summary');
        if (topProductsContainer) {
            const pLikes = JSON.parse(localStorage.getItem('mrymify_product_likes') || '{}');
            const pDwell = analytics.productDwellTime || {};
            const pViews = analytics.productViews || {};
            const pCarts = analytics.productCarts || {};

            const pCheckouts = {};
            currentOrders.forEach(o => {
                (o.items || []).forEach(it => {
                    const id = it.id || it.productId;
                    if (id) {
                        pCheckouts[id] = (pCheckouts[id] || 0) + Number(it.quantity || it.qty || 1);
                    }
                });
            });
            if (analytics.productCheckouts && typeof analytics.productCheckouts === 'object') {
                Object.entries(analytics.productCheckouts).forEach(([id, cnt]) => {
                    if (id && Number(cnt) > 0 && !pCheckouts[id]) {
                        pCheckouts[id] = Number(cnt);
                    }
                });
            }

            let topLiked = null, maxLikes = -1;
            let topDwell = null, maxDwell = -1;
            let topCart = null, maxCarts = -1;
            let topCheckout = null, maxCheckouts = -1;

            currentCatalog.forEach(p => {
                const lk = Number(pLikes[p.id]) || 0;
                if (lk > maxLikes) { maxLikes = lk; topLiked = p; }

                const dw = Number(pDwell[p.id]) || 0;
                if (dw > maxDwell) { maxDwell = dw; topDwell = p; }

                const ct = Number(pCarts[p.id]) || 0;
                if (ct > maxCarts) { maxCarts = ct; topCart = p; }

                const ck = Number(pCheckouts[p.id]) || 0;
                if (ck > maxCheckouts) { maxCheckouts = ck; topCheckout = p; }
            });

            const fallback = currentCatalog[0] || { title: 'No pieces yet', image: 'images/placeholder.webp' };
            if (!topLiked) topLiked = fallback;
            if (!topDwell) topDwell = fallback;
            if (!topCart) topCart = fallback;
            if (!topCheckout) topCheckout = fallback;

            const totalLikesAll = Object.values(pLikes).reduce((s, v) => s + (Number(v) || 0), 0);
            const totalDwellSecAll = Object.values(pDwell).reduce((s, v) => s + (Number(v) || 0), 0);
            const totalDwellMinsAll = Math.round(totalDwellSecAll / 60);
            const totalCartsAll = Object.values(pCarts).reduce((s, v) => s + (Number(v) || 0), 0);
            const totalCheckoutsAll = Object.values(pCheckouts).reduce((s, v) => s + (Number(v) || 0), 0);

            const topDwellSec = Math.max(0, maxDwell);
            const dwMins = Math.floor(topDwellSec / 60);
            const dwSecs = topDwellSec % 60;
            const topDwellStr = dwMins > 0 ? `${dwMins}m ${dwSecs}s` : `${dwSecs}s`;

            const totInteractions = Math.max(1, totalLikesAll + totalDwellMinsAll + totalCartsAll + totalCheckoutsAll);
            const degL = (totalLikesAll / totInteractions) * 360;
            const degD = degL + ((totalDwellMinsAll / totInteractions) * 360);
            const degC = degD + ((totalCartsAll / totInteractions) * 360);
            const hasData = (totalLikesAll + totalDwellMinsAll + totalCartsAll + totalCheckoutsAll) > 0;
            const conicChamps = hasData
                ? `conic-gradient(#ec4899 0deg ${degL}deg, #3b82f6 ${degL}deg ${degD}deg, #f59e0b ${degD}deg ${degC}deg, #10b981 ${degC}deg 360deg)`
                : `conic-gradient(#ec4899 0deg 90deg, #3b82f6 90deg 180deg, #f59e0b 180deg 270deg, #10b981 270deg 360deg)`;

            topProductsContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 1.25rem; align-items: center;">
                    <!-- Circle Donut Visual: Interaction Pillars Share -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.5rem 0.75rem; border-right: 1px solid var(--admin-border); min-width: 120px;">
                        <div style="width: 82px; height: 82px; border-radius: 50%; background: ${conicChamps}; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--admin-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                                <span style="font-size: 0.82rem; font-weight: 800; color: var(--admin-text-main); font-family: 'Outfit', sans-serif;">Top</span>
                                <span style="font-size: 0.58rem; color: var(--admin-text-muted);">Picks</span>
                            </div>
                        </div>
                        <span style="font-size: 0.72rem; color: var(--admin-primary); font-weight: 700; margin-top: 0.45rem;">View Graphs 📊</span>
                    </div>

                    <!-- 4 Champion Spotlight Cards -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 0.65rem;">
                        <!-- 1. Most Liked -->
                        <div class="champion-card" onclick="event.stopPropagation(); MrymifyAdmin.showProductDetailsModal('${topLiked.id}')" title="Click to view full details for ${escapeHtml(topLiked.title)}" style="padding: 0.6rem 0.75rem; background: var(--admin-bg); border-radius: 8px; border: 1.5px solid var(--admin-border); display: flex; align-items: center; gap: 0.65rem; cursor: pointer;">
                            <img src="${topLiked.image || 'images/placeholder.webp'}" alt="" style="width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--admin-border);" />
                            <div style="overflow: hidden; min-width: 0; flex: 1;">
                                <div style="font-size: 0.66rem; font-weight: 800; color: #ec4899; text-transform: uppercase; margin-bottom: 2px;">❤️ Most Liked</div>
                                <div style="font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--admin-text-main);" title="${escapeHtml(topLiked.title)}">${escapeHtml(topLiked.title)}</div>
                                <div style="margin-top: 3px;">
                                    <span style="font-size: 0.72rem; font-weight: 700; color: #ec4899; background: rgba(236, 72, 153, 0.1); padding: 1px 6px; border-radius: 4px;">${Math.max(0, maxLikes)} likes</span>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Longest Dwell Time -->
                        <div class="champion-card" onclick="event.stopPropagation(); MrymifyAdmin.showProductDetailsModal('${topDwell.id}')" title="Click to view full details for ${escapeHtml(topDwell.title)}" style="padding: 0.6rem 0.75rem; background: var(--admin-bg); border-radius: 8px; border: 1.5px solid var(--admin-border); display: flex; align-items: center; gap: 0.65rem; cursor: pointer;">
                            <img src="${topDwell.image || 'images/placeholder.webp'}" alt="" style="width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--admin-border);" />
                            <div style="overflow: hidden; min-width: 0; flex: 1;">
                                <div style="font-size: 0.66rem; font-weight: 800; color: #3b82f6; text-transform: uppercase; margin-bottom: 2px;">⏱️ Longest Dwell</div>
                                <div style="font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--admin-text-main);" title="${escapeHtml(topDwell.title)}">${escapeHtml(topDwell.title)}</div>
                                <div style="margin-top: 3px;">
                                    <span style="font-size: 0.72rem; font-weight: 700; color: #3b82f6; background: rgba(59, 130, 246, 0.1); padding: 1px 6px; border-radius: 4px;">${topDwellStr} (${pViews[topDwell.id] || 0} unique views 🔒)</span>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Most Bagged -->
                        <div class="champion-card" onclick="event.stopPropagation(); MrymifyAdmin.showProductDetailsModal('${topCart.id}')" title="Click to view full details for ${escapeHtml(topCart.title)}" style="padding: 0.6rem 0.75rem; background: var(--admin-bg); border-radius: 8px; border: 1.5px solid var(--admin-border); display: flex; align-items: center; gap: 0.65rem; cursor: pointer;">
                            <img src="${topCart.image || 'images/placeholder.webp'}" alt="" style="width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--admin-border);" />
                            <div style="overflow: hidden; min-width: 0; flex: 1;">
                                <div style="font-size: 0.66rem; font-weight: 800; color: #f59e0b; text-transform: uppercase; margin-bottom: 2px;">🧺 Most Bagged</div>
                                <div style="font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--admin-text-main);" title="${escapeHtml(topCart.title)}">${escapeHtml(topCart.title)}</div>
                                <div style="margin-top: 3px;">
                                    <span style="font-size: 0.72rem; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 1px 6px; border-radius: 4px;">${Math.max(0, maxCarts)} cart adds</span>
                                </div>
                            </div>
                        </div>

                        <!-- 4. Top Checkouts -->
                        <div class="champion-card" onclick="event.stopPropagation(); MrymifyAdmin.showProductDetailsModal('${topCheckout.id}')" title="Click to view full details for ${escapeHtml(topCheckout.title)}" style="padding: 0.6rem 0.75rem; background: var(--admin-bg); border-radius: 8px; border: 1.5px solid var(--admin-border); display: flex; align-items: center; gap: 0.65rem; cursor: pointer;">
                            <img src="${topCheckout.image || 'images/placeholder.webp'}" alt="" style="width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--admin-border);" />
                            <div style="overflow: hidden; min-width: 0; flex: 1;">
                                <div style="font-size: 0.66rem; font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 2px;">🛍️ Top Checkout</div>
                                <div style="font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--admin-text-main);" title="${escapeHtml(topCheckout.title)}">${escapeHtml(topCheckout.title)}</div>
                                <div style="margin-top: 3px;">
                                    <span style="font-size: 0.72rem; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 1px 6px; border-radius: 4px;">${Math.max(0, maxCheckouts)} ordered</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /* ==========================================================================
       Breakdown Modals & Visitor Intelligence Engine
       ========================================================================== */

    function openRevenueBreakdownModal() {
        const modal = document.getElementById('revenue-breakdown-modal');
        const container = document.getElementById('revenue-breakdown-content');
        if (!modal || !container) return;

        const totalRevenue = currentOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
        const totalGross = currentOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
        const totalDiscount = currentOrders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);
        const totalShipping = currentOrders.reduce((sum, o) => sum + (Number(o.shipping) || 0), 0);

        // Baseline comparison milestone: Rs. 10,000 target
        const baselineTarget = 10000;
        const growthPct = baselineTarget > 0 ? Math.round(((totalRevenue - baselineTarget) / baselineTarget) * 100) : 100;
        const growthSign = growthPct >= 0 ? '+' : '';

        // Aggregate Category Contributions from all order line items
        const categoryMap = {};
        currentOrders.forEach(o => {
            (o.items || []).forEach(item => {
                const cat = item.categoryLabel || item.category || 'Handcrafted Creations';
                const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                categoryMap[cat] = (categoryMap[cat] || 0) + itemTotal;
            });
        });

        const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
        const catTotalSum = categoryEntries.reduce((acc, c) => acc + c[1], 0) || totalGross || 1;

        container.innerHTML = `
            <div class="breakdown-math-box">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                    <span style="font-weight: 700; color: var(--admin-text-main); font-size: 0.95rem;">📐 Revenue Growth & Milestone Formula</span>
                    <span style="font-size: 0.85rem; background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 20px;">
                        ${growthSign}${growthPct}% Performance Index
                    </span>
                </div>
                <code class="breakdown-formula-code">Growth % = ((Current Revenue - Baseline Target) / Baseline Target) × 100%</code>
                <div style="font-size: 0.82rem; color: var(--admin-text-muted); margin-top: 0.35rem;">
                    Current Revenue: <strong>Rs. ${totalRevenue.toLocaleString('en-PK')}</strong> vs. Opening Baseline Target: <strong>Rs. ${baselineTarget.toLocaleString('en-PK')}</strong> = 
                    <span style="color: var(--admin-primary); font-weight: 700;">${growthSign}${growthPct}%</span>
                </div>
            </div>

            <!-- Financial Component Composition -->
            <div style="margin-bottom: 1.25rem;">
                <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--admin-text-main); margin: 0 0 0.6rem;">💵 Order Revenue Components</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
                    <div style="background: var(--admin-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--admin-border);">
                        <div style="font-size: 0.75rem; color: var(--admin-text-muted);">Gross Sales</div>
                        <div style="font-size: 1rem; font-weight: 700; color: var(--admin-text-main);">Rs. ${totalGross.toLocaleString('en-PK')}</div>
                    </div>
                    <div style="background: var(--admin-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--admin-border);">
                        <div style="font-size: 0.75rem; color: #ef4444;">Discounts Applied</div>
                        <div style="font-size: 1rem; font-weight: 700; color: #ef4444;">- Rs. ${totalDiscount.toLocaleString('en-PK')}</div>
                    </div>
                    <div style="background: var(--admin-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--admin-border);">
                        <div style="font-size: 0.75rem; color: #3b82f6;">Shipping Collected</div>
                        <div style="font-size: 1rem; font-weight: 700; color: #3b82f6;">+ Rs. ${totalShipping.toLocaleString('en-PK')}</div>
                    </div>
                    <div style="background: rgba(184, 93, 67, 0.08); padding: 0.75rem; border-radius: 8px; border: 1.5px solid var(--admin-primary);">
                        <div style="font-size: 0.75rem; color: var(--admin-primary); font-weight: 700;">Net Realized Total</div>
                        <div style="font-size: 1rem; font-weight: 800; color: var(--admin-primary);">Rs. ${totalRevenue.toLocaleString('en-PK')}</div>
                    </div>
                </div>
            </div>

            <!-- Small Percentage Category Contributions -->
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                    <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--admin-text-main); margin: 0;">🧶 Category Revenue Contributions (Small % Breakdown)</h4>
                    <span style="font-size: 0.75rem; color: var(--admin-text-muted);">Sum equals 100% of product sales</span>
                </div>
                ${categoryEntries.length ? `
                    <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                        ${categoryEntries.map(([cat, amount]) => {
                            const pct = Math.round((amount / catTotalSum) * 100);
                            return `
                                <div style="background: var(--admin-bg); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--admin-border);">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem;">
                                        <span style="font-weight: 600; color: var(--admin-text-main);">${escapeHtml(cat)}</span>
                                        <span style="font-weight: 700; color: var(--admin-primary);">Rs. ${amount.toLocaleString('en-PK')} <span style="color: var(--admin-text-muted); font-weight: 400;">(${pct}%)</span></span>
                                    </div>
                                    <div class="device-bar-track">
                                        <div class="device-bar-fill" style="width: ${pct}%; background-color: var(--admin-primary);"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : '<div style="color: var(--admin-text-muted); font-size: 0.85rem; padding: 1rem; text-align: center; background: var(--admin-bg); border-radius: 8px;">No category sales logged yet. Placed customer orders will automatically populate this breakdown.</div>'}
            </div>
        `;

        modal.classList.add('open');
    }

    function openOrdersBreakdownModal() {
        const modal = document.getElementById('orders-breakdown-modal');
        const container = document.getElementById('orders-breakdown-content');
        if (!modal || !container) return;

        const totalOrders = currentOrders.length;
        const totalRevenue = currentOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
        const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        // Baseline comparison for orders
        const baselineOrderTarget = 5;
        const orderGrowthPct = baselineOrderTarget > 0 ? Math.round(((totalOrders - baselineOrderTarget) / baselineOrderTarget) * 100) : 100;
        const orderGrowthSign = orderGrowthPct >= 0 ? '+' : '';

        // Status Breakdown
        const statusCounts = {
            pending: 0,
            crafting: 0,
            dispatched: 0,
            delivered: 0,
            cancelled: 0
        };
        currentOrders.forEach(o => {
            const st = (o.status || 'pending').toLowerCase();
            if (statusCounts[st] !== undefined) statusCounts[st]++;
            else statusCounts.pending++;
        });

        const statusMeta = [
            { key: 'pending', label: '⏳ Pending Confirmation', color: '#f59e0b', count: statusCounts.pending },
            { key: 'crafting', label: '🧶 In Crafting Stage', color: '#8b5cf6', count: statusCounts.crafting },
            { key: 'dispatched', label: '🚚 Dispatched with Courier', color: '#3b82f6', count: statusCounts.dispatched },
            { key: 'delivered', label: '✨ Successfully Delivered', color: '#10b981', count: statusCounts.delivered },
            { key: 'cancelled', label: '❌ Cancelled / Void', color: '#ef4444', count: statusCounts.cancelled }
        ];

        // City breakdown of orders
        const cityOrderMap = {};
        currentOrders.forEach(o => {
            const city = (o.customer && o.customer.city) ? o.customer.city : 'Direct / Unspecified';
            cityOrderMap[city] = (cityOrderMap[city] || 0) + 1;
        });
        const cityEntries = Object.entries(cityOrderMap).sort((a, b) => b[1] - a[1]);

        container.innerHTML = `
            <div class="breakdown-math-box">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                    <span style="font-weight: 700; color: var(--admin-text-main); font-size: 0.95rem;">📐 Order Volume Growth Formula</span>
                    <span style="font-size: 0.85rem; background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 20px;">
                        ${orderGrowthSign}${orderGrowthPct}% Growth Index
                    </span>
                </div>
                <code class="breakdown-formula-code">Growth % = ((Current Orders - Baseline Target) / Baseline Target) × 100%</code>
                <div style="font-size: 0.82rem; color: var(--admin-text-muted); margin-top: 0.35rem;">
                    Current Orders: <strong>${totalOrders}</strong> vs. Target Benchmark: <strong>${baselineOrderTarget}</strong> | Average Order Value (AOV): <strong style="color: var(--admin-primary);">Rs. ${aov.toLocaleString('en-PK')}</strong>
                </div>
            </div>

            <!-- Status Distribution & Small Percentage Contributions -->
            <div style="margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                    <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--admin-text-main); margin: 0;">📦 Fulfillment Status Contributions (Small % Breakdown)</h4>
                    <span style="font-size: 0.75rem; color: var(--admin-text-muted);">Sum equals 100% of order volume</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                    ${statusMeta.map(sm => {
                        const pct = totalOrders > 0 ? Math.round((sm.count / totalOrders) * 100) : 0;
                        return `
                            <div style="background: var(--admin-bg); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--admin-border);">
                                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 600; color: var(--admin-text-main);">${sm.label}</span>
                                    <span style="font-weight: 700; color: ${sm.color};">${sm.count} order${sm.count === 1 ? '' : 's'} <span style="color: var(--admin-text-muted); font-weight: 400;">(${pct}%)</span></span>
                                </div>
                                <div class="device-bar-track">
                                    <div class="device-bar-fill" style="width: ${pct}%; background-color: ${sm.color};"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Geographic City Order Delivery Split -->
            <div>
                <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--admin-text-main); margin: 0 0 0.6rem;">📍 Customer Delivery Cities</h4>
                ${cityEntries.length ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.65rem;">
                        ${cityEntries.map(([city, count]) => `
                            <div style="background: var(--admin-bg); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--admin-border); display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.82rem; font-weight: 600; color: var(--admin-text-main);">📍 ${escapeHtml(city)}</span>
                                <span class="location-count-badge">${count} order${count === 1 ? '' : 's'}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div style="color: var(--admin-text-muted); font-size: 0.85rem; padding: 0.75rem; text-align: center; background: var(--admin-bg); border-radius: 8px;">No delivery destinations logged yet.</div>'}
            </div>
        `;

        modal.classList.add('open');
    }

    let cachedVisitorSessions = [];

    function openVisitorIntelligenceModal() {
        const modal = document.getElementById('visitor-intelligence-modal');
        const metersContainer = document.getElementById('visitor-avg-meters-container');
        const countBadge = document.getElementById('visitor-sessions-count-badge');
        if (!modal || !metersContainer) return;

        let stats = {
            totalVisitors: 1,
            sessionsCount: 1,
            avgStayStr: '2m 30s',
            avgLikesPerUser: '0.0',
            avgViewStr: '35s',
            sessions: []
        };

        if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.getCombinedVisitorStats === 'function') {
            stats = window.MrymifyAnalytics.getCombinedVisitorStats();
        } else {
            try {
                const raw = localStorage.getItem('mrymify_visitor_sessions');
                stats.sessions = raw ? JSON.parse(raw) : [];
                stats.sessionsCount = stats.sessions.length;
            } catch(e) {}
        }

        cachedVisitorSessions = stats.sessions || [];

        // 1. Render Combined Average Meters Bar above list
        metersContainer.innerHTML = `
            <div class="avg-meter-card">
                <div class="avg-meter-icon" style="color: #6366f1;">⏱️</div>
                <div>
                    <div class="avg-meter-lbl">Average Stay Time</div>
                    <div class="avg-meter-val">${stats.avgStayStr}</div>
                    <div style="font-size: 0.72rem; color: var(--admin-text-muted);">Across all boutique visits</div>
                </div>
            </div>
            <div class="avg-meter-card">
                <div class="avg-meter-icon" style="color: #ef4444;">❤️</div>
                <div>
                    <div class="avg-meter-lbl">Average Likes / User</div>
                    <div class="avg-meter-val">${stats.avgLikesPerUser}</div>
                    <div style="font-size: 0.72rem; color: var(--admin-text-muted);">Pieces favorited per visitor</div>
                </div>
            </div>
            <div class="avg-meter-card">
                <div class="avg-meter-icon" style="color: var(--admin-primary);">👁️</div>
                <div>
                    <div class="avg-meter-lbl">Avg Product View Dwell</div>
                    <div class="avg-meter-val">${stats.avgViewStr}</div>
                    <div style="font-size: 0.72rem; color: var(--admin-text-muted);">From click to close/next piece</div>
                </div>
            </div>
        `;

        if (countBadge) {
            countBadge.textContent = `${cachedVisitorSessions.length} Unique Visitor Session${cachedVisitorSessions.length === 1 ? '' : 's'}`;
        }

        renderVisitorJourneysList(cachedVisitorSessions);
        modal.classList.add('open');
    }

    function renderVisitorJourneysList(sessions) {
        const container = document.getElementById('visitor-journeys-list');
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 1.5rem; background: var(--admin-bg); border-radius: 12px; border: 1.5px dashed var(--admin-border);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
                    <h4 style="font-size: 1rem; color: var(--admin-text-main); margin: 0 0 0.35rem;">No Visitor Sessions Tracked Yet</h4>
                    <p style="font-size: 0.82rem; color: var(--admin-text-muted); margin: 0;">Visitor sessions, display sizes, dwell times, and click paths will be logged automatically as visitors browse.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map((s, idx) => {
            const stayMin = Math.floor((s.stayTimeSeconds || 0) / 60);
            const staySec = (s.stayTimeSeconds || 0) % 60;
            const stayFormatted = `${stayMin}m ${staySec}s`;
            const likesCount = Array.isArray(s.likesGiven) ? s.likesGiven.length : 0;
            const history = Array.isArray(s.history) ? s.history : [];
            const displayStr = s.screenWidth && s.screenHeight ? `${s.screenWidth}×${s.screenHeight} (${s.deviceType || 'Screen'})` : (s.deviceType || 'Display');
            const cityDisplay = s.city ? `📍 ${escapeHtml(s.city)}` : '📍 Gujranwala / Browsing';

            return `
                <div class="visitor-journey-card" id="v-card-${idx}">
                    <div class="visitor-journey-header" onclick="MrymifyAdmin.toggleVisitorTimeline(${idx})">
                        <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                            <span class="visitor-id-tag">🆔 ${escapeHtml(s.id || 'USR-UNKNOWN')}</span>
                            <span class="visitor-badge-city">${cityDisplay}</span>
                            <span class="visitor-badge-device">🖥️ ${escapeHtml(displayStr)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.85rem; font-size: 0.82rem;">
                            <span title="Total time spent browsing">⏱️ <strong>${stayFormatted}</strong></span>
                            <span title="Creations favorited">❤️ <strong>${likesCount} liked</strong></span>
                            <span style="font-size: 0.78rem; color: var(--admin-primary); font-weight: 700;">
                                ${history.length} Actions ▾
                            </span>
                        </div>
                    </div>

                    <!-- Chronological Action Journey Timeline -->
                    <div class="visitor-timeline-list" id="v-timeline-${idx}" style="display: none;">
                        ${history.length ? history.map(item => `
                            <div class="visitor-timeline-item">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 0.9rem;">📍</span>
                                    <div>
                                        <span class="visitor-timeline-action">${escapeHtml(item.action || 'Action')}:</span>
                                        <span style="color: var(--admin-text-muted); margin-left: 0.25rem;">${escapeHtml(item.detail || '')}</span>
                                    </div>
                                </div>
                                <span class="visitor-timeline-time">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                        `).join('') : '<div style="color: var(--admin-text-muted); font-size: 0.78rem; padding: 0.35rem 0;">No individual actions logged for this session yet.</div>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    function toggleVisitorTimeline(idx) {
        const timeline = document.getElementById(`v-timeline-${idx}`);
        if (!timeline) return;
        timeline.style.display = timeline.style.display === 'none' ? 'flex' : 'none';
    }

    function filterVisitorJourneys(query) {
        const q = (query || '').toLowerCase().trim();
        if (!q) {
            renderVisitorJourneysList(cachedVisitorSessions);
            return;
        }
        const filtered = cachedVisitorSessions.filter(s => {
            const id = (s.id || '').toLowerCase();
            const city = (s.city || '').toLowerCase();
            const dev = (s.deviceType || '').toLowerCase();
            return id.includes(q) || city.includes(q) || dev.includes(q);
        });
        renderVisitorJourneysList(filtered);
    }

    /* ==========================================================================
       Product Intelligence & Individual Count Graphs Modal
       ========================================================================== */

    let activeProductMetricTab = 'all';
    let productAnalyticsFilter = '';

    function openProductAnalyticsModal() {
        const modal = document.getElementById('product-analytics-modal');
        if (!modal) return;
        modal.classList.add('open');
        renderProductAnalyticsModal();
    }

    function switchProductMetricTab(metric) {
        activeProductMetricTab = metric || 'all';
        document.querySelectorAll('#product-analytics-tab-buttons .filter-tab').forEach(btn => {
            if (btn.dataset.metric === activeProductMetricTab) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        renderProductAnalyticsModal();
    }

    function filterProductAnalytics(query) {
        productAnalyticsFilter = (query || '').toLowerCase().trim();
        renderProductAnalyticsModal();
    }

    function renderProductAnalyticsModal() {
        const container = document.getElementById('product-analytics-graphs-content');
        const tbody = document.getElementById('product-analytics-table-tbody');
        const countBadge = document.getElementById('product-analytics-table-count');
        if (!container) return;

        const analytics = getStoreAnalytics();
        const pLikes = JSON.parse(localStorage.getItem('mrymify_product_likes') || '{}');
        const pDwell = analytics.productDwellTime || {};
        const pViews = analytics.productViews || {};
        const pCarts = analytics.productCarts || {};

        const pCheckouts = {};
        currentOrders.forEach(o => {
            (o.items || []).forEach(it => {
                const id = it.id || it.productId;
                if (id) {
                    pCheckouts[id] = (pCheckouts[id] || 0) + Number(it.quantity || it.qty || 1);
                }
            });
        });
        if (analytics.productCheckouts && typeof analytics.productCheckouts === 'object') {
            Object.entries(analytics.productCheckouts).forEach(([id, cnt]) => {
                if (id && Number(cnt) > 0 && !pCheckouts[id]) {
                    pCheckouts[id] = Number(cnt);
                }
            });
        }

        const filtered = currentCatalog.filter(p => {
            if (!productAnalyticsFilter) return true;
            const t = (p.title || '').toLowerCase();
            const c = (p.categoryLabel || p.category || '').toLowerCase();
            return t.includes(productAnalyticsFilter) || c.includes(productAnalyticsFilter);
        });

        if (countBadge) countBadge.textContent = `${filtered.length} piece${filtered.length === 1 ? '' : 's'} listed`;

        // Helper to render an individual metric circle graph block
        function makeMetricCircleBlock(title, icon, metricKey, colorPalette, formatValFn) {
            const sorted = [...filtered].sort((a, b) => {
                const valA = metricKey === 'likes' ? (pLikes[a.id] || 0)
                    : metricKey === 'dwell' ? (pDwell[a.id] || 0)
                    : metricKey === 'carts' ? (pCarts[a.id] || 0)
                    : (pCheckouts[a.id] || 0);
                const valB = metricKey === 'likes' ? (pLikes[b.id] || 0)
                    : metricKey === 'dwell' ? (pDwell[b.id] || 0)
                    : metricKey === 'carts' ? (pCarts[b.id] || 0)
                    : (pCheckouts[b.id] || 0);
                return valB - valA;
            });

            const topItems = sorted.slice(0, 6).filter(p => {
                const v = metricKey === 'likes' ? (pLikes[p.id] || 0)
                    : metricKey === 'dwell' ? (pDwell[p.id] || 0)
                    : metricKey === 'carts' ? (pCarts[p.id] || 0)
                    : (pCheckouts[p.id] || 0);
                return v > 0;
            });

            const total = topItems.reduce((acc, p) => {
                const v = metricKey === 'likes' ? (pLikes[p.id] || 0)
                    : metricKey === 'dwell' ? (pDwell[p.id] || 0)
                    : metricKey === 'carts' ? (pCarts[p.id] || 0)
                    : (pCheckouts[p.id] || 0);
                return acc + v;
            }, 0);

            if (topItems.length === 0 || total === 0) {
                return `
                    <div style="background: var(--admin-bg); border-radius: 12px; border: 1px solid var(--admin-border); padding: 1.15rem; text-align: center;">
                        <div style="font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--admin-text-main);">${icon} ${title}</div>
                        <div style="font-size: 0.76rem; color: var(--admin-text-muted); padding: 1.5rem 0;">No ${title.toLowerCase()} recorded yet.</div>
                    </div>
                `;
            }

            let curr = 0;
            const stops = [];
            const pieData = topItems.map((p, idx) => {
                const val = metricKey === 'likes' ? (pLikes[p.id] || 0)
                    : metricKey === 'dwell' ? (pDwell[p.id] || 0)
                    : metricKey === 'carts' ? (pCarts[p.id] || 0)
                    : (pCheckouts[p.id] || 0);
                const pct = Math.round((val / total) * 100);
                const color = colorPalette[idx % colorPalette.length];
                const deg = (val / total) * 360;
                const sDeg = curr;
                const eDeg = curr + deg;
                curr = eDeg;
                stops.push(`${color} ${sDeg.toFixed(1)}deg ${eDeg.toFixed(1)}deg`);
                return { product: p, val, pct, color };
            });

            if (stops.length > 0) {
                const last = stops.length - 1;
                const parts = stops[last].split(' ');
                stops[last] = `${parts[0]} ${parts[1]} 360deg`;
            }

            const conicBg = `conic-gradient(${stops.join(', ')})`;
            const topSlice = pieData[0];

            return `
                <div style="background: var(--admin-bg); border-radius: 12px; border: 1px solid var(--admin-border); padding: 1rem;">
                    <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.85rem; color: var(--admin-text-main); display: flex; justify-content: space-between; align-items: center;">
                        <span>${icon} ${title}</span>
                        <span style="font-size: 0.72rem; color: var(--admin-text-muted);">Top ${topItems.length} pieces</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-around; gap: 0.85rem;">
                        <div style="width: 88px; height: 88px; border-radius: 50%; background: ${conicBg}; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                            <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--admin-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2px;">
                                <span style="font-size: 0.9rem; font-weight: 800; color: var(--admin-text-main); font-family: 'Outfit', sans-serif;">${topSlice.pct}%</span>
                                <span style="font-size: 0.58rem; color: var(--admin-primary); font-weight: 700;">#1 Piece</span>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.76rem; flex: 1; min-width: 140px; max-height: 140px; overflow-y: auto; padding-right: 0.2rem;">
                            ${pieData.map(d => `
                                <div class="product-graph-item" onclick="MrymifyAdmin.showProductDetailsModal('${d.product.id}')" title="Click to view full piece details for ${escapeHtml(d.product.title)}" style="display: flex; align-items: center; justify-content: space-between; gap: 0.65rem; padding: 0.4rem 0.6rem; background: var(--admin-surface); border-radius: 8px; border: 1px solid var(--admin-border); cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1;">
                                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${d.color}; flex-shrink: 0;"></span>
                                        <div style="overflow: hidden; min-width: 0;">
                                            <div style="font-weight: 700; font-size: 0.8rem; color: var(--admin-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(d.product.title)}">
                                                ${escapeHtml(d.product.title)}
                                            </div>
                                            <div style="font-size: 0.66rem; color: var(--admin-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                ${escapeHtml(d.product.categoryLabel || d.product.category || 'Handcrafted')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; background: var(--admin-bg); padding: 0.22rem 0.45rem; border-radius: 6px; border: 1px solid var(--admin-border);">
                                        <strong style="font-size: 0.74rem; color: var(--admin-text-main);">${formatValFn(d.val)}</strong>
                                        <span style="font-size: 0.68rem; font-weight: 700; color: ${d.color};">(${d.pct}%)</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        const fmtDwell = sec => {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return m > 0 ? `${m}m ${s}s` : `${s}s`;
        };

        if (activeProductMetricTab === 'all') {
            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                    ${makeMetricCircleBlock('Most Liked Products', '❤️', 'likes', ['#ec4899', '#f43f5e', '#fb7185', '#fda4af', '#f472b6'], v => `${v} likes`)}
                    ${makeMetricCircleBlock('Longest Dwell Time', '⏱️', 'dwell', ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8'], fmtDwell)}
                    ${makeMetricCircleBlock('Added to Bag (Carts)', '🧺', 'carts', ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309'], v => `${v} adds`)}
                    ${makeMetricCircleBlock('Completed Checkouts', '🛍️', 'checkouts', ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857'], v => `${v} orders`)}
                </div>
            `;
        } else if (activeProductMetricTab === 'likes') {
            container.innerHTML = makeMetricCircleBlock('Most Liked Products (Individual Counts)', '❤️', 'likes', ['#ec4899', '#f43f5e', '#fb7185', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'], v => `${v} likes`);
        } else if (activeProductMetricTab === 'dwell') {
            container.innerHTML = makeMetricCircleBlock('Product Dwell Time & Views (Individual Counts)', '⏱️', 'dwell', ['#3b82f6', '#60a5fa', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'], fmtDwell);
        } else if (activeProductMetricTab === 'carts') {
            container.innerHTML = makeMetricCircleBlock('Added to Bag (Individual Counts)', '🧺', 'carts', ['#f59e0b', '#fbbf24', '#d97706', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'], v => `${v} bag additions`);
        } else if (activeProductMetricTab === 'checkouts') {
            container.innerHTML = makeMetricCircleBlock('Completed Product Checkouts (Individual Counts)', '🛍️', 'checkouts', ['#10b981', '#34d399', '#059669', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'], v => `${v} checkouts`);
        }

        // Render Table Rows sorted by active metric
        if (tbody) {
            const tableSorted = [...filtered].sort((a, b) => {
                if (activeProductMetricTab === 'likes') return (pLikes[b.id] || 0) - (pLikes[a.id] || 0);
                if (activeProductMetricTab === 'dwell') return (pDwell[b.id] || 0) - (pDwell[a.id] || 0);
                if (activeProductMetricTab === 'carts') return (pCarts[b.id] || 0) - (pCarts[a.id] || 0);
                if (activeProductMetricTab === 'checkouts') return (pCheckouts[b.id] || 0) - (pCheckouts[a.id] || 0);
                const sA = (pLikes[a.id] || 0) * 2 + (pDwell[a.id] || 0) + (pCarts[a.id] || 0) * 5 + (pCheckouts[a.id] || 0) * 10;
                const sB = (pLikes[b.id] || 0) * 2 + (pDwell[b.id] || 0) + (pCarts[b.id] || 0) * 5 + (pCheckouts[b.id] || 0) * 10;
                return sB - sA;
            });

            if (tableSorted.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">No matching products found.</td></tr>`;
            } else {
                tbody.innerHTML = tableSorted.map(prod => {
                    const lk = pLikes[prod.id] || 0;
                    const dwSec = pDwell[prod.id] || 0;
                    const ct = pCarts[prod.id] || 0;
                    const ck = pCheckouts[prod.id] || 0;
                    const dwStr = fmtDwell(dwSec);

                    return `
                        <tr onclick="MrymifyAdmin.showProductDetailsModal('${prod.id}')" style="cursor: pointer;" title="Click to view full product details">
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.65rem;">
                                    <img src="${prod.image || 'images/placeholder.webp'}" alt="${prod.title}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;" />
                                    <strong style="font-size: 0.85rem; color: var(--admin-text-main);">${escapeHtml(prod.title)} <span style="font-size: 0.72rem; color: var(--admin-primary); margin-left: 3px;">↗</span></strong>
                                </div>
                            </td>
                            <td><span style="font-size: 0.8rem; color: var(--admin-text-muted);">${escapeHtml(prod.categoryLabel || prod.category || 'Handcrafted')}</span></td>
                            <td><span style="font-weight: 700; color: #ec4899;">❤️ ${lk}</span></td>
                            <td><span style="font-weight: 600; color: #3b82f6;">⏱️ ${dwStr}</span></td>
                            <td><span style="font-weight: 700; color: #f59e0b;">🧺 ${ct}</span></td>
                            <td><span style="font-weight: 700; color: #10b981;">🛍️ ${ck}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    /**
     * Show Comprehensive Product Details Inspection Modal
     */
    function showProductDetailsModal(productId) {
        if (!productId) return;
        const prod = currentCatalog.find(p => p.id === productId);
        if (!prod) return;

        const modal = document.getElementById('product-details-inspector-modal');
        const titleEl = document.getElementById('inspector-modal-title');
        const bodyEl = document.getElementById('product-details-inspector-body');
        const footerEl = document.getElementById('product-details-inspector-footer');
        if (!modal || !bodyEl) return;

        if (titleEl) titleEl.textContent = `🧶 ${prod.title}`;

        const analytics = getStoreAnalytics();
        const pLikes = JSON.parse(localStorage.getItem('mrymify_product_likes') || '{}');
        const pDwell = analytics.productDwellTime || {};
        const pViews = analytics.productViews || {};
        const pCarts = analytics.productCarts || {};
        const pCustom = analytics.customizationClicks || {};

        let pCheckoutCount = 0;
        currentOrders.forEach(o => {
            (o.items || []).forEach(it => {
                const itId = it.id || it.productId;
                if (itId === prod.id) {
                    pCheckoutCount += Number(it.quantity || it.qty || 1);
                }
            });
        });
        if (analytics.productCheckouts && analytics.productCheckouts[prod.id]) {
            pCheckoutCount = Math.max(pCheckoutCount, Number(analytics.productCheckouts[prod.id]));
        }

        const likes = Number(pLikes[prod.id]) || 0;
        const dwellSec = Number(pDwell[prod.id]) || 0;
        const dwMins = Math.floor(dwellSec / 60);
        const dwSecs = dwellSec % 60;
        const dwellFormatted = dwMins > 0 ? `${dwMins}m ${dwSecs}s` : `${dwSecs}s`;
        const views = Number(pViews[prod.id]) || 0;
        const carts = Number(pCarts[prod.id]) || 0;
        const customClicks = Number(pCustom[prod.id]) || 0;

        const galleryHtml = Array.isArray(prod.galleryImages) && prod.galleryImages.length
            ? `<div style="display: flex; gap: 0.5rem; margin-top: 0.65rem; overflow-x: auto; padding-bottom: 0.35rem;">
                ${prod.galleryImages.map(imgSrc => `
                    <img src="${imgSrc}" alt="" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1.5px solid var(--admin-border); flex-shrink: 0; cursor: pointer;" onclick="const m = document.getElementById('inspector-cover-img'); if (m) m.src = '${imgSrc}';" />
                `).join('')}
               </div>`
            : '';

        const origPriceHtml = prod.originalPrice && prod.originalPrice > prod.price
            ? `<span style="text-decoration: line-through; color: var(--admin-text-muted); font-size: 0.95rem; margin-left: 0.4rem;">Rs. ${Number(prod.originalPrice).toLocaleString('en-PK')}</span>`
            : '';

        bodyEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 240px 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: start;">
                <!-- Product Image Preview -->
                <div>
                    <div style="position: relative; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--admin-border); aspect-ratio: 1; background: var(--admin-bg);">
                        <img id="inspector-cover-img" src="${prod.image || 'images/placeholder.webp'}" alt="${prod.title}" style="width: 100%; height: 100%; object-fit: cover;" />
                        ${prod.badge ? `<span style="position: absolute; top: 8px; left: 8px; background: var(--admin-primary); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;">${escapeHtml(prod.badge)}</span>` : ''}
                    </div>
                    ${galleryHtml}
                </div>

                <!-- Product Attributes & Info -->
                <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--admin-primary); background: rgba(236, 72, 153, 0.12); padding: 2px 8px; border-radius: 6px;">
                            ${escapeHtml(prod.categoryLabel || prod.category || 'Handcrafted')}
                        </span>
                        ${prod.isFeatured ? '<span style="font-size: 0.75rem; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: 6px;">⭐ Featured</span>' : ''}
                        ${prod.unlisted ? '<span style="font-size: 0.75rem; font-weight: 700; color: #ef4444; background: rgba(239, 68, 68, 0.12); padding: 2px 8px; border-radius: 6px;">👁️ Unlisted Piece</span>' : '<span style="font-size: 0.75rem; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 2px 8px; border-radius: 6px;">Active in Catalog</span>'}
                    </div>

                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--admin-text-main); margin: 0; line-height: 1.3;">${escapeHtml(prod.title)}</h3>

                    <div style="display: flex; align-items: baseline; gap: 0.35rem;">
                        <span style="font-size: 1.35rem; font-weight: 800; color: var(--admin-text-main);">Rs. ${Number(prod.price || 0).toLocaleString('en-PK')}</span>
                        ${origPriceHtml}
                    </div>

                    <div style="font-size: 0.8rem; color: var(--admin-text-muted); display: flex; align-items: center; gap: 0.4rem;">
                        <span>⏱️ Estimated Crafting Time:</span>
                        <strong style="color: var(--admin-text-main);">${escapeHtml(prod.estimatedMakingTime || '2-3 Business Days')}</strong>
                    </div>

                    <p style="font-size: 0.84rem; color: var(--admin-text-main); line-height: 1.5; margin: 0.35rem 0 0; background: var(--admin-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--admin-border); max-height: 110px; overflow-y: auto;">
                        ${escapeHtml(prod.description || 'No description provided for this handcrafted creation.')}
                    </p>
                </div>
            </div>

            <!-- Live Audience Telemetry Matrix -->
            <div style="background: var(--admin-bg); border-radius: 12px; border: 1.5px solid var(--admin-border); padding: 1rem;">
                <div style="font-size: 0.88rem; font-weight: 700; color: var(--admin-text-main); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                    <span>📊 Live Telemetry & Audience Engagement</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.65rem;">
                    <div class="telemetry-stat-tile">
                        <span style="font-size: 0.72rem; font-weight: 700; color: #ec4899;">❤️ True Likes</span>
                        <strong style="font-size: 1.15rem; color: var(--admin-text-main);">${likes}</strong>
                        <span style="font-size: 0.66rem; color: var(--admin-text-muted);">Customer favorites</span>
                    </div>
                    <div class="telemetry-stat-tile">
                        <span style="font-size: 0.72rem; font-weight: 700; color: #3b82f6;">⏱️ Dwell Time</span>
                        <strong style="font-size: 1.15rem; color: var(--admin-text-main);">${dwellFormatted}</strong>
                        <span style="font-size: 0.66rem; color: var(--admin-text-muted);">${views} unique viewer${views === 1 ? '' : 's'} 🔒</span>
                    </div>
                    <div class="telemetry-stat-tile">
                        <span style="font-size: 0.72rem; font-weight: 700; color: #f59e0b;">🧺 Added to Bag</span>
                        <strong style="font-size: 1.15rem; color: var(--admin-text-main);">${carts}</strong>
                        <span style="font-size: 0.66rem; color: var(--admin-text-muted);">Shopping cart adds</span>
                    </div>
                    <div class="telemetry-stat-tile">
                        <span style="font-size: 0.72rem; font-weight: 700; color: #10b981;">🛍️ Completed Orders</span>
                        <strong style="font-size: 1.15rem; color: var(--admin-text-main);">${pCheckoutCount}</strong>
                        <span style="font-size: 0.66rem; color: var(--admin-text-muted);">Purchased units</span>
                    </div>
                    <div class="telemetry-stat-tile">
                        <span style="font-size: 0.72rem; font-weight: 700; color: #8b5cf6;">✏️ Studio Clicks</span>
                        <strong style="font-size: 1.15rem; color: var(--admin-text-main);">${customClicks}</strong>
                        <span style="font-size: 0.66rem; color: var(--admin-text-muted);">Custom inquiries</span>
                    </div>
                </div>
            </div>
        `;

        if (footerEl) {
            footerEl.innerHTML = `
                <div style="font-size: 0.78rem; color: var(--admin-text-muted);">
                    Piece ID: <code style="background: var(--admin-bg); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--admin-border);">${escapeHtml(prod.id)}</code>
                </div>
                <div style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;">
                    <button type="button" class="btn-admin btn-admin-secondary" onclick="MrymifyAdmin.closeModals(); MrymifyAdmin.openProductCreatorModal('${prod.id}');">
                        <span>✏️ Edit in Product Studio</span>
                    </button>
                    <a href="product-details.html?id=${encodeURIComponent(prod.id)}" target="_blank" class="btn-admin btn-admin-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                        <span>🛍️ View on Store ↗</span>
                    </a>
                </div>
            `;
        }

        modal.classList.add('open');
    }

    /* ==========================================================================
       4. Orders Pipeline Management
       ========================================================================== */

    function loadOrders() {
        try {
            const raw = localStorage.getItem('mrymify_orders');
            currentOrders = raw ? JSON.parse(raw) : [];
        } catch (e) {
            currentOrders = [];
        }

        if (currentOrders.length === 0) {
            seedSampleOrders();
        }

        currentOrders.forEach(o => {
            if (!o.status) o.status = 'pending';
        });

        saveOrders();
        updateOrderBadges();
    }

    function saveOrders() {
        try {
            localStorage.setItem('mrymify_orders', JSON.stringify(currentOrders));
        } catch (e) {}
        updateOrderBadges();
    }

    function updateOrderBadges() {
        const badge = document.getElementById('badge-orders-count');
        const activeCount = currentOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
        if (badge) badge.textContent = activeCount;
    }

    function seedSampleOrders() {
        currentOrders = [
            {
                orderId: 'MRY-18920',
                date: 'Sep 3, 2026',
                status: 'crafting',
                customer: {
                    name: 'Ayesha Tariq',
                    phone: '03014567890',
                    city: 'Lahore',
                    address: 'House 42, Block C, Model Town, Lahore',
                    notes: 'Please wrap with pink ribbons for a birthday surprise!',
                    paymentMethod: 'Cash on Delivery (COD)'
                },
                items: [
                    { id: 'prod-01', title: 'Royal Crown Froggy', price: 1450, quantity: 1, image: 'images/products/01_Royal_Crown_Froggy.png' },
                    { id: 'prod-08', title: 'Everlasting Red Rose', price: 650, quantity: 2, image: 'images/products/08_Everlasting_Red_Rose.png' }
                ],
                subtotal: 2750,
                referralCode: 'MARIYAM10',
                discount: 275,
                shipping: 200,
                grandTotal: 2675
            },
            {
                orderId: 'MRY-20412',
                date: 'Sep 2, 2026',
                status: 'ready',
                customer: {
                    name: 'Zainab Fatima',
                    phone: '03218765432',
                    city: 'Gujranwala',
                    address: 'St 4, Model Town, Gujranwala',
                    notes: 'Add handwritten gift note for wedding gift',
                    paymentMethod: 'Bank Transfer / Wire'
                },
                items: [
                    { id: 'prod-07', title: 'Pure White Tulip Bouquet', price: 1800, quantity: 1, image: 'images/products/07_Pure_White_Tulip_Bouquet.png' }
                ],
                subtotal: 1800,
                referralCode: null,
                discount: 0,
                shipping: 200,
                grandTotal: 2000
            }
        ];
        saveOrders();
    }

    function renderOrdersTable() {
        const tbody = document.getElementById('orders-table-tbody');
        if (!tbody) return;

        const filterStatus = document.getElementById('order-filter-status')?.value || 'all';
        const searchQuery = (document.getElementById('order-search-input')?.value || '').trim().toLowerCase();

        let filtered = currentOrders.filter(o => {
            if (filterStatus !== 'all' && o.status !== filterStatus) return false;
            if (searchQuery) {
                const id = (o.orderId || '').toLowerCase();
                const name = (o.customer?.name || '').toLowerCase();
                const phone = (o.customer?.phone || '').toLowerCase();
                const city = (o.customer?.city || '').toLowerCase();
                const notes = (o.customer?.notes || '').toLowerCase();
                const ref = (o.referralCode || '').toLowerCase();
                return id.includes(searchQuery) || name.includes(searchQuery) || phone.includes(searchQuery) || city.includes(searchQuery) || notes.includes(searchQuery) || ref.includes(searchQuery);
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--admin-text-muted);">No orders match your search criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(order => {
            const itemsCount = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
            const statusClass = `status-${order.status || 'pending'}`;
            const refBadge = order.referralCode ? `<span style="display: inline-block; font-size: 0.72rem; padding: 0.15rem 0.45rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border-radius: 4px; font-weight: 700;">🎟️ ${order.referralCode}</span>` : '';

            const paymentStatusBadge = order.paymentVerified
                ? `<span style="display: inline-block; font-size: 0.72rem; padding: 1px 6px; background: rgba(16, 185, 129, 0.12); color: #10b981; border-radius: 4px; font-weight: 700; margin-top: 3px;">✓ Paid</span>`
                : (order.paymentProof 
                    ? `<span style="display: inline-block; font-size: 0.72rem; padding: 1px 6px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; border-radius: 4px; font-weight: 700; margin-top: 3px;">📸 Proof Uploaded</span>`
                    : `<span style="display: inline-block; font-size: 0.72rem; padding: 1px 6px; background: rgba(156, 163, 175, 0.12); color: var(--admin-text-muted); border-radius: 4px; font-weight: 600; margin-top: 3px;">${escapeHtml(order.customer?.paymentMethod || 'COD')}</span>`);

            return `
                <tr onclick="MrymifyAdmin.openOrderDetail('${order.orderId}')" style="cursor: pointer;" title="Click order to view card details, payment proof, and advance stages">
                    <td style="text-align: center;" onclick="event.stopPropagation()">
                        <input type="checkbox" class="order-row-select" value="${order.orderId}" onchange="MrymifyAdmin.onOrderSelectChange()" />
                    </td>
                    <td><strong>#${order.orderId}</strong></td>
                    <td style="color: var(--admin-text-muted); font-size: 0.88rem;">${order.date || 'Today'}</td>
                    <td>
                        <div class="customer-name-cell">
                            <strong>${escapeHtml(order.customer?.name || 'Anonymous')}</strong>
                            <div class="customer-sub-cell">${escapeHtml(order.customer?.city || 'Pakistan')} • ${escapeHtml(order.customer?.phone || '')}</div>
                        </div>
                    </td>
                    <td>${itemsCount} item(s)</td>
                    <td>
                        <div><strong>Rs. ${(Number(order.grandTotal) || 0).toLocaleString('en-PK')}</strong></div>
                        <div style="margin-top: 2px;">${paymentStatusBadge}</div>
                        ${refBadge}
                    </td>
                    <td><span class="status-pill ${statusClass}">${formatStatusLabel(order.status)}</span></td>
                    <td onclick="event.stopPropagation()">
                        <div style="display: flex; gap: 0.35rem; align-items: center;">
                            <button class="action-btn btn-admin-wa" onclick="event.stopPropagation(); MrymifyAdmin.messageCustomerWhatsApp('${order.orderId}')" title="Contact Customer via WhatsApp">📞</button>
                            <button class="action-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35);" onclick="event.stopPropagation(); MrymifyAdmin.deleteSingleOrder('${order.orderId}')" title="Delete false or spam order">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        onOrderSelectChange();
    }

    function toggleSelectAllOrders(master) {
        const isChecked = master ? master.checked : false;
        document.querySelectorAll('.order-row-select').forEach(cb => {
            cb.checked = isChecked;
        });
        onOrderSelectChange();
    }

    function onOrderSelectChange() {
        const checkedBoxes = document.querySelectorAll('.order-row-select:checked');
        const count = checkedBoxes.length;
        const bulkBar = document.getElementById('orders-bulk-actions');
        const countEl = document.getElementById('orders-selected-count');
        const masterCb = document.getElementById('orders-select-all');

        if (countEl) countEl.textContent = count;
        if (bulkBar) bulkBar.style.display = count > 0 ? 'inline-flex' : 'none';

        const allBoxes = document.querySelectorAll('.order-row-select');
        if (masterCb && allBoxes.length > 0) {
            masterCb.checked = (count === allBoxes.length);
            masterCb.indeterminate = (count > 0 && count < allBoxes.length);
        }
    }

    function deleteSelectedOrders() {
        const checkedBoxes = Array.from(document.querySelectorAll('.order-row-select:checked'));
        const ids = checkedBoxes.map(cb => cb.value);
        if (ids.length === 0) return;

        if (!confirm(`Are you sure you want to permanently delete ${ids.length} selected false/spam orders? This action cannot be undone.`)) {
            return;
        }

        const toDelete = new Set(ids);
        currentOrders = currentOrders.filter(o => !toDelete.has(o.orderId));
        saveOrders();
        renderOrdersTable();
        renderOverviewMetrics();

        const bulkBar = document.getElementById('orders-bulk-actions');
        if (bulkBar) bulkBar.style.display = 'none';
        const masterCb = document.getElementById('orders-select-all');
        if (masterCb) {
            masterCb.checked = false;
            masterCb.indeterminate = false;
        }

        alert(`Successfully removed ${ids.length} order(s) from database.`);
    }

    function deleteSingleOrder(orderId, fromModal) {
        if (!confirm(`Are you sure you want to permanently delete Order #${orderId}? This removes false or spam records.`)) {
            return;
        }

        currentOrders = currentOrders.filter(o => o.orderId !== orderId);
        saveOrders();
        if (fromModal) {
            closeModals();
        }
        renderOrdersTable();
        renderOverviewMetrics();
        alert(`Order #${orderId} has been deleted.`);
    }

    function formatStatusLabel(st) {
        switch (st) {
            case 'crafting': return '🧶 Crafting';
            case 'ready': return '✨ Ready';
            case 'dispatched': return '🚚 Dispatched';
            case 'delivered': return '✅ Delivered';
            case 'cancelled': return '❌ Cancelled';
            default: return '⏳ Pending';
        }
    }

    function openOrderDetail(orderId) {
        const order = currentOrders.find(o => o.orderId === orderId);
        if (!order) return;

        const modal = document.getElementById('order-detail-modal');
        const titleEl = document.getElementById('modal-order-title');
        const contentEl = document.getElementById('modal-order-content');
        const statusSelect = document.getElementById('modal-order-status-select');
        const saveStatusBtn = document.getElementById('modal-btn-save-status');
        const deleteOrderBtn = document.getElementById('modal-btn-delete-order');
        const waBtn = document.getElementById('modal-btn-wa-customer');

        if (!modal || !contentEl) return;

        if (titleEl) titleEl.textContent = `Order #${order.orderId} Details`;
        if (statusSelect) statusSelect.value = order.status || 'pending';

        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${item.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${item.title}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
                        <div>
                            <strong>${escapeHtml(item.title)}</strong>
                            <div class="customer-sub-cell">Rs. ${Number(item.price).toLocaleString('en-PK')} each</div>
                        </div>
                    </div>
                </td>
                <td style="text-align: center;">x${item.quantity || 1}</td>
                <td style="text-align: right; font-weight: 600;">Rs. ${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString('en-PK')}</td>
            </tr>
        `).join('');

        contentEl.innerHTML = `
            <div class="order-detail-section">
                <div class="order-detail-label">Customer & Delivery Info</div>
                <div class="order-customer-box">
                    <div><strong>Name:</strong> ${escapeHtml(order.customer?.name || '')}</div>
                    <div><strong>Phone / WhatsApp:</strong> ${escapeHtml(order.customer?.phone || '')}</div>
                    <div><strong>Delivery Address:</strong> ${escapeHtml(order.customer?.address || '')}, ${escapeHtml(order.customer?.city || '')}</div>
                    <div><strong>Payment Method:</strong> ${escapeHtml(order.paymentMethod || order.customer?.paymentMethod || 'Advance Payment')}</div>
                    ${order.yarnColor ? `<div style="margin-top: 0.35rem;"><strong>🧶 Yarn Color Choice:</strong> <span style="background: rgba(99, 102, 241, 0.12); color: #6366f1; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">${escapeHtml(order.yarnColor)}</span></div>` : ''}
                    ${order.referralCode ? `<div style="color: #10b981; font-weight: 700; margin-top: 0.25rem;">🎟️ Applied Referral Code: ${order.referralCode} (- Rs. ${order.discount || 0})</div>` : ''}
                    ${order.giftNoteCard ? `<div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 6px 10px; border-radius: 6px; margin-top: 0.5rem; font-size: 0.85rem;">💌 <strong>Handwritten Note Card (+Rs. 10):</strong> ${escapeHtml(order.giftNoteText || 'Default boutique card')}</div>` : ''}
                    ${order.customer?.notes ? `<div class="order-notes-highlight" style="margin-top: 0.4rem;">📝 Notes: ${escapeHtml(order.customer.notes)}</div>` : ''}
                </div>
            </div>

            <!-- Payment Proof Verification Section -->
            <div class="order-detail-section">
                <div class="order-detail-label" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <span>💳 Payment Verification & Proof Screenshot</span>
                    ${order.paymentVerified 
                        ? '<span style="font-size: 0.74rem; color: #10b981; font-weight: 700; background: rgba(16, 185, 129, 0.12); padding: 2px 8px; border-radius: 4px;">✓ Verified in Accounts</span>' 
                        : '<span style="font-size: 0.74rem; color: #f59e0b; font-weight: 700; background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: 4px;">⏳ Verification Pending</span>'}
                </div>
                <div style="background: var(--admin-bg); border: 1.5px solid var(--admin-border); border-radius: 10px; padding: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <strong>Channel:</strong> <span style="color: var(--admin-text-main); font-weight: 600;">${escapeHtml(order.paymentMethod || order.customer?.paymentMethod || 'Advance Payment')}</span>
                        </div>
                        <div>
                            ${!order.paymentVerified ? `
                                <button type="button" class="btn-admin btn-admin-primary" style="font-size: 0.8rem; padding: 0.35rem 0.85rem;" onclick="MrymifyAdmin.verifyOrderPayment('${order.orderId}')">
                                    ✓ Verify Payment & Advance to Crafting
                                </button>
                            ` : '<span style="color: #10b981; font-weight: 700; font-size: 0.84rem;">✓ Payment Confirmed & Verified</span>'}
                        </div>
                    </div>
                    ${order.paymentProof ? `
                        <div style="text-align: center; background: var(--admin-surface); border: 1.5px dashed var(--admin-border); border-radius: 8px; padding: 0.75rem;">
                            <a href="${order.paymentProof}" target="_blank" title="Click to view full receipt screenshot in high resolution">
                                <img src="${order.paymentProof}" alt="Payment Proof Screenshot" style="max-height: 240px; max-width: 100%; border-radius: 6px; object-fit: contain; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                            </a>
                            <div style="font-size: 0.75rem; color: var(--admin-text-muted); margin-top: 0.45rem;">🔎 Click image above to inspect receipt proof in full resolution</div>
                        </div>
                    ` : `
                        <div style="font-size: 0.82rem; color: var(--admin-text-muted); padding: 0.35rem 0;">
                            ${(order.paymentMethod || '').includes('COD') 
                                ? '📦 Cash on Delivery order. Courier will collect payment upon doorstep delivery.' 
                                : '⚠️ No payment proof screenshot uploaded yet by customer.'}
                        </div>
                    `}
                </div>
            </div>

            ${order.quotedProduct ? `
            <div class="order-detail-section">
                <div class="order-detail-label">💬 WhatsApp-Style Quoted Piece (Customer Replied To)</div>
                <div style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; border-radius: 8px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.85rem;">
                    <div style="font-size: 1.3rem;">↩️</div>
                    <div style="flex: 1;">
                        <div style="font-size: 0.72rem; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Replied / Referenced Product</div>
                        <div style="font-weight: 700; color: var(--admin-text-main); font-size: 0.95rem;">${escapeHtml(order.quotedProduct.title || order.quotedProduct.name)}</div>
                        <div style="font-size: 0.8rem; color: var(--admin-text-muted);">Rs. ${Number(order.quotedProduct.price || 0).toLocaleString('en-PK')} • Ref ID: ${escapeHtml(order.quotedProduct.id || '')}</div>
                    </div>
                    ${order.quotedProduct.image ? `<img src="${order.quotedProduct.image}" alt="Quoted piece" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1.5px solid var(--admin-border);" />` : ''}
                </div>
            </div>
            ` : ''}

            ${order.referenceImage ? `
            <div class="order-detail-section">
                <div class="order-detail-label">📸 Customer Reference Image Attachment</div>
                <div style="background: var(--admin-card-bg); border: 1.5px dashed var(--admin-border); border-radius: 10px; padding: 0.85rem; text-align: center;">
                    <a href="${order.referenceImage}" target="_blank" title="Click to view full image" style="display: inline-block;">
                        <img src="${order.referenceImage}" alt="Customer reference photo" style="max-height: 200px; max-width: 100%; border-radius: 8px; object-fit: contain; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                    </a>
                    <div style="font-size: 0.75rem; color: var(--admin-text-muted); margin-top: 0.4rem;">🔎 Click image above to inspect in high resolution</div>
                </div>
            </div>
            ` : ''}

            <div class="order-detail-section">
                <div class="order-detail-label">Ordered Items</div>
                <table class="order-items-table">${itemsHtml}</table>
                <div class="order-summary-box">
                    <div>Subtotal: Rs. ${(Number(order.subtotal) || 0).toLocaleString('en-PK')}</div>
                    ${order.discount ? `<div style="color: #10b981;">Discount: - Rs. ${order.discount.toLocaleString('en-PK')}</div>` : ''}
                    <div>Shipping: ${order.shipping === 0 ? 'FREE' : 'Rs. ' + order.shipping}</div>
                    <div class="order-grand-total">Total: Rs. ${(Number(order.grandTotal) || 0).toLocaleString('en-PK')}</div>
                </div>
            </div>
        `;

        if (saveStatusBtn) {
            saveStatusBtn.onclick = function () {
                order.status = statusSelect.value;
                saveOrders();
                renderOrdersTable();
                renderOverviewMetrics();
                closeModals();
            };
        }

        if (deleteOrderBtn) {
            deleteOrderBtn.onclick = function () {
                deleteSingleOrder(order.orderId, true);
            };
        }

        if (waBtn) {
            waBtn.onclick = function () {
                messageCustomerWhatsApp(order.orderId);
            };
        }

        modal.classList.add('open');
    }

    /**
     * Verify payment in account and advance order to Crafting
     */
    function verifyOrderPayment(orderId) {
        const order = currentOrders.find(o => o.orderId === orderId);
        if (!order) return;

        order.paymentVerified = true;
        if (order.status === 'pending') {
            order.status = 'crafting';
        }

        saveOrders();
        renderOrdersTable();
        renderOverviewMetrics();
        openOrderDetail(orderId);
        alert(`✓ Payment for Order #${order.orderId} confirmed and verified!\nStatus has been advanced to Handcrafting Stage (🧶 In Progress).`);
    }

    function messageCustomerWhatsApp(orderId) {
        const order = currentOrders.find(o => o.orderId === orderId);
        if (!order || !order.customer?.phone) {
            alert('No phone number recorded for this order.');
            return;
        }

        let phone = order.customer.phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '92' + phone.substring(1);
        }

        let statusText = 'being processed';
        if (order.status === 'crafting') statusText = 'currently being handcrafted stitch-by-stitch with soft hypoallergenic yarn! 🧶';
        else if (order.status === 'ready') statusText = 'handcrafted and is now being packaged in our signature boutique box! ✨';
        else if (order.status === 'dispatched') statusText = 'dispatched for nationwide delivery through our courier partner! 🚚';
        else if (order.status === 'delivered') statusText = 'delivered! We hope you love your handcrafted piece! 🌸';

        const text = `Salam ${order.customer.name}! 🌸\n` +
                     `This is Mariyam from *Mrymify Handcrafted Boutique*.\n\n` +
                     `We are reaching out regarding your order *#${order.orderId}*.\n` +
                     `Your order is ${statusText}\n\n` +
                     `*Delivery Destination:* ${order.customer.city}\n` +
                     `*Total Amount:* Rs. ${(Number(order.grandTotal) || 0).toLocaleString('en-PK')}\n\n` +
                     `Please let us know if you have any questions or special instructions! Thank you for supporting small handmade businesses. ✨`;

        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    /* ==========================================================================
       5. Product Studio & PC-Style View Modes
       ========================================================================== */

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    function purgeExpiredRecycleBin() {
        try {
            const raw = localStorage.getItem('mrymify_recycle_bin');
            if (!raw) return [];
            const bin = JSON.parse(raw);
            const now = Date.now();
            const valid = bin.filter(item => {
                const deletedAt = Number(item.deletedAt) || now;
                return (now - deletedAt) <= THIRTY_DAYS_MS;
            });
            if (valid.length !== bin.length) {
                localStorage.setItem('mrymify_recycle_bin', JSON.stringify(valid));
            }
            return valid;
        } catch (e) {
            return [];
        }
    }

    function getRecycleBin() {
        return purgeExpiredRecycleBin();
    }

    function saveRecycleBin(bin) {
        try {
            localStorage.setItem('mrymify_recycle_bin', JSON.stringify(bin));
        } catch (e) {}
    }

    function updateCatalogBadges() {
        const activeCount = currentCatalog.length;
        const unlistedCount = currentCatalog.filter(p => Boolean(p.unlisted)).length;
        const binCount = getRecycleBin().length;

        const badgeProducts = document.getElementById('badge-products-count');
        if (badgeProducts) badgeProducts.textContent = activeCount;

        const badgeUnlisted = document.getElementById('badge-unlisted-count');
        if (badgeUnlisted) badgeUnlisted.textContent = unlistedCount;

        const badgeSidebarUnlisted = document.getElementById('badge-sidebar-unlisted-count');
        if (badgeSidebarUnlisted) {
            badgeSidebarUnlisted.textContent = unlistedCount;
            badgeSidebarUnlisted.style.display = unlistedCount > 0 ? 'inline-block' : 'none';
        }

        const badgeRecycle = document.getElementById('badge-recycle-count');
        if (badgeRecycle) badgeRecycle.textContent = binCount;

        const badgeHeaderRecycle = document.getElementById('badge-header-recycle-count');
        if (badgeHeaderRecycle) badgeHeaderRecycle.textContent = binCount;
    }

    function loadProducts() {
        purgeExpiredRecycleBin();
        if (window.MrymifyProducts && typeof window.MrymifyProducts.getEffectiveCatalog === 'function') {
            currentCatalog = window.MrymifyProducts.getEffectiveCatalog(true);
        } else {
            currentCatalog = [];
        }
        updateCatalogBadges();
    }

    function setProductViewMode(mode) {
        productViewMode = mode;
        localStorage.setItem('mrymify_prod_view_mode', mode);

        document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-view-${mode}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Sync sidebar active tab highlight
        document.querySelectorAll('.admin-nav-item').forEach(btn => {
            if (btn.getAttribute('data-tab') === 'unlisted') {
                btn.classList.toggle('active', mode === 'unlisted');
            } else if (btn.getAttribute('data-tab') === 'products') {
                btn.classList.toggle('active', mode !== 'unlisted' && activeTab === 'products');
            }
        });

        const folderEl = document.getElementById('product-view-folders');
        const gridEl = document.getElementById('product-view-grid');
        const listEl = document.getElementById('product-view-list');
        const featEl = document.getElementById('product-view-featured');
        const unlistedEl = document.getElementById('product-view-unlisted');
        const recycleEl = document.getElementById('product-view-recycle');

        if (folderEl) folderEl.style.display = mode === 'folders' ? 'block' : 'none';
        if (gridEl) gridEl.style.display = mode === 'grid' ? 'grid' : 'none';
        if (listEl) listEl.style.display = mode === 'list' ? 'block' : 'none';
        if (featEl) featEl.style.display = mode === 'featured' ? 'block' : 'none';
        if (unlistedEl) unlistedEl.style.display = mode === 'unlisted' ? 'block' : 'none';
        if (recycleEl) recycleEl.style.display = mode === 'recycle' ? 'block' : 'none';

        renderProducts();
    }

    function renderProducts() {
        loadProducts();

        if (productViewMode === 'recycle') {
            renderRecycleBinView();
            return;
        }

        let filtered = currentCatalog;
        if (productSearchQuery) {
            const q = productSearchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                (p.title || '').toLowerCase().includes(q) ||
                (p.id || '').toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q) ||
                (p.price || '').toString().includes(q)
            );
        }

        if (productViewMode === 'unlisted') {
            const unlistedOnly = filtered.filter(p => Boolean(p.unlisted));
            renderUnlistedView(unlistedOnly);
            return;
        }

        if (productViewMode === 'folders') {
            renderFolderView(filtered);
        } else if (productViewMode === 'grid') {
            renderGridView(filtered);
        } else if (productViewMode === 'featured') {
            renderFeaturedView(filtered);
        } else {
            renderListView(filtered);
        }
    }

    function renderFolderView(products) {
        const container = document.getElementById('product-view-folders');
        if (!container) return;

        const categories = [
            { key: 'amigurumi', label: 'Amigurumi & Plushies', icon: '🧸' },
            { key: 'floral', label: 'Floral Bouquets & Flowers', icon: '💐' },
            { key: 'wearables', label: 'Bags, Cardigans & Wearables', icon: '👜' },
            { key: 'keychains', label: 'Keychains & Charms', icon: '🔑' },
            { key: 'accessories', label: 'Accessories & Hair Pieces', icon: '🎀' }
        ];

        container.innerHTML = categories.map(cat => {
            const prods = products.filter(p => (p.category || '').toLowerCase() === cat.key);
            return `
                <div class="folder-category-box open" id="folder-box-${cat.key}">
                    <div class="folder-category-header" onclick="document.getElementById('folder-box-${cat.key}').classList.toggle('open');">
                        <div class="folder-title-left">
                            <span>📁</span>
                            <span>${cat.icon} ${cat.label}</span>
                        </div>
                        <span class="location-count-badge">${prods.length} piece${prods.length === 1 ? '' : 's'}</span>
                    </div>
                    <div class="folder-items-wrap">
                        ${prods.length ? prods.map(p => `
                            <div class="folder-item-card">
                                <!-- Card Info Row -->
                                <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                                    <img src="${p.image}" alt="${escapeHtml(p.title)}" class="folder-item-thumb" style="width: 58px; height: 58px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1.5px solid var(--admin-border);" />
                                    <div class="folder-item-meta" style="flex: 1; min-width: 0;">
                                        <div class="folder-item-title" title="${escapeHtml(p.title)}" style="font-size: 0.95rem; font-weight: 700; color: var(--admin-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.2rem;">${escapeHtml(p.title)}</div>
                                        <div class="folder-item-price" style="font-size: 0.88rem; font-weight: 700; color: var(--admin-primary);">Rs. ${Number(p.price).toLocaleString('en-PK')}</div>
                                        <div style="font-size: 0.74rem; color: var(--admin-text-muted); margin-top: 0.2rem;">
                                            ⏳ ${escapeHtml(p.estimatedMakingTime || '2-3 Business Days')}
                                        </div>
                                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.35rem;">
                                            ${p.isFeatured ? '<span style="font-size: 0.7rem; background: rgba(234, 179, 8, 0.2); color: #b45309; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; border: 1px solid rgba(234, 179, 8, 0.4);">⭐ Featured</span>' : ''}
                                            ${p.unlisted ? '<span style="font-size: 0.7rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">👁️ Unlisted</span>' : '<span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">✓ Listed</span>'}
                                        </div>
                                    </div>
                                </div>
                                <!-- 2x2 Equal Action Buttons Grid (No Cut-off) -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid var(--admin-border);">
                                    <button type="button" class="action-btn" onclick="MrymifyAdmin.openProductCreatorModal('${p.id}')" style="width: 100%; text-align: center; padding: 0.35rem 0.25rem; font-size: 0.78rem;">${EDIT_PENCIL_SVG} Edit</button>
                                    <button type="button" class="action-btn" onclick="MrymifyAdmin.toggleProductFeatured('${p.id}')" style="width: 100%; text-align: center; padding: 0.35rem 0.25rem; font-size: 0.78rem;" title="Toggle homepage featured">${p.isFeatured ? '⭐ Unfeature' : '☆ Feature'}</button>
                                    <button type="button" class="action-btn" onclick="MrymifyAdmin.toggleProductUnlist('${p.id}')" style="width: 100%; text-align: center; padding: 0.35rem 0.25rem; font-size: 0.78rem;" title="Toggle storefront visibility">${p.unlisted ? '👁️ Relist' : '👁️‍🗨️ Unlist'}</button>
                                    <button type="button" class="action-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35); width: 100%; text-align: center; padding: 0.35rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.deleteProduct('${p.id}')" title="Delete creation">🗑️ Delete</button>
                                </div>
                            </div>
                        `).join('') : '<div style="color: var(--admin-text-muted); font-size: 0.85rem; padding: 0.5rem;">Folder is currently empty.</div>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderGridView(products) {
        const container = document.getElementById('product-view-grid');
        if (!container) return;

        const analytics = getStoreAnalytics();
        const pViews = analytics.productViews || {};
        const pDwell = analytics.productDwellTime || {};
        const pCustom = analytics.customizationClicks || {};

        container.innerHTML = products.map(p => {
            const views = pViews[p.id] || 0;
            const dwellSec = pDwell[p.id] || 0;
            const customClicks = pCustom[p.id] || 0;

            return `
                <div class="admin-product-card">
                    <div style="padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                            <img src="${p.image}" alt="${escapeHtml(p.title)}" class="admin-product-thumb" style="width: 68px; height: 68px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--admin-border);" />
                            <div class="admin-product-info" style="flex: 1; min-width: 0;">
                                <h4 class="admin-product-title" title="${escapeHtml(p.title)}" style="font-size: 0.98rem; font-weight: 700; color: var(--admin-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 0.2rem;">${escapeHtml(p.title)}</h4>
                                <div class="admin-product-meta" style="font-size: 0.78rem; color: var(--admin-text-muted);">${escapeHtml(p.categoryLabel || p.category)} • ⏳ ${escapeHtml(p.estimatedMakingTime || '2-3 Days')}</div>
                                <div class="admin-product-price" style="font-size: 0.92rem; font-weight: 700; color: var(--admin-primary); margin-top: 0.2rem;">Rs. ${Number(p.price).toLocaleString('en-PK')}</div>
                                <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.35rem;">
                                    ${p.isFeatured ? '<span style="font-size: 0.7rem; background: rgba(234, 179, 8, 0.2); color: #b45309; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; border: 1px solid rgba(234, 179, 8, 0.4);">⭐ Featured</span>' : ''}
                                    ${p.unlisted ? '<span style="font-size: 0.7rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">👁️ Unlisted</span>' : '<span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">✓ Listed</span>'}
                                </div>
                            </div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--admin-text-muted); background: var(--admin-bg); padding: 0.4rem 0.65rem; border-radius: 6px; border: 1px solid var(--admin-border); display: flex; justify-content: space-around;">
                            <span>👀 ${views} views</span>
                            <span>⏱️ ${dwellSec}s dwell</span>
                            <span>${EDIT_PENCIL_SVG} ${customClicks} custom</span>
                        </div>
                    </div>
                    <!-- 2x2 Equal Action Buttons Grid (No Cut-off) -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; padding: 0.75rem 1rem; border-top: 1px solid var(--admin-border); background: var(--admin-bg);">
                        <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.openProductCreatorModal('${p.id}')">${EDIT_PENCIL_SVG} Edit</button>
                        <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.toggleProductFeatured('${p.id}')" title="Toggle featured on home page">${p.isFeatured ? '⭐ Unfeature' : '☆ Feature'}</button>
                        <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.toggleProductUnlist('${p.id}')" title="Toggle visibility">${p.unlisted ? '👁️ Relist' : '👁️‍🗨️ Unlist'}</button>
                        <button class="action-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35); width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.deleteProduct('${p.id}')" title="Delete piece">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderFeaturedView(products) {
        const container = document.getElementById('product-view-featured');
        if (!container) return;

        const featured = products.filter(p => Boolean(p.isFeatured));

        container.innerHTML = `
            <div style="margin-bottom: 1.25rem; background: rgba(234, 179, 8, 0.1); border: 1.5px solid rgba(234, 179, 8, 0.4); border-radius: 12px; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: #b45309; display: flex; align-items: center; gap: 0.5rem;">
                        <span>⭐</span> Homepage Curated Showcase (${featured.length} pieces active)
                    </h3>
                    <p style="margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--admin-text-muted);">These handcrafted pieces appear on the homepage Featured Showcase.</p>
                </div>
                <button type="button" class="btn-admin btn-admin-primary" onclick="MrymifyAdmin.openFeaturedManagerModal()">
                    <span>⭐ Open Featured Curation Manager</span>
                </button>
            </div>

            ${featured.length ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
                    ${featured.map(p => `
                        <div class="admin-product-card" style="border: 2px solid rgba(234, 179, 8, 0.5);">
                            <div style="padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
                                <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                                    <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width: 68px; height: 68px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1.5px solid var(--admin-border);" />
                                    <div style="flex: 1; min-width: 0;">
                                        <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 0.2rem; color: var(--admin-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h4>
                                        <div style="font-size: 0.78rem; color: var(--admin-text-muted);">${escapeHtml(p.categoryLabel || p.category)} • ⏳ ${escapeHtml(p.estimatedMakingTime || '2-3 Days')}</div>
                                        <div style="font-size: 0.92rem; font-weight: 700; color: var(--admin-primary); margin-top: 0.2rem;">Rs. ${Number(p.price).toLocaleString('en-PK')}</div>
                                        <div style="margin-top: 0.35rem;">
                                            <span style="font-size: 0.72rem; background: rgba(234, 179, 8, 0.25); color: #b45309; padding: 0.12rem 0.45rem; border-radius: 4px; font-weight: 700; border: 1px solid rgba(234, 179, 8, 0.5);">⭐ Active on Homepage</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; padding: 0.75rem 1rem; border-top: 1px solid var(--admin-border); background: var(--admin-bg);">
                                <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.openProductCreatorModal('${p.id}')">${EDIT_PENCIL_SVG} Edit</button>
                                <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem; color: #b45309;" onclick="MrymifyAdmin.toggleProductFeatured('${p.id}')" title="Remove from homepage showcase">⭐ Unfeature</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div style="text-align: center; padding: 3rem 1.5rem; background: var(--admin-bg); border-radius: 12px; border: 1.5px dashed var(--admin-border);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⭐</div>
                    <h4 style="font-size: 1.1rem; color: var(--admin-text-main); margin: 0 0 0.5rem;">No Pieces Currently Featured on Homepage</h4>
                    <p style="font-size: 0.85rem; color: var(--admin-text-muted); max-width: 400px; margin: 0 auto 1.25rem;">Select products to spotlight them on the homepage showcase using the curator modal.</p>
                    <button type="button" class="btn-admin btn-admin-primary" onclick="MrymifyAdmin.openFeaturedManagerModal()">
                        <span>⭐ Curate Featured Pieces Now</span>
                    </button>
                </div>
            `}
        `;
    }

    function renderListView(products) {
        const tbody = document.getElementById('product-list-tbody');
        if (!tbody) return;

        tbody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.image}" alt="${escapeHtml(p.title)}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" /></td>
                <td>
                    <strong>${escapeHtml(p.title)}</strong>
                    <div class="customer-sub-cell">${escapeHtml(p.categoryLabel || p.category)} • ⏳ ${escapeHtml(p.estimatedMakingTime || '2-3 Days')}</div>
                </td>
                <td><strong>Rs. ${Number(p.price).toLocaleString('en-PK')}</strong></td>
                <td>
                    ${p.isFeatured ? '<span class="status-pill" style="background: rgba(234, 179, 8, 0.2); color: #b45309; border: 1px solid rgba(234, 179, 8, 0.4);">⭐ Featured</span>' : '<span style="color: var(--admin-text-muted); font-size: 0.8rem;">Standard</span>'}
                </td>
                <td>
                    ${p.unlisted ? '<span class="status-pill" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">Unlisted</span>' : '<span class="status-pill status-ready">Active</span>'}
                </td>
                <td>${p.badge ? `<span class="badge badge-primary">${p.badge}</span>` : '-'}</td>
                <td style="min-width: 230px; white-space: nowrap;">
                    <div style="display: flex; gap: 0.35rem; align-items: center;">
                        <button class="action-btn" style="padding: 0.35rem 0.6rem; font-size: 0.78rem;" onclick="MrymifyAdmin.openProductCreatorModal('${p.id}')">${EDIT_PENCIL_SVG} Edit</button>
                        <button class="action-btn" style="padding: 0.35rem 0.6rem; font-size: 0.78rem;" onclick="MrymifyAdmin.toggleProductFeatured('${p.id}')" title="Toggle featured on home page">${p.isFeatured ? '⭐ Unfeature' : '☆ Feature'}</button>
                        <button class="action-btn" style="padding: 0.35rem 0.6rem; font-size: 0.78rem;" onclick="MrymifyAdmin.toggleProductUnlist('${p.id}')">${p.unlisted ? '👁️ Relist' : '👁️‍🗨️ Unlist'}</button>
                        <button class="action-btn" style="color: #ef4444; padding: 0.35rem 0.6rem; font-size: 0.78rem;" onclick="MrymifyAdmin.deleteProduct('${p.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderUnlistedView(products) {
        const container = document.getElementById('product-view-unlisted');
        if (!container) return;

        const count = products.length;

        container.innerHTML = `
            <div style="margin-bottom: 1.25rem; background: rgba(239, 68, 68, 0.08); border: 1.5px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: #ef4444; display: flex; align-items: center; gap: 0.5rem;">
                        <span>👁️</span> Unlisted Pieces Studio (${count} piece${count === 1 ? '' : 's'})
                    </h3>
                    <p style="margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--admin-text-muted);">
                        These handcrafted pieces are hidden from customer storefront lookbooks and catalogs. You can edit them, preview them, or 1-click relist them at any time.
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn-admin btn-admin-secondary" onclick="MrymifyAdmin.setProductViewMode('folders')" style="font-size: 0.85rem;">
                        <span>🗂️ View All Catalog</span>
                    </button>
                </div>
            </div>

            ${products.length ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
                    ${products.map(p => `
                        <div class="admin-product-card" style="border: 1.5px solid rgba(239, 68, 68, 0.35);">
                            <div style="padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
                                <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                                    <img src="${p.image}" alt="${escapeHtml(p.title)}" class="admin-product-thumb" style="width: 68px; height: 68px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1.5px solid var(--admin-border);" />
                                    <div class="admin-product-info" style="flex: 1; min-width: 0;">
                                        <h4 class="admin-product-title" title="${escapeHtml(p.title)}" style="font-size: 0.98rem; font-weight: 700; color: var(--admin-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 0.2rem;">${escapeHtml(p.title)}</h4>
                                        <div class="admin-product-meta" style="font-size: 0.78rem; color: var(--admin-text-muted);">${escapeHtml(p.categoryLabel || p.category)} • ⏳ ${escapeHtml(p.estimatedMakingTime || '2-3 Days')}</div>
                                        <div class="admin-product-price" style="font-size: 0.92rem; font-weight: 700; color: var(--admin-primary); margin-top: 0.2rem;">Rs. ${Number(p.price).toLocaleString('en-PK')}</div>
                                        <div style="margin-top: 0.35rem; display: flex; gap: 0.35rem; flex-wrap: wrap;">
                                            <span style="font-size: 0.7rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.3);">👁️ Hidden / Unlisted</span>
                                            ${p.isFeatured ? '<span style="font-size: 0.7rem; background: rgba(234, 179, 8, 0.2); color: #b45309; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; border: 1px solid rgba(234, 179, 8, 0.4);">⭐ Featured</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- 2x2 Equal Action Buttons Grid (No Cut-off) -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; padding: 0.75rem 1rem; border-top: 1px solid var(--admin-border); background: var(--admin-bg);">
                                <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.openProductCreatorModal('${p.id}')">${EDIT_PENCIL_SVG} Edit</button>
                                <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem; color: #10b981; border-color: rgba(16, 185, 129, 0.4); font-weight: 700;" onclick="MrymifyAdmin.toggleProductUnlist('${p.id}')" title="Make visible on storefront">👁️ Relist</button>
                                <button class="action-btn" style="width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.toggleProductFeatured('${p.id}')" title="Toggle featured on home page">${p.isFeatured ? '⭐ Unfeature' : '☆ Feature'}</button>
                                <button class="action-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35); width: 100%; text-align: center; padding: 0.38rem 0.25rem; font-size: 0.78rem;" onclick="MrymifyAdmin.deleteProduct('${p.id}')" title="Move to Recycle Bin">🗑️ Bin</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div style="text-align: center; padding: 3.5rem 1.5rem; background: var(--admin-bg); border-radius: 12px; border: 1.5px dashed var(--admin-border);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👁️</div>
                    <h4 style="font-size: 1.15rem; color: var(--admin-text-main); margin: 0 0 0.5rem;">No Unlisted Creations</h4>
                    <p style="font-size: 0.85rem; color: var(--admin-text-muted); max-width: 440px; margin: 0 auto 1.25rem;">
                        All handcrafted pieces in your catalog are currently listed and visible to clients on the boutique storefront. When you unlist a piece, it will safely appear here.
                    </p>
                    <button type="button" class="btn-admin btn-admin-secondary" onclick="MrymifyAdmin.setProductViewMode('folders')">
                        <span>🗂️ Browse Active Catalog</span>
                    </button>
                </div>
            `}
        `;
    }

    function renderRecycleBinView() {
        const container = document.getElementById('product-view-recycle');
        if (!container) return;

        const bin = getRecycleBin();
        const count = bin.length;

        container.innerHTML = `
            <div style="margin-bottom: 1.25rem; background: rgba(239, 68, 68, 0.08); border: 1.5px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: #ef4444; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🗑️</span> Recycle Bin & 30-Day Auto Purge (${count} piece${count === 1 ? '' : 's'})
                    </h3>
                    <p style="margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--admin-text-muted);">
                        Deleted creations are preserved here for 30 days before being automatically purged. You can restore any piece back to your active catalog with 1-click or permanently erase it.
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${count > 0 ? `
                        <button type="button" class="btn-admin btn-admin-secondary" onclick="MrymifyAdmin.emptyRecycleBin()" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); font-size: 0.85rem;" title="Permanently delete all recycled creations">
                            <span>🧹 Empty Recycle Bin</span>
                        </button>
                    ` : ''}
                    <button type="button" class="btn-admin btn-admin-secondary" onclick="MrymifyAdmin.setProductViewMode('folders')" style="font-size: 0.85rem;">
                        <span>🗂️ Active Catalog</span>
                    </button>
                </div>
            </div>

            ${bin.length ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.25rem;">
                    ${bin.map(p => {
                        const elapsed = Date.now() - (Number(p.deletedAt) || Date.now());
                        const remainingMs = (30 * 24 * 60 * 60 * 1000) - elapsed;
                        const daysLeft = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
                        const deletedDateStr = new Date(p.deletedAt || Date.now()).toLocaleDateString('en-PK', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return `
                            <div class="admin-product-card" style="border: 1.5px solid rgba(239, 68, 68, 0.35); opacity: 0.95;">
                                <div style="padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
                                    <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                                        <img src="${p.image}" alt="${escapeHtml(p.title)}" class="admin-product-thumb" style="width: 68px; height: 68px; border-radius: 10px; object-fit: cover; flex-shrink: 0; filter: grayscale(35%); border: 1.5px solid var(--admin-border);" />
                                        <div class="admin-product-info" style="flex: 1; min-width: 0;">
                                            <h4 class="admin-product-title" title="${escapeHtml(p.title)}" style="font-size: 0.98rem; font-weight: 700; color: var(--admin-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 0.2rem;">${escapeHtml(p.title)}</h4>
                                            <div class="admin-product-meta" style="font-size: 0.78rem; color: var(--admin-text-muted);">${escapeHtml(p.categoryLabel || p.category)} • Rs. ${Number(p.price).toLocaleString('en-PK')}</div>
                                            <div style="font-size: 0.74rem; color: var(--admin-text-muted); margin-top: 0.25rem;">
                                                🕒 Deleted: ${deletedDateStr}
                                            </div>
                                            <div style="margin-top: 0.4rem;">
                                                <span style="font-size: 0.72rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 0.25rem;">
                                                    ⏳ Auto-deletes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Action Buttons: Restore or Permanently Delete -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; padding: 0.75rem 1rem; border-top: 1px solid var(--admin-border); background: var(--admin-bg);">
                                    <button class="action-btn" style="width: 100%; text-align: center; padding: 0.42rem 0.25rem; font-size: 0.78rem; color: #10b981; border-color: rgba(16, 185, 129, 0.4); font-weight: 700;" onclick="MrymifyAdmin.restoreProductFromBin('${p.id}')" title="Restore piece back to active catalog">
                                        ♻️ Restore
                                    </button>
                                    <button class="action-btn" style="width: 100%; text-align: center; padding: 0.42rem 0.25rem; font-size: 0.78rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.35); font-weight: 700;" onclick="MrymifyAdmin.permanentlyDeleteProduct('${p.id}')" title="Erase permanently now">
                                        ❌ Erase
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div style="text-align: center; padding: 3.5rem 1.5rem; background: var(--admin-bg); border-radius: 12px; border: 1.5px dashed var(--admin-border);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🗑️</div>
                    <h4 style="font-size: 1.15rem; color: var(--admin-text-main); margin: 0 0 0.5rem;">Recycle Bin is Empty</h4>
                    <p style="font-size: 0.85rem; color: var(--admin-text-muted); max-width: 440px; margin: 0 auto 1.25rem;">
                        No deleted creations are currently in retention. When you delete a piece from Product Studio, it will stay here for 30 days before being automatically purged.
                    </p>
                    <button type="button" class="btn-admin btn-admin-secondary" onclick="MrymifyAdmin.setProductViewMode('folders')">
                        <span>🗂️ Return to Product Studio</span>
                    </button>
                </div>
            `}
        `;
    }

    function initDedicatedSearches() {
        const pSearch = document.getElementById('admin-product-search-input');
        if (pSearch) {
            pSearch.addEventListener('input', function () {
                productSearchQuery = this.value.trim();
                renderProducts();
            });
        }
    }

    function initHorizontalWheelScroll() {
        document.querySelectorAll('.table-responsive, .product-view-container, .folder-items-wrap').forEach(el => {
            el.addEventListener('wheel', function(e) {
                if (this.scrollWidth > this.clientWidth && e.deltaY !== 0 && e.deltaX === 0) {
                    const maxScroll = this.scrollWidth - this.clientWidth;
                    if ((e.deltaY > 0 && this.scrollLeft < maxScroll) || (e.deltaY < 0 && this.scrollLeft > 0)) {
                        this.scrollLeft += e.deltaY;
                        e.preventDefault();
                    }
                }
            }, { passive: false });
        });
    }

    /* ==========================================================================
       6. WhatsApp PFP-Style Image Cropper & Product Creator
       ========================================================================== */

    let cropCanvas = null;
    let cropCtx = null;
    let activeCropImage = null;
    let cropScale = 1;
    let cropRotation = 0;
    let cropPanX = 0;
    let cropPanY = 0;
    let isDraggingCrop = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let studioGalleryImages = [];

    function initProductStudioCropper() {
        cropCanvas = document.getElementById('cropper-canvas');
        if (!cropCanvas) return;
        cropCtx = cropCanvas.getContext('2d');

        const fileInput = document.getElementById('studio-image-file');
        const galleryInput = document.getElementById('studio-gallery-files');
        const zoomSlider = document.getElementById('cropper-zoom-slider');
        const zoomVal = document.getElementById('cropper-zoom-val');
        const rotateBtn = document.getElementById('btn-cropper-rotate');
        const applyBtn = document.getElementById('btn-cropper-apply');
        const workspace = document.getElementById('cropper-workspace');

        // Card Thumbnail Image File
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function (evt) {
                    const img = new Image();
                    img.onload = function () {
                        activeCropImage = img;
                        cropScale = 1;
                        cropRotation = 0;
                        cropPanX = 0;
                        cropPanY = 0;
                        if (zoomSlider) zoomSlider.value = '1';
                        if (zoomVal) zoomVal.textContent = '1.0x';
                        renderCropperCanvas();
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        // Secondary Multiple Gallery Photos
        if (galleryInput) {
            galleryInput.addEventListener('change', function (e) {
                const files = Array.from(e.target.files);
                if (!files.length) return;

                let loadedCount = 0;
                files.forEach(f => {
                    const r = new FileReader();
                    r.onload = function (evt) {
                        studioGalleryImages.push(evt.target.result);
                        loadedCount++;
                        if (loadedCount === files.length) {
                            renderStudioGalleryPreviews();
                        }
                    };
                    r.readAsDataURL(f);
                });
            });
        }

        if (zoomSlider) {
            zoomSlider.addEventListener('input', function () {
                cropScale = parseFloat(this.value) || 1;
                if (zoomVal) zoomVal.textContent = `${cropScale.toFixed(1)}x`;
                renderCropperCanvas();
            });
        }

        if (rotateBtn) {
            rotateBtn.addEventListener('click', function () {
                cropRotation = (cropRotation + 90) % 360;
                renderCropperCanvas();
            });
        }

        if (workspace) {
            workspace.addEventListener('mousedown', (e) => {
                isDraggingCrop = true;
                dragStartX = e.clientX - cropPanX;
                dragStartY = e.clientY - cropPanY;
                workspace.style.cursor = 'grabbing';
            });
            window.addEventListener('mousemove', (e) => {
                if (!isDraggingCrop) return;
                cropPanX = e.clientX - dragStartX;
                cropPanY = e.clientY - dragStartY;
                renderCropperCanvas();
            });
            window.addEventListener('mouseup', () => {
                isDraggingCrop = false;
                if (workspace) workspace.style.cursor = 'grab';
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', function () {
                if (!activeCropImage) {
                    alert('Please upload an image first.');
                    return;
                }
                const dataUrl = cropCanvas.toDataURL('image/png');
                document.getElementById('studio-cropped-data').value = dataUrl;
                applyBtn.textContent = '✓ Cropped & Ready!';
                applyBtn.style.background = '#15803d';
                setTimeout(() => {
                    applyBtn.textContent = '✓ Apply Crop';
                    applyBtn.style.background = '';
                }, 2000);
            });
        }
    }

    function renderStudioGalleryPreviews() {
        const strip = document.getElementById('studio-gallery-preview-strip');
        if (!strip) return;

        if (!studioGalleryImages || studioGalleryImages.length === 0) {
            strip.innerHTML = '<span id="gallery-empty-msg" style="font-size: 0.78rem; color: var(--admin-text-muted); margin: auto;">No secondary gallery photos added yet</span>';
            return;
        }

        strip.innerHTML = studioGalleryImages.map((src, idx) => `
            <div style="position: relative; width: 50px; height: 50px; border-radius: 8px; overflow: hidden; border: 1.5px solid var(--admin-border); flex-shrink: 0; background: #fff;">
                <img src="${src}" alt="Gallery photo ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                <button type="button" onclick="MrymifyAdmin.removeStudioGalleryImage(${idx})" title="Remove photo" style="position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; background: rgba(220,38,38,0.9); color: #ffffff; border: none; border-radius: 50%; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;">✕</button>
            </div>
        `).join('');
    }

    function removeStudioGalleryImage(index) {
        if (studioGalleryImages && index >= 0 && index < studioGalleryImages.length) {
            studioGalleryImages.splice(index, 1);
            renderStudioGalleryPreviews();
        }
    }

    function renderCropperCanvas() {
        if (!cropCanvas || !cropCtx || !activeCropImage) return;

        cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.save();

        cropCtx.translate(cropCanvas.width / 2 + cropPanX, cropCanvas.height / 2 + cropPanY);
        cropCtx.rotate((cropRotation * Math.PI) / 180);
        cropCtx.scale(cropScale, cropScale);

        // Center image
        const w = activeCropImage.width;
        const h = activeCropImage.height;
        const aspect = w / h;
        let drawW = cropCanvas.width;
        let drawH = cropCanvas.height;

        if (aspect > 1) {
            drawW = cropCanvas.height * aspect;
        } else {
            drawH = cropCanvas.width / aspect;
        }

        cropCtx.drawImage(activeCropImage, -drawW / 2, -drawH / 2, drawW, drawH);
        cropCtx.restore();
    }

    function openProductCreatorModal(existingId) {
        const modal = document.getElementById('product-add-modal');
        const modalTitle = document.getElementById('modal-studio-title');
        const idInput = document.getElementById('studio-prod-id');
        const titleInput = document.getElementById('studio-title');
        const catInput = document.getElementById('studio-category');
        const priceInput = document.getElementById('studio-price');
        const origPriceInput = document.getElementById('studio-orig-price');
        const badgeInput = document.getElementById('studio-badge');
        const makingTimeInput = document.getElementById('studio-making-time');
        const descInput = document.getElementById('studio-desc');
        const unlistedChk = document.getElementById('studio-unlisted-chk');
        const featuredChk = document.getElementById('studio-featured-chk');
        const cropData = document.getElementById('studio-cropped-data');

        if (!modal) return;

        if (existingId) {
            const p = currentCatalog.find(prod => prod.id === existingId);
            if (p) {
                if (modalTitle) modalTitle.textContent = `🧶 Edit Piece: ${p.title}`;
                if (idInput) idInput.value = p.id;
                if (titleInput) titleInput.value = p.title;
                if (catInput) catInput.value = p.category;
                if (priceInput) priceInput.value = p.price;
                if (origPriceInput) origPriceInput.value = p.originalPrice || '';
                if (badgeInput) badgeInput.value = p.badge || '';
                if (makingTimeInput) makingTimeInput.value = p.estimatedMakingTime || '2-3 Business Days';
                if (descInput) descInput.value = p.description || '';
                if (unlistedChk) unlistedChk.checked = Boolean(p.unlisted);
                if (featuredChk) featuredChk.checked = Boolean(p.isFeatured);
                if (cropData) cropData.value = p.image || '';

                // Load Gallery Images
                studioGalleryImages = Array.isArray(p.galleryImages) ? [...p.galleryImages] : [];
                renderStudioGalleryPreviews();

                // Load preview
                const img = new Image();
                img.onload = function () {
                    activeCropImage = img;
                    cropScale = 1;
                    cropRotation = 0;
                    cropPanX = 0;
                    cropPanY = 0;
                    renderCropperCanvas();
                };
                img.src = p.image;
            }
        } else {
            if (modalTitle) modalTitle.textContent = '🧶 Add New Handcrafted Creation';
            if (idInput) idInput.value = '';
            if (titleInput) titleInput.value = '';
            if (priceInput) priceInput.value = '';
            if (origPriceInput) origPriceInput.value = '';
            if (badgeInput) badgeInput.value = '';
            if (makingTimeInput) makingTimeInput.value = '2-3 Business Days';
            if (descInput) descInput.value = '';
            if (unlistedChk) unlistedChk.checked = false;
            if (featuredChk) featuredChk.checked = false;
            if (cropData) cropData.value = '';
            studioGalleryImages = [];
            renderStudioGalleryPreviews();
            activeCropImage = null;
            if (cropCtx && cropCanvas) cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        }

        modal.classList.add('open');
    }

    function saveProductFromStudio() {
        const id = document.getElementById('studio-prod-id').value;
        const title = (document.getElementById('studio-title')?.value || '').trim();
        const category = document.getElementById('studio-category')?.value || 'amigurumi';
        const price = parseInt(document.getElementById('studio-price')?.value, 10) || 1200;
        const origPrice = parseInt(document.getElementById('studio-orig-price')?.value, 10) || null;
        const badge = (document.getElementById('studio-badge')?.value || '').trim();
        const makingTime = (document.getElementById('studio-making-time')?.value || '').trim() || '2-3 Business Days';
        const desc = (document.getElementById('studio-desc')?.value || '').trim();
        const unlisted = Boolean(document.getElementById('studio-unlisted-chk')?.checked);
        const isFeatured = Boolean(document.getElementById('studio-featured-chk')?.checked);
        const image = document.getElementById('studio-cropped-data')?.value || 'images/products/01_Royal_Crown_Froggy.png';

        if (!title) {
            alert('Please provide a title for this piece.');
            return;
        }

        if (id) {
            // Update existing
            let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
            const customIdx = customProducts.findIndex(p => p.id === id);

            if (customIdx >= 0) {
                customProducts[customIdx].title = title;
                customProducts[customIdx].category = category;
                customProducts[customIdx].categoryLabel = category.toUpperCase();
                customProducts[customIdx].price = price;
                if (origPrice) customProducts[customIdx].originalPrice = origPrice;
                customProducts[customIdx].badge = badge;
                customProducts[customIdx].estimatedMakingTime = makingTime;
                customProducts[customIdx].description = desc;
                customProducts[customIdx].unlisted = unlisted;
                customProducts[customIdx].isFeatured = isFeatured;
                if (image && image !== 'images/products/01_Royal_Crown_Froggy.png') customProducts[customIdx].image = image;
                if (studioGalleryImages.length > 0) customProducts[customIdx].galleryImages = [...studioGalleryImages];

                localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));
            } else {
                const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
                overrides[id] = overrides[id] || {};
                overrides[id].title = title;
                overrides[id].category = category;
                overrides[id].price = price;
                if (origPrice) overrides[id].originalPrice = origPrice;
                overrides[id].badge = badge;
                overrides[id].estimatedMakingTime = makingTime;
                overrides[id].description = desc;
                overrides[id].unlisted = unlisted;
                overrides[id].isFeatured = isFeatured;
                if (image && image !== 'images/products/01_Royal_Crown_Froggy.png') overrides[id].image = image;
                if (studioGalleryImages.length > 0) overrides[id].galleryImages = [...studioGalleryImages];

                localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));
            }
            alert(`"${title}" updated successfully!`);
        } else {
            // Create new
            const customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
            const newProd = {
                id: 'prod-custom-' + Date.now(),
                title: title,
                category: category,
                categoryLabel: category.toUpperCase(),
                price: price,
                originalPrice: origPrice,
                badge: badge || 'New Piece',
                estimatedMakingTime: makingTime,
                description: desc || 'Lovingly crocheted by hand in Gujranwala.',
                unlisted: unlisted,
                image: image,
                galleryImages: studioGalleryImages.length > 0 ? [...studioGalleryImages] : [image],
                isFeatured: isFeatured
            };
            customProducts.unshift(newProd);
            localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));
            alert(`"${title}" added to catalog!`);
        }

        closeModals();
        renderProducts();
    }

    function toggleProductFeatured(productId) {
        let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
        const customIdx = customProducts.findIndex(p => p.id === productId);
        let newStatus = false;

        if (customIdx >= 0) {
            customProducts[customIdx].isFeatured = !customProducts[customIdx].isFeatured;
            newStatus = customProducts[customIdx].isFeatured;
            localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));
        } else {
            const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
            overrides[productId] = overrides[productId] || {};
            const baseProd = currentCatalog.find(p => p.id === productId);
            const currentVal = overrides[productId].isFeatured !== undefined ? overrides[productId].isFeatured : (baseProd ? baseProd.isFeatured : false);
            overrides[productId].isFeatured = !currentVal;
            newStatus = overrides[productId].isFeatured;
            localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));
        }

        renderProducts();
        alert(newStatus ? '⭐ Product marked as FEATURED on homepage!' : 'Product unfeatured from homepage.');
    }

    function toggleProductUnlist(productId) {
        let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
        const customIdx = customProducts.findIndex(p => p.id === productId);
        let newStatus = false;

        if (customIdx >= 0) {
            customProducts[customIdx].unlisted = !customProducts[customIdx].unlisted;
            newStatus = customProducts[customIdx].unlisted;
            localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));
        } else {
            const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
            overrides[productId] = overrides[productId] || {};
            overrides[productId].unlisted = !overrides[productId].unlisted;
            newStatus = overrides[productId].unlisted;
            localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));
        }

        renderProducts();
        alert(newStatus ? 'Product has been UNLISTED (hidden from storefront, accessible in Unlisted Pieces tab).' : '✨ Product has been RELISTED (now live and visible on storefront lookbook & catalog).');
    }

    function deleteProduct(productId) {
        const item = currentCatalog.find(p => p.id === productId) ||
                     (window.MrymifyProducts && window.MrymifyProducts.getById ? window.MrymifyProducts.getById(productId) : null);
        
        const title = item ? item.title : 'this piece';
        if (!confirm(`Move "${title}" to the Recycle Bin?\n\nIt will be preserved in the Recycle Bin for 30 days before auto-purge, and can be restored back to your active catalog anytime.`)) {
            return;
        }

        let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
        const customIdx = customProducts.findIndex(p => p.id === productId);
        const isCustom = customIdx >= 0;
        const productData = isCustom ? customProducts[customIdx] : item;

        let bin = getRecycleBin();
        bin = bin.filter(b => b.id !== productId);
        bin.unshift({
            id: productId,
            title: productData?.title || 'Handcrafted Piece',
            category: productData?.category || 'amigurumi',
            categoryLabel: productData?.categoryLabel || 'Handmade Creation',
            price: productData?.price || 0,
            originalPrice: productData?.originalPrice || null,
            image: productData?.image || 'images/products/01_Royal_Crown_Froggy.png',
            galleryImages: productData?.galleryImages || [],
            badge: productData?.badge || '',
            estimatedMakingTime: productData?.estimatedMakingTime || '2-3 Business Days',
            description: productData?.description || '',
            unlisted: Boolean(productData?.unlisted),
            isFeatured: Boolean(productData?.isFeatured),
            isCustom: isCustom,
            deletedAt: Date.now()
        });
        saveRecycleBin(bin);

        if (isCustom) {
            customProducts[customIdx].deleted = true;
            localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));
        } else {
            const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
            overrides[productId] = overrides[productId] || {};
            overrides[productId].deleted = true;
            localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));
        }

        renderProducts();
        alert(`"${title}" has been moved to the Recycle Bin. (Retained for 30 days)`);
    }

    function restoreProductFromBin(productId) {
        let bin = getRecycleBin();
        const item = bin.find(b => b.id === productId);
        if (!item) {
            alert('Piece not found in Recycle Bin.');
            return;
        }

        bin = bin.filter(b => b.id !== productId);
        saveRecycleBin(bin);

        if (item.isCustom) {
            let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
            const idx = customProducts.findIndex(p => p.id === productId);
            if (idx >= 0) {
                delete customProducts[idx].deleted;
            } else {
                const restored = { ...item };
                delete restored.deletedAt;
                delete restored.isCustom;
                customProducts.unshift(restored);
            }
            localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));
        } else {
            const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
            if (overrides[productId]) {
                delete overrides[productId].deleted;
                localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));
            }
        }

        renderProducts();
        alert(`✨ "${item.title}" restored successfully to active catalog!`);
    }

    function permanentlyDeleteProduct(productId) {
        let bin = getRecycleBin();
        const item = bin.find(b => b.id === productId);
        const title = item ? item.title : 'this piece';

        if (!confirm(`Are you sure you want to permanently erase "${title}"?\n\nThis action CANNOT be undone and the piece will be immediately wiped from your boutique database.`)) {
            return;
        }

        bin = bin.filter(b => b.id !== productId);
        saveRecycleBin(bin);

        let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
        const filteredCustom = customProducts.filter(p => p.id !== productId);
        if (filteredCustom.length !== customProducts.length) {
            localStorage.setItem('mrymify_custom_products', JSON.stringify(filteredCustom));
        }

        const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
        overrides[productId] = overrides[productId] || {};
        overrides[productId].deleted = true;
        localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));

        renderProducts();
        alert(`"${title}" has been permanently erased.`);
    }

    function emptyRecycleBin() {
        const bin = getRecycleBin();
        if (!bin.length) {
            alert('The Recycle Bin is already empty.');
            return;
        }

        if (!confirm(`Are you sure you want to empty the Recycle Bin?\n\nAll ${bin.length} piece(s) in the bin will be permanently erased. This action cannot be undone.`)) {
            return;
        }

        const recycledIds = new Set(bin.map(b => b.id));
        let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
        customProducts = customProducts.filter(p => !recycledIds.has(p.id));
        localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));

        const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
        recycledIds.forEach(id => {
            overrides[id] = overrides[id] || {};
            overrides[id].deleted = true;
        });
        localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));

        localStorage.setItem('mrymify_recycle_bin', '[]');

        renderProducts();
        alert('Recycle Bin has been completely emptied.');
    }

    /* --------------------------------------------------------------------------
       Homepage Featured Pieces Curation Modal Manager
       -------------------------------------------------------------------------- */
    let stagedFeaturedIds = new Set();

    function openFeaturedManagerModal() {
        loadProducts();
        stagedFeaturedIds = new Set(
            currentCatalog
                .filter(p => !p.deleted && Boolean(p.isFeatured))
                .map(p => p.id)
        );

        renderFeaturedManagerList();

        const modal = document.getElementById('featured-manager-modal');
        if (modal) modal.classList.add('open');
    }

    function updateFeaturedManagerBadge() {
        const badge = document.getElementById('featured-manager-count-badge');
        if (badge) {
            badge.textContent = `⭐ Currently Featured: ${stagedFeaturedIds.size} piece${stagedFeaturedIds.size === 1 ? '' : 's'}`;
        }
    }

    function renderFeaturedManagerList() {
        const list = document.getElementById('featured-manager-list');
        if (!list) return;

        updateFeaturedManagerBadge();

        const nonDeleted = currentCatalog.filter(p => !p.deleted);

        if (nonDeleted.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: var(--admin-text-muted); padding: 1.5rem;">No creations found in catalog.</div>';
            return;
        }

        list.innerHTML = nonDeleted.map(p => {
            const isChecked = stagedFeaturedIds.has(p.id);
            return `
                <div class="featured-mgr-row ${isChecked ? 'is-featured' : ''}" id="mgr-row-${p.id}" style="cursor: pointer;" onclick="MrymifyAdmin.toggleFeaturedManagerItem('${p.id}')">
                    <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <input type="checkbox" id="mgr-chk-${p.id}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); MrymifyAdmin.toggleFeaturedManagerItem('${p.id}');" style="width: 18px; height: 18px; cursor: pointer;" />
                        <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1.5px solid var(--admin-border);" />
                        <div>
                            <div style="font-weight: 700; font-size: 0.9rem; color: var(--admin-text-main);">${escapeHtml(p.title)}</div>
                            <div style="font-size: 0.76rem; color: var(--admin-text-muted);">${escapeHtml(p.categoryLabel || p.category)} • Rs. ${Number(p.price).toLocaleString('en-PK')} ${p.unlisted ? '• <span style="color: #ef4444; font-weight: 600;">(Unlisted)</span>' : ''}</div>
                        </div>
                    </div>
                    <div>
                        <span class="status-pill" style="${isChecked ? 'background: rgba(234, 179, 8, 0.25); color: #b45309; border: 1px solid rgba(234, 179, 8, 0.5); font-weight: 700;' : 'background: var(--admin-border); color: var(--admin-text-muted);'}">
                            ${isChecked ? '⭐ Featured' : 'Standard'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function toggleFeaturedManagerItem(productId) {
        if (stagedFeaturedIds.has(productId)) {
            stagedFeaturedIds.delete(productId);
        } else {
            stagedFeaturedIds.add(productId);
        }
        renderFeaturedManagerList();
    }

    function saveFeaturedManagerSelections() {
        let customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
        let overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');

        // Update custom products
        customProducts.forEach(p => {
            p.isFeatured = stagedFeaturedIds.has(p.id);
        });
        localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));

        // Update overrides for standard catalog products
        currentCatalog.forEach(p => {
            const isCustom = customProducts.some(cp => cp.id === p.id);
            if (!isCustom) {
                overrides[p.id] = overrides[p.id] || {};
                overrides[p.id].isFeatured = stagedFeaturedIds.has(p.id);
            }
        });
        localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));

        closeModals();
        renderProducts();
        alert(`⭐ Homepage featured pieces successfully saved (${stagedFeaturedIds.size} active)!`);
    }

    /* ==========================================================================
       7. Discounts & Referral Code System
       ========================================================================== */

    function getReferralCodes() {
        try {
            const raw = localStorage.getItem('mrymify_referral_codes');
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return {
            'MARIYAM10': { type: 'percent', value: 10, active: true },
            'FRIEND15': { type: 'percent', value: 15, active: true },
            'STUDIO200': { type: 'fixed', value: 200, active: true }
        };
    }

    function renderPromotions() {
        // 1. Storewide discount
        try {
            const disc = JSON.parse(localStorage.getItem('mrymify_store_discounts') || '{}');
            const chk = document.getElementById('store-discount-active');
            const type = document.getElementById('store-discount-type');
            const val = document.getElementById('store-discount-value');
            if (chk) chk.checked = Boolean(disc.storewide?.active);
            if (type && disc.storewide?.type) type.value = disc.storewide.type;
            if (val && disc.storewide?.value) val.value = disc.storewide.value;
        } catch(e) {}

        // 2. Referrals Table
        const tbody = document.getElementById('referrals-table-tbody');
        if (!tbody) return;

        const codes = getReferralCodes();
        const stats = JSON.parse(localStorage.getItem('mrymify_referral_stats') || '{}');

        tbody.innerHTML = Object.entries(codes).map(([code, data]) => {
            const s = stats[code] || { uses: 0, revenue: 0 };
            const desc = data.type === 'percent' ? `${data.value}% OFF` : `Rs. ${data.value} OFF`;
            const activeStatus = data.active !== false;

            return `
                <tr>
                    <td><strong>🎟️ ${escapeHtml(code)}</strong></td>
                    <td><span style="color: var(--admin-primary); font-weight: 700;">${desc}</span></td>
                    <td><strong>${s.uses}</strong> order(s)</td>
                    <td>Rs. ${(s.revenue || 0).toLocaleString('en-PK')}</td>
                    <td>
                        <span class="status-pill ${activeStatus ? 'status-ready' : 'status-cancelled'}">
                            ${activeStatus ? 'Active' : 'Paused'}
                        </span>
                    </td>
                    <td>
                        <button type="button" class="action-btn" onclick="MrymifyAdmin.toggleReferral('${code}')">
                            ${activeStatus ? 'Pause' : 'Activate'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function saveStorewideDiscount() {
        const active = document.getElementById('store-discount-active')?.checked;
        const type = document.getElementById('store-discount-type')?.value || 'percent';
        const val = parseInt(document.getElementById('store-discount-value')?.value, 10) || 0;

        const discounts = {
            storewide: { active: active, type: type, value: val }
        };
        localStorage.setItem('mrymify_store_discounts', JSON.stringify(discounts));
        alert('Storewide discount settings saved!');
    }

    function openReferralCreatorModal() {
        const modal = document.getElementById('referral-add-modal');
        if (modal) modal.classList.add('open');
    }

    function saveNewReferral() {
        const codeInput = document.getElementById('ref-code-input');
        const typeSelect = document.getElementById('ref-type-select');
        const valInput = document.getElementById('ref-value-input');

        const code = (codeInput?.value || '').trim().toUpperCase();
        const type = typeSelect?.value || 'percent';
        const val = parseInt(valInput?.value, 10) || 10;

        if (!code) {
            alert('Please enter a referral code.');
            return;
        }

        const codes = getReferralCodes();
        codes[code] = { type: type, value: val, active: true };
        localStorage.setItem('mrymify_referral_codes', JSON.stringify(codes));

        alert(`Referral code "${code}" activated!`);
        closeModals();
        renderPromotions();
    }

    function toggleReferral(code) {
        const codes = getReferralCodes();
        if (codes[code]) {
            codes[code].active = !codes[code].active;
            localStorage.setItem('mrymify_referral_codes', JSON.stringify(codes));
            renderPromotions();
        }
    }

    /* ==========================================================================
       8. Showcase Carousel Manager
       ========================================================================== */

    function renderShowcaseManager() {
        const grid = document.getElementById('showcase-checkboxes-grid');
        const intervalSlider = document.getElementById('showcase-interval-slider');
        const autoShuffleChk = document.getElementById('showcase-auto-shuffle');

        let config = {
            productIds: ['prod-09', 'prod-01', 'prod-07', 'prod-15', 'prod-02'],
            interval: 4200,
            autoShuffle: true
        };
        try {
            const stored = JSON.parse(localStorage.getItem('mrymify_showcase_config') || '{}');
            if (stored.productIds) config = stored;
        } catch(e) {}

        if (intervalSlider) intervalSlider.value = config.interval || 4200;
        if (autoShuffleChk) autoShuffleChk.checked = config.autoShuffle !== false;
        const valLabel = document.getElementById('showcase-interval-val');
        if (valLabel) valLabel.textContent = `${(config.interval / 1000).toFixed(1)} seconds`;

        loadProducts();

        if (grid) {
            grid.innerHTML = currentCatalog.map(p => {
                const isSelected = config.productIds.includes(p.id);
                return `
                    <label class="admin-product-card" style="cursor: pointer; border-color: ${isSelected ? 'var(--admin-primary)' : 'var(--admin-border)'};">
                        <input type="checkbox" class="showcase-item-checkbox" value="${p.id}" ${isSelected ? 'checked' : ''} style="width: 20px; height: 20px; margin-right: 0.5rem;" />
                        <img src="${p.image}" alt="${p.title}" class="admin-product-thumb" />
                        <div class="admin-product-info">
                            <h4 class="admin-product-title">${escapeHtml(p.title)}</h4>
                            <div class="admin-product-price">Rs. ${Number(p.price).toLocaleString('en-PK')}</div>
                        </div>
                    </label>
                `;
            }).join('');
        }
    }

    function saveShowcaseConfig() {
        const selectedIds = Array.from(document.querySelectorAll('.showcase-item-checkbox:checked')).map(cb => cb.value);
        if (selectedIds.length === 0) {
            alert('Please select at least one piece to feature in the showcase.');
            return;
        }

        const interval = parseInt(document.getElementById('showcase-interval-slider')?.value, 10) || 4200;
        const autoShuffle = document.getElementById('showcase-auto-shuffle')?.checked !== false;

        const config = {
            productIds: selectedIds,
            interval: interval,
            autoShuffle: autoShuffle
        };

        localStorage.setItem('mrymify_showcase_config', JSON.stringify(config));
        alert('Showcase carousel preferences updated successfully!');
    }

    /* ==========================================================================
       9. Storefront Preferences & Full Database Backup / Restore
       ========================================================================== */

    function renderSettings() {
        const showLikesChk = document.getElementById('setting-show-likes');
        if (showLikesChk) {
            showLikesChk.checked = localStorage.getItem('mrymify_show_likes') !== 'false';
        }
        renderYarnPalette();
    }

    function openYarnPaletteSettings() {
        switchTab('settings');
        setTimeout(() => {
            const section = document.getElementById('settings-section-yarn');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                section.style.transition = 'box-shadow 0.3s ease';
                section.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.45)';
                setTimeout(() => {
                    section.style.boxShadow = '';
                }, 1800);
            }
        }, 80);
    }

    function toggleLikeVisibility(show) {
        localStorage.setItem('mrymify_show_likes', show ? 'true' : 'false');
    }

    function resetAllLikesToTrue() {
        if (!confirm('Reset all product likes from mock/random numbers to clean true values starting at 0?')) return;
        const cleanLikes = {};
        currentCatalog.forEach(p => {
            cleanLikes[p.id] = 0;
        });
        localStorage.setItem('mrymify_product_likes', JSON.stringify(cleanLikes));
        localStorage.setItem('mrymify_user_liked', JSON.stringify([]));
        alert('All likes have been reset to 0 true values!');
        renderOverviewMetrics();
    }

    function exportFullDatabaseBackup() {
        const backup = {
            version: '2.5',
            exportDate: new Date().toISOString(),
            orders: currentOrders,
            customProducts: JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]'),
            productOverrides: JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}'),
            productLikes: JSON.parse(localStorage.getItem('mrymify_product_likes') || '{}'),
            showLikes: localStorage.getItem('mrymify_show_likes') !== 'false',
            analytics: getStoreAnalytics(),
            referralCodes: getReferralCodes(),
            referralStats: JSON.parse(localStorage.getItem('mrymify_referral_stats') || '{}'),
            showcaseConfig: JSON.parse(localStorage.getItem('mrymify_showcase_config') || '{}'),
            storeDiscounts: JSON.parse(localStorage.getItem('mrymify_store_discounts') || '{}')
        };

        const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', jsonStr);
        dlAnchor.setAttribute('download', `mrymify_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    }

    function importDatabaseBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.orders) localStorage.setItem('mrymify_orders', JSON.stringify(data.orders));
                if (data.customProducts) localStorage.setItem('mrymify_custom_products', JSON.stringify(data.customProducts));
                if (data.productOverrides) localStorage.setItem('mrymify_product_overrides', JSON.stringify(data.productOverrides));
                if (data.productLikes) localStorage.setItem('mrymify_product_likes', JSON.stringify(data.productLikes));
                if (data.referralCodes) localStorage.setItem('mrymify_referral_codes', JSON.stringify(data.referralCodes));
                if (data.referralStats) localStorage.setItem('mrymify_referral_stats', JSON.stringify(data.referralStats));
                if (data.analytics) localStorage.setItem('mrymify_analytics', JSON.stringify(data.analytics));

                alert('Database backup restored successfully!');
                bootstrapDashboard();
            } catch(err) {
                alert('Invalid JSON backup file.');
            }
        };
        reader.readAsText(file);
    }

    function initSettingsHandlers() {
        const passForm = document.getElementById('settings-password-form');
        const passFeedback = document.getElementById('settings-password-feedback');

        if (passForm) {
            passForm.addEventListener('submit', async function (e) {
                e.preventDefault();

                const oldPass = (document.getElementById('settings-old-pass')?.value || '').trim();
                const newPass = (document.getElementById('settings-new-pass')?.value || '').trim();
                const confirmPass = (document.getElementById('settings-confirm-pass')?.value || '').trim();

                if (newPass.length < 6) {
                    showFeedback('New passcode must be at least 6 characters long.', false);
                    return;
                }
                if (newPass !== confirmPass) {
                    showFeedback('New passcodes do not match.', false);
                    return;
                }

                const currentHash = localStorage.getItem('mrymify_admin_hash');
                const oldComputed = await hashPassword(oldPass, CRYPTO_SALT);

                if (oldComputed !== currentHash) {
                    showFeedback('Current master passcode is incorrect.', false);
                    return;
                }

                const newHash = await hashPassword(newPass, CRYPTO_SALT);
                localStorage.setItem('mrymify_admin_hash', newHash);
                showFeedback('Master passcode successfully updated! Use your new passcode for future logins.', true);
                passForm.reset();
            });
        }

        function showFeedback(msg, isSuccess) {
            if (!passFeedback) return;
            passFeedback.textContent = msg;
            passFeedback.style.color = isSuccess ? '#15803d' : '#b91c1c';
            passFeedback.style.display = 'block';
        }
    }

    function exportOrdersCsv() {
        if (currentOrders.length === 0) {
            alert('No orders available to export.');
            return;
        }

        const headers = ['Order ID', 'Date', 'Status', 'Customer Name', 'Phone', 'City', 'Address', 'Payment Method', 'Referral Code', 'Total (PKR)', 'Items'];
        const rows = currentOrders.map(o => {
            const itemsStr = (o.items || []).map(i => `${i.title} (x${i.quantity})`).join('; ');
            return [
                o.orderId,
                o.date,
                o.status,
                `"${(o.customer?.name || '').replace(/"/g, '""')}"`,
                `"${o.customer?.phone || ''}"`,
                `"${(o.customer?.city || '').replace(/"/g, '""')}"`,
                `"${(o.customer?.address || '').replace(/"/g, '""')}"`,
                `"${o.customer?.paymentMethod || ''}"`,
                `"${o.referralCode || ''}"`,
                o.grandTotal,
                `"${itemsStr.replace(/"/g, '""')}"`
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `mrymify_orders_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function initModalEvents() {
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        document.querySelectorAll('.admin-modal-backdrop').forEach(modal => {
            modal.addEventListener('click', function (e) {
                if (e.target === this) closeModals();
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeModals();
        });

        const searchInput = document.getElementById('order-search-input');
        const filterSelect = document.getElementById('order-filter-status');
        if (searchInput) searchInput.addEventListener('input', renderOrdersTable);
        if (filterSelect) filterSelect.addEventListener('change', renderOrdersTable);
    }

    function closeModals() {
        document.querySelectorAll('.admin-modal-backdrop').forEach(m => m.classList.remove('open'));
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function quickSearchOrder(refQuery) {
        const query = (refQuery || document.getElementById('admin-quick-order-ref')?.value || '').trim().toLowerCase();
        if (!query) {
            alert('Please enter an Order Reference Number (e.g. MRY-18920) or Customer Name.');
            return;
        }

        const clean = query.replace(/^#/, '');
        const match = currentOrders.find(o => {
            const id = (o.orderId || '').toLowerCase();
            const name = (o.customer?.name || '').toLowerCase();
            const phone = (o.customer?.phone || '');
            return id === clean || id.includes(clean) || name.includes(clean) || phone.includes(clean);
        });

        if (match) {
            const searchInput = document.getElementById('order-search-input');
            if (searchInput) searchInput.value = match.orderId;
            openOrderDetail(match.orderId);
        } else {
            alert(`No order found matching reference: "${refQuery}". Please check the Order ID.`);
        }
    }

    /* ==========================================================================
       8. Developer Tools & Engineering Console (Hidden behind Suite, Strict Exit Lock)
       ========================================================================== */
    const DEV_SESSION_KEY = 'mrymify_dev_unlocked';
    const DEFAULT_DEV_PASS = 'mrymify@dev2026';
    let isDevUnlocked = false; // Strictly in-memory: locks immediately upon reload/close/exit

    function isDevToolsUnlocked() {
        return isDevUnlocked === true;
    }

    // Lock immediately on page unload / pagehide so leaving admin panel or closing tab locks it
    window.addEventListener('beforeunload', function () {
        lockDevTools();
    });
    window.addEventListener('pagehide', function () {
        lockDevTools();
    });

    // Easter Egg: Click "Suite" 9 times non-stop to reveal Dev Tools
    let suiteClickCount = 0;
    let suiteClickTimer = null;

    function initEasterEggSuite() {
        const suiteSpan = document.getElementById('easter-egg-suite');
        if (!suiteSpan) return;

        suiteSpan.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            suiteClickCount++;
            clearTimeout(suiteClickTimer);
            suiteClickTimer = setTimeout(() => {
                suiteClickCount = 0;
            }, 2500); // 2.5s window for 9 consecutive non-stop clicks

            // Micro visual pulse
            suiteSpan.style.color = '#6366f1';
            setTimeout(() => { suiteSpan.style.color = ''; }, 200);

            if (suiteClickCount >= 9) {
                suiteClickCount = 0;
                activateDevToolsGate();
            }
        });
    }

    function activateDevToolsGate() {
        const navBtn = document.getElementById('nav-item-devtools');
        if (navBtn) {
            navBtn.style.setProperty('display', 'flex', 'important');
        }
        switchTab('devtools');
        if (!isDevToolsUnlocked()) {
            const keyInput = document.getElementById('devtools-key-input');
            if (keyInput) {
                keyInput.focus();
                keyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function renderDevToolsTab() {
        const lockedView = document.getElementById('devtools-locked-view');
        const unlockedView = document.getElementById('devtools-unlocked-view');

        if (isDevToolsUnlocked()) {
            if (lockedView) lockedView.style.display = 'none';
            if (unlockedView) unlockedView.style.display = 'block';
            initDevToolsData();
        } else {
            if (lockedView) lockedView.style.display = 'flex';
            if (unlockedView) unlockedView.style.display = 'none';
            const alertEl = document.getElementById('devtools-auth-alert');
            if (alertEl) alertEl.style.display = 'none';
            const passInput = document.getElementById('devtools-key-input');
            if (passInput) passInput.value = '';
        }
    }

    async function unlockDevTools() {
        const input = document.getElementById('devtools-key-input');
        const alertEl = document.getElementById('devtools-auth-alert');
        const entered = (input?.value || '').trim();

        if (!entered) return;

        const storedHash = localStorage.getItem('mrymify_dev_pass_hash');
        let isValid = false;

        if (storedHash) {
            const enteredHash = await hashPassword(entered, CRYPTO_SALT);
            isValid = (enteredHash === storedHash);
        } else {
            isValid = (entered === DEFAULT_DEV_PASS);
        }

        if (isValid) {
            isDevUnlocked = true;
            sessionStorage.setItem(DEV_SESSION_KEY, 'true');
            const navBtn = document.getElementById('nav-item-devtools');
            if (navBtn) {
                navBtn.style.setProperty('display', 'flex', 'important');
            }
            if (alertEl) alertEl.style.display = 'none';
            renderDevToolsTab();
        } else {
            if (alertEl) {
                alertEl.style.display = 'block';
                alertEl.style.background = 'rgba(239, 68, 68, 0.12)';
                alertEl.style.color = '#dc2626';
                alertEl.textContent = 'Invalid developer access key. Please try again.';
            }
        }
    }

    function lockDevTools() {
        isDevUnlocked = false;
        sessionStorage.removeItem(DEV_SESSION_KEY);
        const navBtn = document.getElementById('nav-item-devtools');
        if (navBtn) {
            navBtn.style.setProperty('display', 'none', 'important');
        }
        if (activeTab === 'devtools') {
            switchTab('overview');
        }
        renderDevToolsTab();
    }

    function initDevToolsData() {
        try {
            const config = JSON.parse(localStorage.getItem('mrymify_branding_config') || '{}');
            const titleInput = document.getElementById('dev-site-title');
            const phoneInput = document.getElementById('dev-contact-phone');
            const descInput = document.getElementById('dev-site-desc');
            const threshInput = document.getElementById('dev-shipping-threshold');
            const feeInput = document.getElementById('dev-shipping-fee');

            if (titleInput) titleInput.value = config.siteTitle || 'MRYMIFY | Handcrafted Crochet Boutique';
            if (phoneInput) phoneInput.value = config.contactPhone || '923000896885';
            if (descInput) descInput.value = config.siteDesc || 'Handcrafted crochet plushies, everlasting floral bouquets, and bespoke accessories by Mariyam in Gujranwala, Pakistan.';
            if (threshInput) threshInput.value = config.freeShippingThreshold || 3500;
            if (feeInput) feeInput.value = config.shippingFee || 200;
        } catch(e) {}

        loadDevStorageKey('mrymify_analytics');
        renderYarnPalette();
    }

    /* --------------------------------------------------------------------------
       Yarn Palette Management (Custom Orders)
       -------------------------------------------------------------------------- */
    const DEFAULT_YARN_COLORS = [
        'Blush Pink', 'Sage Green', 'Lavender Purple', 'Buttercream Yellow',
        'Sky Blue', 'Crimson Red', 'Caramel Beige', 'Pure Snow White',
        'Charcoal Night', 'Emerald Forest', 'Warm Terracotta', 'Mustard Gold'
    ];

    const YARN_COLOR_SWATCHES = {
        'blush pink': '#f472b6',
        'sage green': '#84cc16',
        'lavender purple': '#a855f7',
        'buttercream yellow': '#fde047',
        'sky blue': '#38bdf8',
        'crimson red': '#dc2626',
        'caramel beige': '#d97706',
        'pure snow white': '#f8fafc',
        'charcoal night': '#334155',
        'emerald forest': '#059669',
        'warm terracotta': '#ea580c',
        'mustard gold': '#ca8a04',
        'navy blue': '#1e3a8a',
        'lilac': '#c084fc',
        'peach': '#fb923c',
        'mint green': '#4ade80',
        'mocha brown': '#78350f',
        'rose': '#f43f5e',
        'coral': '#fb7185',
        'teal': '#14b8a6',
        'olive': '#65a30d',
        'grey': '#94a3b8',
        'black': '#0f172a'
    };

    function getYarnColorHex(colorName) {
        if (!colorName) return '#ec4899';
        const key = colorName.toLowerCase().trim();
        return YARN_COLOR_SWATCHES[key] || '#ec4899';
    }

    function getYarnPalette() {
        try {
            const raw = localStorage.getItem('mrymify_available_yarn_colors');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [...DEFAULT_YARN_COLORS];
    }

    function saveYarnPalette(palette) {
        localStorage.setItem('mrymify_available_yarn_colors', JSON.stringify(palette));
    }

    function renderYarnPalette() {
        const list = document.getElementById('yarn-palette-list');
        if (!list) return;
        const colors = getYarnPalette();
        if (colors.length === 0) {
            list.innerHTML = '<span style="font-size: 0.85rem; color: var(--admin-text-muted);">No yarn shades currently defined. Clients will specify color details manually in custom requests.</span>';
            return;
        }
        list.innerHTML = colors.map((col, idx) => {
            const hex = getYarnColorHex(col);
            const isLight = hex === '#f8fafc' || hex === '#fde047';
            return `
                <span style="display: inline-flex; align-items: center; gap: 7px; background: var(--admin-card-bg); border: 1.5px solid var(--admin-border); padding: 5px 12px; border-radius: 999px; font-size: 0.84rem; font-weight: 600; color: var(--admin-text-main); box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${hex}; border: 1.5px solid ${isLight ? '#cbd5e1' : 'rgba(0,0,0,0.15)'};"></span>
                    <span>${escapeHtml(col)}</span>
                    <button type="button" onclick="MrymifyAdmin.removeYarnColor(${idx})" title="Remove color" style="background: none; border: none; color: #ef4444; font-size: 13px; cursor: pointer; padding: 0 2px; line-height: 1; font-weight: bold; margin-left: 2px;">✕</button>
                </span>
            `;
        }).join('');
    }

    function addYarnColor() {
        const input = document.getElementById('new-yarn-color-input');
        const val = (input?.value || '').trim();
        if (!val) return;
        const colors = getYarnPalette();
        if (colors.some(c => c.toLowerCase() === val.toLowerCase())) {
            alert('This color is already in the palette!');
            return;
        }
        colors.push(val);
        saveYarnPalette(colors);
        if (input) input.value = '';
        renderYarnPalette();
    }

    function removeYarnColor(idx) {
        const colors = getYarnPalette();
        if (idx >= 0 && idx < colors.length) {
            colors.splice(idx, 1);
            saveYarnPalette(colors);
            renderYarnPalette();
        }
    }

    function resetYarnPaletteToDefault() {
        if (!confirm('Reset the yarn color palette back to boutique default shades?')) return;
        saveYarnPalette([...DEFAULT_YARN_COLORS]);
        renderYarnPalette();
        alert('Yarn palette restored to boutique defaults.');
    }

    /* --------------------------------------------------------------------------
       Dev Factory Master Clear
       -------------------------------------------------------------------------- */
    function devFactoryClear() {
        const conf = confirm(
            '🚨 FACTORY MASTER CLEAR 🚨\n\n' +
            'This will permanently reset:\n' +
            '• All telemetry, visitor counts, and session stats\n' +
            '• All dwell times, views, and section click heatmaps\n' +
            '• Search queries & survey responses\n' +
            '• All likes back to clean 0 true values\n' +
            '• All custom product additions & edits\n' +
            '• Global branding overrides & referral stats\n\n' +
            'Are you sure you want to perform a complete Factory Clear?'
        );
        if (!conf) return;

        const clearOrdersToo = confirm('Do you also want to purge all customer orders and clear the pipeline completely? (Click OK to delete all orders, or Cancel to keep orders safe)');

        // 1. Analytics & Telemetry
        const cleanAnalytics = {
            visitors: 0,
            sessions: 0,
            devices: { laptop: 0, mobile: 0, idevice: 0, tablet: 0 },
            locations: {},
            checkoutLocations: {},
            acquisition: { instagram: 0, youtube: 0, facebook: 0, tiktok: 0, friend: 0, google: 0, other: 0 },
            productViews: {},
            productViewers: {},
            productDwellTime: {},
            customizationClicks: {},
            clicks: { heroCta: 0, nav: 0, categories: 0, search: 0, cart: 0, customStudio: 0, footer: 0 },
            searches: [],
            funnel: { visitors: 0, productViews: 0, carts: 0, customStarts: 0, orders: 0 }
        };
        localStorage.setItem('mrymify_analytics', JSON.stringify(cleanAnalytics));
        localStorage.removeItem('mrymify_survey_answered');
        localStorage.removeItem('mrymify_has_visited');
        sessionStorage.removeItem('mrymify_session_active');

        // 2. Likes
        const cleanLikes = {};
        if (typeof currentCatalog !== 'undefined' && Array.isArray(currentCatalog)) {
            currentCatalog.forEach(p => { cleanLikes[p.id] = 0; });
        }
        localStorage.setItem('mrymify_product_likes', JSON.stringify(cleanLikes));
        localStorage.setItem('mrymify_user_liked', JSON.stringify([]));

        // 3. Products overrides & custom products
        localStorage.removeItem('mrymify_product_overrides');
        localStorage.removeItem('mrymify_custom_products');

        // 4. Referral stats
        localStorage.removeItem('mrymify_referral_stats');

        // 5. Store branding & discounts
        localStorage.removeItem('mrymify_branding_config');
        localStorage.removeItem('mrymify_store_discounts');

        // 6. Orders if requested
        if (clearOrdersToo) {
            currentOrders = [];
            saveOrders([]);
        }

        alert('✅ FACTORY MASTER CLEAR COMPLETE!\nAll counts, telemetry, likes, and catalog modifications have been reset to pristine baseline 0.');
        location.reload();
    }

    function saveDevBranding() {
        const title = (document.getElementById('dev-site-title')?.value || '').trim();
        const phone = (document.getElementById('dev-contact-phone')?.value || '').trim();
        const desc = (document.getElementById('dev-site-desc')?.value || '').trim();
        const threshold = parseInt(document.getElementById('dev-shipping-threshold')?.value, 10) || 3500;
        const fee = parseInt(document.getElementById('dev-shipping-fee')?.value, 10) || 200;

        const config = {
            siteTitle: title,
            contactPhone: phone,
            siteDesc: desc,
            freeShippingThreshold: threshold,
            shippingFee: fee
        };

        localStorage.setItem('mrymify_branding_config', JSON.stringify(config));
        if (desc) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.content = desc;
        }
        alert('Global branding, SEO description, and shipping threshold saved successfully! The storefront will reflect these changes.');
    }

    function devResetLikes() {
        if (!confirm('Are you sure you want to reset all product like counters to 0?')) return;
        resetAllLikesToTrue();
    }

    function devResetDwell() {
        if (!confirm('Reset all product views and dwell time logs?')) return;
        const data = getStoreAnalytics();
        data.productViews = {};
        data.productViewers = {};
        data.productDwellTime = {};
        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(data);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(data));
        renderOverviewMetrics();
        alert('Product views and dwell time logs reset to 0.');
    }

    function devResetVisitors() {
        if (!confirm('Reset visitor and session counters to 0?')) return;
        const data = getStoreAnalytics();
        data.visitors = 0;
        data.sessions = 0;
        data.devices = { laptop: 0, mobile: 0, idevice: 0, tablet: 0 };
        data.locations = {};
        data.checkoutLocations = {};
        if (data.funnel) data.funnel.visitors = 0;
        localStorage.removeItem('mrymify_has_visited');
        sessionStorage.removeItem('mrymify_session_active');
        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(data);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(data));
        renderOverviewMetrics();
        alert('Visitor and session counts reset to 0.');
    }

    function devResetFunnel() {
        if (!confirm('Reset conversion funnel pipeline steps to 0?')) return;
        const data = getStoreAnalytics();
        data.funnel = { visitors: 0, productViews: 0, carts: 0, customStarts: 0, orders: 0 };
        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(data);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(data));
        renderOverviewMetrics();
        alert('Conversion funnel metrics reset to 0.');
    }

    function devResetSearches() {
        if (!confirm('Clear all recorded search queries?')) return;
        const data = getStoreAnalytics();
        data.searches = [];
        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(data);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(data));
        renderOverviewMetrics();
        alert('Search query logs cleared.');
    }

    function devResetSurvey() {
        if (!confirm('Reset first-time survey results and re-arm popup?')) return;
        const data = getStoreAnalytics();
        data.acquisition = { instagram: 0, youtube: 0, facebook: 0, tiktok: 0, friend: 0, google: 0, other: 0 };
        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(data);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(data));
        localStorage.removeItem('mrymify_survey_answered');
        renderOverviewMetrics();
        alert('Survey stats reset and popup re-armed for all visitors.');
    }

    function devResetClicks() {
        if (!confirm('Clear section click heatmap counters?')) return;
        const data = getStoreAnalytics();
        data.clicks = { heroCta: 0, nav: 0, categories: 0, search: 0, cart: 0, customStudio: 0, footer: 0 };
        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(data);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(data));
        renderOverviewMetrics();
        alert('Section click heatmap reset to 0.');
    }

    function devWipeAllAnalytics() {
        if (!confirm('⚠️ WARNING: This will cleanly wipe ALL analytics, visitors, dwell time, searches, and funnel metrics. Continue?')) return;
        const clean = {
            visitors: 0,
            sessions: 0,
            devices: { laptop: 0, mobile: 0, idevice: 0, tablet: 0 },
            locations: {},
            checkoutLocations: {},
            acquisition: { instagram: 0, youtube: 0, facebook: 0, tiktok: 0, friend: 0, google: 0, other: 0 },
            productViews: {},
            productViewers: {},
            productDwellTime: {},
            customizationClicks: {},
            clicks: { heroCta: 0, nav: 0, categories: 0, search: 0, cart: 0, customStudio: 0, footer: 0 },
            searches: [],
            funnel: { visitors: 0, productViews: 0, carts: 0, customStarts: 0, orders: 0 }
        };
        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(clean);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(clean));
        localStorage.removeItem('mrymify_survey_answered');
        renderOverviewMetrics();
        alert('All analytics metrics successfully wiped and reset to zero.');
    }

    function devSimulateTraffic(count) {
        const data = getStoreAnalytics();
        const surge = Number(count) || 50;
        data.visitors = (data.visitors || 0) + surge;
        data.sessions = (data.sessions || 0) + Math.round(surge * 1.3);
        data.devices = data.devices || { laptop: 0, mobile: 0, idevice: 0, tablet: 0 };
        data.devices.mobile += Math.round(surge * 0.55);
        data.devices.laptop += Math.round(surge * 0.25);
        data.devices.idevice += Math.round(surge * 0.15);
        data.devices.tablet += Math.round(surge * 0.05);

        data.locations = data.locations || {};
        data.locations['Gujranwala'] = (data.locations['Gujranwala'] || 0) + Math.round(surge * 0.35);
        data.locations['Lahore'] = (data.locations['Lahore'] || 0) + Math.round(surge * 0.30);
        data.locations['Islamabad / Rawalpindi'] = (data.locations['Islamabad / Rawalpindi'] || 0) + Math.round(surge * 0.20);
        data.locations['Karachi'] = (data.locations['Karachi'] || 0) + Math.round(surge * 0.15);

        data.funnel = data.funnel || { visitors: 0, productViews: 0, carts: 0, customStarts: 0, orders: 0 };
        data.funnel.visitors += surge;
        data.funnel.productViews += Math.round(surge * 2.4);
        data.funnel.carts += Math.round(surge * 0.18);
        data.funnel.customStarts += Math.round(surge * 0.08);

        if (window.MrymifyAnalytics) window.MrymifyAnalytics.saveAnalytics(data);
        else localStorage.setItem('mrymify_analytics', JSON.stringify(data));

        renderOverviewMetrics();
        alert(`Successfully injected traffic surge of +${surge} visitors and impressions!`);
    }

    function devGenerateMockOrders(count) {
        const num = Number(count) || 5;
        const mockCustomers = [
            { name: 'Zainab Tariq', phone: '03217894561', city: 'Gujranwala', address: 'House 42, Block B, Model Town' },
            { name: 'Bilal Ahmad', phone: '03024567891', city: 'Lahore', address: 'Street 7, Phase 5 DHA' },
            { name: 'Momina Sheikh', phone: '03338901234', city: 'Islamabad', address: 'Sector F-7/2, Street 18' },
            { name: 'Farhan Ali', phone: '03135678902', city: 'Karachi', address: 'Apartment 4B, Clifton Block 4' },
            { name: 'Noor Fatima', phone: '03456789012', city: 'Faisalabad', address: 'Kohinoor City, House 12' }
        ];

        const statuses = ['pending', 'crafting', 'ready', 'dispatched', 'delivered'];
        const sampleProds = currentCatalog.slice(0, 8);

        for (let i = 0; i < num; i++) {
            const cust = mockCustomers[i % mockCustomers.length];
            const p = sampleProds[i % sampleProds.length] || sampleProds[0];
            const status = statuses[i % statuses.length];
            const subtotal = p.price;
            const grandTotal = subtotal + 200;

            const order = {
                orderId: 'MRY-' + Math.floor(10000 + Math.random() * 90000),
                date: new Date(Date.now() - (i * 3600000 * 18)).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }),
                status: status,
                customer: cust,
                items: [
                    { id: p.id, title: p.title, price: p.price, quantity: 1, image: p.image }
                ],
                subtotal: subtotal,
                shippingFee: 200,
                grandTotal: grandTotal,
                referralCode: i % 2 === 0 ? 'MARIYAM10' : null,
                discount: i % 2 === 0 ? Math.round(subtotal * 0.1) : 0
            };

            currentOrders.unshift(order);
        }

        saveOrders(currentOrders);
        renderOrdersTable();
        renderOverviewMetrics();
        alert(`Generated ${num} realistic synthetic customer orders!`);
    }

    function devClearAllOrders() {
        if (!confirm('⚠️ WARNING: Delete ALL orders from the pipeline? This action cannot be undone.')) return;
        currentOrders = [];
        saveOrders([]);
        renderOrdersTable();
        renderOverviewMetrics();
        alert('All orders have been cleared.');
    }

    function loadDevStorageKey(key) {
        const editor = document.getElementById('dev-storage-json-editor');
        const status = document.getElementById('dev-json-status');
        if (!editor) return;

        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                editor.value = 'null';
                if (status) status.textContent = `Key "${key}" is currently empty or unset.`;
                return;
            }
            const parsed = JSON.parse(raw);
            editor.value = JSON.stringify(parsed, null, 2);
            if (status) {
                status.textContent = `✓ Loaded "${key}" (${raw.length} bytes)`;
                status.style.color = '#10b981';
            }
        } catch (e) {
            editor.value = localStorage.getItem(key) || '';
            if (status) {
                status.textContent = `Raw string loaded for "${key}"`;
                status.style.color = 'var(--admin-text-muted)';
            }
        }
    }

    function saveDevStorageKey() {
        const select = document.getElementById('dev-storage-key-select');
        const editor = document.getElementById('dev-storage-json-editor');
        const status = document.getElementById('dev-json-status');
        const key = select?.value;

        if (!key || !editor) return;

        try {
            const parsed = JSON.parse(editor.value);
            localStorage.setItem(key, JSON.stringify(parsed));
            if (status) {
                status.textContent = `✓ Successfully saved "${key}" to database!`;
                status.style.color = '#10b981';
            }
            alert(`Key "${key}" updated in LocalStorage!`);
            if (key === 'mrymify_customer_orders') loadOrders();
            if (key === 'mrymify_analytics') renderOverviewMetrics();
            if (key === 'mrymify_product_overrides' || key === 'mrymify_custom_products') loadProducts();
        } catch (e) {
            if (status) {
                status.textContent = `✗ Invalid JSON syntax: ${e.message}`;
                status.style.color = '#dc2626';
            }
            alert('JSON syntax error: Please ensure valid JSON formatting before saving.');
        }
    }

    async function changeDevKey() {
        const newKey = document.getElementById('dev-new-key')?.value || '';
        const confirmKey = document.getElementById('dev-confirm-key')?.value || '';
        const feedback = document.getElementById('dev-key-feedback');

        if (!newKey || newKey.length < 6) {
            if (feedback) {
                feedback.style.display = 'block';
                feedback.style.color = '#dc2626';
                feedback.textContent = 'Developer key must be at least 6 characters long.';
            }
            return;
        }

        if (newKey !== confirmKey) {
            if (feedback) {
                feedback.style.display = 'block';
                feedback.style.color = '#dc2626';
                feedback.textContent = 'Keys do not match. Please verify.';
            }
            return;
        }

        const hashed = await hashPassword(newKey, CRYPTO_SALT);
        localStorage.setItem('mrymify_dev_pass_hash', hashed);
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.color = '#10b981';
            feedback.textContent = '✓ Developer access key successfully updated!';
        }
        document.getElementById('dev-new-key').value = '';
        document.getElementById('dev-confirm-key').value = '';
        setTimeout(() => { if (feedback) feedback.style.display = 'none'; }, 3500);
    }

    // Public Admin API
    window.MrymifyAdmin = {
        openOrderDetail: openOrderDetail,
        messageCustomerWhatsApp: messageCustomerWhatsApp,
        openProductCreatorModal: openProductCreatorModal,
        saveProductFromStudio: saveProductFromStudio,
        setProductViewMode: setProductViewMode,
        exportOrdersCsv: exportOrdersCsv,
        quickSearchOrder: quickSearchOrder,
        refreshAnalytics: renderOverviewMetrics,
        openRevenueBreakdownModal: openRevenueBreakdownModal,
        openOrdersBreakdownModal: openOrdersBreakdownModal,
        openVisitorIntelligenceModal: openVisitorIntelligenceModal,
        toggleVisitorTimeline: toggleVisitorTimeline,
        filterVisitorJourneys: filterVisitorJourneys,
        openReferralCreatorModal: openReferralCreatorModal,
        saveNewReferral: saveNewReferral,
        toggleReferral: toggleReferral,
        saveStorewideDiscount: saveStorewideDiscount,
        saveShowcaseConfig: saveShowcaseConfig,
        toggleLikeVisibility: toggleLikeVisibility,
        resetAllLikesToTrue: resetAllLikesToTrue,
        exportFullDatabaseBackup: exportFullDatabaseBackup,
        importDatabaseBackup: importDatabaseBackup,
        seedSampleOrders: function () {
            seedSampleOrders();
            renderOrdersTable();
            renderOverviewMetrics();
            alert('Sample orders seeded!');
        },
        removeStudioGalleryImage: removeStudioGalleryImage,
        closeModals: closeModals,
        // Order Deletion & Bulk Management
        toggleSelectAllOrders: toggleSelectAllOrders,
        onOrderSelectChange: onOrderSelectChange,
        deleteSelectedOrders: deleteSelectedOrders,
        deleteSingleOrder: deleteSingleOrder,
        verifyOrderPayment: verifyOrderPayment,
        contactCustomer: messageCustomerWhatsApp,
        // Product Management
        toggleProductUnlist: toggleProductUnlist,
        toggleProductFeatured: toggleProductFeatured,
        openFeaturedManagerModal: openFeaturedManagerModal,
        saveFeaturedManagerSelections: saveFeaturedManagerSelections,
        toggleFeaturedManagerItem: toggleFeaturedManagerItem,
        deleteProduct: deleteProduct,
        restoreProductFromBin: restoreProductFromBin,
        permanentlyDeleteProduct: permanentlyDeleteProduct,
        emptyRecycleBin: emptyRecycleBin,
        // Yarn Palette
        openYarnPaletteSettings: openYarnPaletteSettings,
        renderYarnPalette: renderYarnPalette,
        addYarnColor: addYarnColor,
        removeYarnColor: removeYarnColor,
        resetYarnPaletteToDefault: resetYarnPaletteToDefault,
        // Product Analytics Modal API
        openProductAnalyticsModal: openProductAnalyticsModal,
        switchProductMetricTab: switchProductMetricTab,
        filterProductAnalytics: filterProductAnalytics,
        showProductDetailsModal: showProductDetailsModal,
        // DevTools API
        unlockDevTools: unlockDevTools,
        lockDevTools: lockDevTools,
        saveDevBranding: saveDevBranding,
        devFactoryClear: devFactoryClear,
        devResetLikes: devResetLikes,
        devResetDwell: devResetDwell,
        devResetVisitors: devResetVisitors,
        devResetFunnel: devResetFunnel,
        devResetSearches: devResetSearches,
        devResetSurvey: devResetSurvey,
        devResetClicks: devResetClicks,
        devWipeAllAnalytics: devWipeAllAnalytics,
        devSimulateTraffic: devSimulateTraffic,
        devGenerateMockOrders: devGenerateMockOrders,
        devClearAllOrders: devClearAllOrders,
        loadDevStorageKey: loadDevStorageKey,
        saveDevStorageKey: saveDevStorageKey,
        changeDevKey: changeDevKey,
        toggleMobileSidebar: toggleMobileSidebar,
        closeMobileSidebar: closeMobileSidebar,
    };

})();
