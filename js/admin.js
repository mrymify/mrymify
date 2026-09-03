/**
 * Mrymify - Admin Portal Scripts (js/admin.js)
 * Cryptographic Web Crypto SHA-256 Authentication, Order Pipeline Management,
 * Catalog & Price Control, and Store Settings for Mariyam & Studio Team.
 */

(function () {
    'use strict';

    // Cryptographic Salt for Master Password Hashing
    const CRYPTO_SALT = 'mrymify_artisan_boutique_salt_2026';
    const DEFAULT_PASSCODE = 'mrymify@2026';
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes
    const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

    // Store state
    let currentOrders = [];
    let currentCatalog = [];
    let activeTab = 'overview';
    let lockoutInterval = null;

    document.addEventListener('DOMContentLoaded', function () {
        initAuthSecurity();
        initClock();
    });

    /* ==========================================================================
       1. Cryptographic Security & Authentication System
       ========================================================================== */

    /**
     * Hashes a password string using Web Crypto API SHA-256 + Salt
     */
    async function hashPassword(password, salt) {
        const enc = new TextEncoder();
        const data = enc.encode(salt + password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Initializes default password hash if not set
     */
    async function ensureMasterHash() {
        if (!localStorage.getItem('mrymify_admin_hash')) {
            const defaultHash = await hashPassword(DEFAULT_PASSCODE, CRYPTO_SALT);
            localStorage.setItem('mrymify_admin_hash', defaultHash);
        }
    }

    /**
     * Sets up login form, rate limiting, and session verification
     */
    async function initAuthSecurity() {
        await ensureMasterHash();

        const authScreen = document.getElementById('admin-auth-screen');
        const dashScreen = document.getElementById('admin-dashboard-screen');
        const loginForm = document.getElementById('admin-login-form');
        const passInput = document.getElementById('admin-password-input');
        const alertBox = document.getElementById('admin-auth-alert');
        const toggleBtn = document.getElementById('btn-toggle-password');
        const logoutBtn = document.getElementById('btn-admin-logout');

        // Check active session
        if (isSessionValid()) {
            unlockDashboard();
            return;
        }

        checkLockoutState();

        // Password visibility toggle
        if (toggleBtn && passInput) {
            toggleBtn.addEventListener('click', function () {
                const isPass = passInput.type === 'password';
                passInput.type = isPass ? 'text' : 'password';
                toggleBtn.textContent = isPass ? '🙈' : '👁️';
            });
        }

        // Login submission handler
        if (loginForm) {
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();

                if (isLockedOut()) {
                    checkLockoutState();
                    return;
                }

                const inputVal = (passInput?.value || '').trim();
                if (!inputVal) {
                    showAuthAlert('Please enter the admin master passcode.', 'error');
                    return;
                }

                const computedHash = await hashPassword(inputVal, CRYPTO_SALT);
                const storedHash = localStorage.getItem('mrymify_admin_hash');

                if (computedHash === storedHash) {
                    // Success: Clear failed attempts and establish session
                    localStorage.removeItem('mrymify_failed_attempts');
                    localStorage.removeItem('mrymify_lockout_until');
                    createSession();
                    unlockDashboard();
                } else {
                    // Failure: Record failed attempt
                    handleFailedAttempt();
                }
            });
        }

        // Logout handler
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                terminateSession();
            });
        }

        // Idle timer activity listener
        ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => {
            window.addEventListener(evt, refreshActivity, { passive: true });
        });

        // Periodic idle check
        setInterval(function () {
            if (dashScreen && dashScreen.style.display !== 'none' && !isSessionValid()) {
                alert('Admin session has expired due to 30 minutes of inactivity.');
                terminateSession();
            }
        }, 30000);
    }

    /**
     * Checks if current session is active and not expired
     */
    function isSessionValid() {
        try {
            const raw = sessionStorage.getItem('mrymify_admin_session');
            if (!raw) return false;
            const session = JSON.parse(raw);
            const now = Date.now();
            return session.token && (now - session.lastActive) < SESSION_IDLE_TIMEOUT_MS;
        } catch (e) {
            return false;
        }
    }

    /**
     * Refreshes last active timestamp
     */
    function refreshActivity() {
        try {
            const raw = sessionStorage.getItem('mrymify_admin_session');
            if (!raw) return;
            const session = JSON.parse(raw);
            session.lastActive = Date.now();
            sessionStorage.setItem('mrymify_admin_session', JSON.stringify(session));
        } catch (e) {}
    }

    /**
     * Generates a cryptographically random session token
     */
    function createSession() {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        const token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');

        sessionStorage.setItem('mrymify_admin_session', JSON.stringify({
            token: token,
            loginTime: Date.now(),
            lastActive: Date.now()
        }));
    }

    /**
     * Logs out and cleans up session
     */
    function terminateSession() {
        sessionStorage.removeItem('mrymify_admin_session');
        const authScreen = document.getElementById('admin-auth-screen');
        const dashScreen = document.getElementById('admin-dashboard-screen');
        if (dashScreen) dashScreen.style.display = 'none';
        if (authScreen) authScreen.style.display = 'flex';
        const passInput = document.getElementById('admin-password-input');
        if (passInput) passInput.value = '';
    }

    /**
     * Transitions from login to authenticated dashboard
     */
    function unlockDashboard() {
        const authScreen = document.getElementById('admin-auth-screen');
        const dashScreen = document.getElementById('admin-dashboard-screen');
        if (authScreen) authScreen.style.display = 'none';
        if (dashScreen) {
            dashScreen.style.display = 'flex';
            bootstrapDashboard();
        }
    }

    /**
     * Records failed login attempts and triggers brute force lockout
     */
    function handleFailedAttempt() {
        let attempts = parseInt(localStorage.getItem('mrymify_failed_attempts') || '0', 10) + 1;
        localStorage.setItem('mrymify_failed_attempts', attempts);

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            const lockoutTime = Date.now() + LOCKOUT_DURATION_MS;
            localStorage.setItem('mrymify_lockout_until', lockoutTime);
            checkLockoutState();
        } else {
            const remaining = MAX_FAILED_ATTEMPTS - attempts;
            showAuthAlert(`Incorrect master passcode. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before temporary lockout.`, 'error');
        }
    }

    /**
     * Checks if brute force lockout is active
     */
    function isLockedOut() {
        const lockoutUntil = parseInt(localStorage.getItem('mrymify_lockout_until') || '0', 10);
        return Date.now() < lockoutUntil;
    }

    /**
     * Enforces lockout UI and countdown timer
     */
    function checkLockoutState() {
        const lockoutUntil = parseInt(localStorage.getItem('mrymify_lockout_until') || '0', 10);
        const submitBtn = document.getElementById('btn-admin-submit');
        const passInput = document.getElementById('admin-password-input');

        if (Date.now() < lockoutUntil) {
            if (submitBtn) submitBtn.disabled = true;
            if (passInput) passInput.disabled = true;

            clearInterval(lockoutInterval);
            lockoutInterval = setInterval(function () {
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
    }

    function initNavigation() {
        const navButtons = document.querySelectorAll('.admin-nav-item');
        navButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const targetTab = this.getAttribute('data-tab');
                switchTab(targetTab);
            });
        });
    }

    function switchTab(tabId) {
        activeTab = tabId;
        // Update sidebar active buttons
        document.querySelectorAll('.admin-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });
        // Update tab panes
        document.querySelectorAll('.admin-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabId}`);
        });

        // Re-render data for the active tab
        if (tabId === 'overview') {
            renderOverviewMetrics();
            renderRecentOrdersTable();
        } else if (tabId === 'orders') {
            renderOrdersTable();
        } else if (tabId === 'products') {
            renderProductsGrid();
        }
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
       3. Order Management System
       ========================================================================== */

    function loadOrders() {
        try {
            const raw = localStorage.getItem('mrymify_orders');
            currentOrders = raw ? JSON.parse(raw) : [];
        } catch (e) {
            currentOrders = [];
        }

        // If no orders exist yet, add sample orders so admin is immediately interactive
        if (currentOrders.length === 0) {
            seedSampleOrders();
        }

        // Ensure every order has a status
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
                shipping: 200,
                grandTotal: 2950
            },
            {
                orderId: 'MRY-19412',
                date: 'Sep 2, 2026',
                status: 'pending',
                customer: {
                    name: 'Hamza Malik',
                    phone: '03229876543',
                    city: 'Islamabad',
                    address: 'Sector F-7/2, Street 18, Islamabad',
                    notes: 'Doctor doll gift for graduation convocation.',
                    paymentMethod: 'Bank Transfer / EasyPaisa'
                },
                items: [
                    { id: 'prod-03', title: 'Doctor Doll Keychain', price: 550, quantity: 1, image: 'images/products/03_Doctor_Doll_Keychain.png' },
                    { id: 'prod-02', title: 'Sweet Heart Panda Plush', price: 1350, quantity: 1, image: 'images/products/02_Sweet_Heart_Panda_Plush.png' }
                ],
                subtotal: 1900,
                shipping: 200,
                grandTotal: 2100
            }
        ];
    }

    function getStatusPill(status) {
        switch (status) {
            case 'crafting':
                return '<span class="status-pill status-crafting">🧶 In Progress (Crafting)</span>';
            case 'ready':
                return '<span class="status-pill status-ready">✨ Ready for Packaging</span>';
            case 'dispatched':
                return '<span class="status-pill status-dispatched">🚚 Dispatched</span>';
            case 'delivered':
                return '<span class="status-pill status-delivered">✅ Delivered</span>';
            case 'cancelled':
                return '<span class="status-pill status-cancelled">❌ Cancelled</span>';
            case 'pending':
            default:
                return '<span class="status-pill status-pending">⏳ Pending Review</span>';
        }
    }

    function renderOverviewMetrics() {
        const totalRevenue = currentOrders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
        const totalOrders = currentOrders.length;
        const craftingCount = currentOrders.filter(o => o.status === 'crafting' || o.status === 'pending').length;
        const deliveredCount = currentOrders.filter(o => o.status === 'delivered').length;

        const revEl = document.getElementById('metric-total-revenue');
        const ordersEl = document.getElementById('metric-total-orders');
        const craftEl = document.getElementById('metric-crafting-queue');
        const delEl = document.getElementById('metric-delivered-count');

        if (revEl) revEl.textContent = `Rs. ${totalRevenue.toLocaleString('en-PK')}`;
        if (ordersEl) ordersEl.textContent = totalOrders;
        if (craftEl) craftEl.textContent = craftingCount;
        if (delEl) delEl.textContent = deliveredCount;

        renderRecentOrdersTable();
    }

    function renderRecentOrdersTable() {
        const tbody = document.getElementById('recent-orders-tbody');
        if (!tbody) return;

        const recent = currentOrders.slice(0, 5);
        if (recent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">No orders found yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = recent.map(o => `
            <tr>
                <td><strong>${o.orderId}</strong></td>
                <td>${o.date}</td>
                <td>${escapeHtml(o.customer?.name || 'Customer')}</td>
                <td>Rs. ${(Number(o.grandTotal) || 0).toLocaleString('en-PK')}</td>
                <td>${getStatusPill(o.status)}</td>
                <td>
                    <button class="action-btn" onclick="MrymifyAdmin.openOrderDetail('${o.orderId}')">View Details</button>
                </td>
            </tr>
        `).join('');
    }

    function renderOrdersTable() {
        const tbody = document.getElementById('orders-table-tbody');
        const searchInput = document.getElementById('order-search-input');
        const filterSelect = document.getElementById('order-filter-status');
        if (!tbody) return;

        const query = (searchInput?.value || '').toLowerCase().trim();
        const statusFilter = filterSelect?.value || 'all';

        const filtered = currentOrders.filter(o => {
            const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
            const matchesQuery = !query || 
                (o.orderId && o.orderId.toLowerCase().includes(query)) ||
                (o.customer?.name && o.customer.name.toLowerCase().includes(query)) ||
                (o.customer?.phone && o.customer.phone.includes(query)) ||
                (o.customer?.city && o.customer.city.toLowerCase().includes(query));
            return matchesStatus && matchesQuery;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-text-muted); padding: 2.5rem;">No orders match the selected filters.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(o => `
            <tr>
                <td><strong>${o.orderId}</strong></td>
                <td>${o.date}</td>
                <td>
                    <div><strong>${escapeHtml(o.customer?.name || 'Customer')}</strong></div>
                    <div style="font-size: 0.8rem; color: var(--admin-text-muted);">${escapeHtml(o.customer?.phone || '')} • ${escapeHtml(o.customer?.city || '')}</div>
                </td>
                <td>${o.items?.length || 0} item${(o.items?.length || 0) !== 1 ? 's' : ''}</td>
                <td><strong>Rs. ${(Number(o.grandTotal) || 0).toLocaleString('en-PK')}</strong></td>
                <td>${getStatusPill(o.status)}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn" onclick="MrymifyAdmin.openOrderDetail('${o.orderId}')">Details</button>
                        <button class="action-btn btn-admin-wa" onclick="MrymifyAdmin.messageCustomerWhatsApp('${o.orderId}')" title="Message customer on WhatsApp">💬 WA</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Opens detailed order view modal
     */
    function openOrderDetail(orderId) {
        const order = currentOrders.find(o => o.orderId === orderId);
        if (!order) return;

        const modal = document.getElementById('order-detail-modal');
        const titleEl = document.getElementById('modal-order-title');
        const contentEl = document.getElementById('modal-order-content');
        const statusSelect = document.getElementById('modal-order-status-select');
        const saveStatusBtn = document.getElementById('modal-btn-save-status');
        const waBtn = document.getElementById('modal-btn-wa-customer');

        if (!modal) return;

        if (titleEl) titleEl.textContent = `Order Details: ${order.orderId}`;
        if (statusSelect) statusSelect.value = order.status || 'pending';

        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${item.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${item.title}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
                        <div>
                            <strong>${escapeHtml(item.title)}</strong>
                            <div style="font-size: 0.8rem; color: var(--admin-text-muted);">Rs. ${Number(item.price).toLocaleString('en-PK')} each</div>
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
                <div style="background: var(--admin-bg); padding: 1rem; border-radius: 10px; font-size: 0.9rem; line-height: 1.5;">
                    <div><strong>Name:</strong> ${escapeHtml(order.customer?.name || '')}</div>
                    <div><strong>Phone / WhatsApp:</strong> ${escapeHtml(order.customer?.phone || '')}</div>
                    <div><strong>Delivery Address:</strong> ${escapeHtml(order.customer?.address || '')}, ${escapeHtml(order.customer?.city || '')}</div>
                    <div><strong>Payment Method:</strong> ${escapeHtml(order.customer?.paymentMethod || 'COD')}</div>
                    ${order.customer?.notes ? `<div style="margin-top: 0.4rem; color: var(--admin-primary); font-weight: 600;">📝 Notes: ${escapeHtml(order.customer.notes)}</div>` : ''}
                </div>
            </div>

            <div class="order-detail-section">
                <div class="order-detail-label">Ordered Items</div>
                <table class="order-items-table">
                    ${itemsHtml}
                </table>
                <div style="text-align: right; font-size: 0.9rem; margin-top: 0.5rem; line-height: 1.5;">
                    <div>Subtotal: Rs. ${(Number(order.subtotal) || 0).toLocaleString('en-PK')}</div>
                    <div>Shipping: ${order.shipping === 0 ? 'FREE' : 'Rs. ' + order.shipping}</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--admin-primary); margin-top: 0.25rem;">
                        Total: Rs. ${(Number(order.grandTotal) || 0).toLocaleString('en-PK')}
                    </div>
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

        if (waBtn) {
            waBtn.onclick = function () {
                messageCustomerWhatsApp(order.orderId);
            };
        }

        modal.classList.add('open');
    }

    /**
     * Formats an instant tailored WhatsApp message to the customer
     */
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
       4. Product Catalog & Inventory Management
       ========================================================================== */

    function loadProducts() {
        if (window.MrymifyProducts && typeof window.MrymifyProducts.getEffectiveCatalog === 'function') {
            currentCatalog = window.MrymifyProducts.getEffectiveCatalog();
        } else {
            currentCatalog = [];
        }
        const badge = document.getElementById('badge-products-count');
        if (badge) badge.textContent = currentCatalog.length;
    }

    function renderProductsGrid() {
        const container = document.getElementById('admin-products-container');
        if (!container) return;

        loadProducts();

        container.innerHTML = currentCatalog.map(p => `
            <div class="admin-product-card">
                <img src="${p.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${p.title}" class="admin-product-thumb" />
                <div class="admin-product-info">
                    <h4 class="admin-product-title">${escapeHtml(p.title)}</h4>
                    <div class="admin-product-meta">${escapeHtml(p.categoryLabel || p.category)} • ${p.badge ? `<span style="color: var(--admin-primary); font-weight: 600;">${p.badge}</span>` : 'Standard'}</div>
                    <div class="admin-product-price">Rs. ${Number(p.price).toLocaleString('en-PK')}</div>
                </div>
                <button class="action-btn" onclick="MrymifyAdmin.openProductEditor('${p.id}')">Edit</button>
            </div>
        `).join('');
    }

    /**
     * Opens modal to edit price, badge, or stock of a product
     */
    function openProductEditor(productId) {
        const product = currentCatalog.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('product-edit-modal');
        const titleEl = document.getElementById('edit-prod-title');
        const priceInput = document.getElementById('edit-prod-price');
        const badgeInput = document.getElementById('edit-prod-badge');
        const saveBtn = document.getElementById('btn-save-product-edit');

        if (!modal) return;

        if (titleEl) titleEl.textContent = `Edit Product: ${product.title}`;
        if (priceInput) priceInput.value = product.price;
        if (badgeInput) badgeInput.value = product.badge || '';

        if (saveBtn) {
            saveBtn.onclick = function () {
                const newPrice = parseInt(priceInput.value, 10);
                const newBadge = badgeInput.value.trim();

                if (isNaN(newPrice) || newPrice < 0) {
                    alert('Please enter a valid price in PKR.');
                    return;
                }

                try {
                    const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
                    overrides[product.id] = overrides[product.id] || {};
                    overrides[product.id].price = newPrice;
                    overrides[product.id].badge = newBadge;

                    localStorage.setItem('mrymify_product_overrides', JSON.stringify(overrides));
                    alert('Product updated successfully! Changes are live across the store.');
                    closeModals();
                    renderProductsGrid();
                } catch (e) {
                    console.error('Error saving product override', e);
                }
            };
        }

        modal.classList.add('open');
    }

    /**
     * Handles adding a brand new product creation
     */
    function addNewProduct(productData) {
        try {
            const customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
            const newId = 'prod-custom-' + Date.now();
            const newProduct = {
                id: newId,
                title: productData.title,
                category: productData.category || 'amigurumi',
                categoryLabel: productData.categoryLabel || 'Amigurumi & Plushies',
                price: parseInt(productData.price, 10) || 1000,
                image: productData.image || 'images/products/01_Royal_Crown_Froggy.png',
                badge: productData.badge || 'New Creation',
                description: productData.description || 'Handcrafted crochet piece made with soft hypoallergenic yarn.',
                isFeatured: Boolean(productData.isFeatured)
            };
            customProducts.unshift(newProduct);
            localStorage.setItem('mrymify_custom_products', JSON.stringify(customProducts));
            alert(`"${newProduct.title}" has been added to the store catalog!`);
            closeModals();
            renderProductsGrid();
        } catch (e) {
            console.error('Error adding custom product', e);
        }
    }

    /* ==========================================================================
       5. Store Settings & Password Management
       ========================================================================== */

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

    /**
     * Exports all orders as CSV for spreadsheets/accounting
     */
    function exportOrdersCsv() {
        if (currentOrders.length === 0) {
            alert('No orders available to export.');
            return;
        }

        const headers = ['Order ID', 'Date', 'Status', 'Customer Name', 'Phone', 'City', 'Address', 'Payment Method', 'Total (PKR)', 'Items'];
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

    /* ==========================================================================
       6. Modals UI Control
       ========================================================================== */

    function initModalEvents() {
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        document.querySelectorAll('.admin-modal-backdrop').forEach(modal => {
            modal.addEventListener('click', function (e) {
                if (e.target === this) closeModals();
            });
        });

        // Search & Filter listeners
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

    /**
     * Quickly locates an order by reference number or customer info and opens details modal
     */
    function quickSearchOrder(refQuery) {
        const query = (refQuery || document.getElementById('admin-quick-order-ref')?.value || '').trim().toLowerCase();
        if (!query) {
            alert('Please enter an Order Reference Number (e.g. MRY-18920) or Customer Name.');
            return;
        }

        // Clean query: strip '#' or whitespace
        const clean = query.replace(/^#/, '');

        // Search in currentOrders
        const match = currentOrders.find(o => {
            const id = (o.orderId || '').toLowerCase();
            const name = (o.customer?.name || '').toLowerCase();
            const phone = (o.customer?.phone || '');
            return id === clean || id.includes(clean) || name.includes(clean) || phone.includes(clean);
        });

        if (match) {
            // Pre-populate search input on Orders tab
            const searchInput = document.getElementById('order-search-input');
            if (searchInput) {
                searchInput.value = match.orderId;
            }
            openOrderDetail(match.orderId);
        } else {
            alert(`No order found matching reference: "${refQuery}". Please check the Order ID.`);
        }
    }

    // Expose Admin API
    window.MrymifyAdmin = {
        openOrderDetail: openOrderDetail,
        messageCustomerWhatsApp: messageCustomerWhatsApp,
        openProductEditor: openProductEditor,
        addNewProduct: addNewProduct,
        exportOrdersCsv: exportOrdersCsv,
        quickSearchOrder: quickSearchOrder,
        seedSampleOrders: function () {
            seedSampleOrders();
            saveOrders();
            renderOrdersTable();
            renderOverviewMetrics();
            alert('Sample orders seeded for testing!');
        },
        closeModals: closeModals
    };

})();
