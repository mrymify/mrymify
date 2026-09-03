/**
 * Mrymify - Cart, Order Placement & Live Progress Management (js/cart.js)
 * Manages cart item rendering, dynamic stepper updates, free shipping threshold,
 * order placement with rich product receipts, dedicated "View Your Orders" tab,
 * and real-time live synchronization with the Admin Panel.
 */

(function () {
    'use strict';

    const WHATSAPP_NUMBER = '923000896885';
    const FREE_SHIPPING_THRESHOLD = 3500;
    const STANDARD_SHIPPING_FEE = 200;

    let currentCartMode = 'cart'; // 'cart' or 'orders'
    let activeTrackingOrderId = null;

    document.addEventListener('DOMContentLoaded', function () {
        renderCartPage();
        initCheckoutEvents();
        initOrderTracking();
        updateCartBadgeAndCounts();

        // Check if URL has ?view=orders
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('view') === 'orders') {
            switchCartMode('orders');
        }
    });

    /**
     * Reads cart array from localStorage
     */
    function getCart() {
        try {
            const raw = localStorage.getItem('mrymify_cart');
            if (!raw) return [];
            const items = JSON.parse(raw);
            return Array.isArray(items) ? items : [];
        } catch (e) {
            console.error('Error reading cart', e);
            return [];
        }
    }

    /**
     * Saves cart array to localStorage and syncs navbar & tab badges
     */
    function saveCart(cart) {
        try {
            localStorage.setItem('mrymify_cart', JSON.stringify(cart));
            const totalCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
            if (window.MrymifyNavbar && typeof window.MrymifyNavbar.updateCartBadge === 'function') {
                window.MrymifyNavbar.updateCartBadge(totalCount);
            }
            updateCartBadgeAndCounts();
        } catch (e) {
            console.error('Error saving cart', e);
        }
    }

    /**
     * Updates top mode tab count badges
     */
    function updateCartBadgeAndCounts() {
        const cart = getCart();
        const orders = getSavedOrders();
        const totalCartItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

        const tabCartBadge = document.getElementById('tab-cart-count');
        const tabOrdersBadge = document.getElementById('tab-orders-count');

        if (tabCartBadge) tabCartBadge.textContent = totalCartItems;
        if (tabOrdersBadge) tabOrdersBadge.textContent = orders.length;
    }

    /**
     * Switches between "Shopping Bag" and "View Your Orders" modes
     */
    function switchCartMode(mode) {
        currentCartMode = mode;

        const tabBtnCart = document.getElementById('tab-btn-cart');
        const tabBtnOrders = document.getElementById('tab-btn-orders');
        const cartLayout = document.getElementById('cart-content-layout');
        const emptyState = document.getElementById('cart-empty-state');
        const successScreen = document.getElementById('order-success-screen');
        const ordersView = document.getElementById('customer-orders-view');

        if (mode === 'orders') {
            if (tabBtnCart) tabBtnCart.classList.remove('active');
            if (tabBtnOrders) tabBtnOrders.classList.add('active');

            if (cartLayout) cartLayout.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
            if (successScreen) successScreen.style.display = 'none';
            if (ordersView) ordersView.style.display = 'block';

            renderCustomerOrdersList();
        } else {
            if (tabBtnCart) tabBtnCart.classList.add('active');
            if (tabBtnOrders) tabBtnOrders.classList.remove('active');

            if (ordersView) ordersView.style.display = 'none';
            if (successScreen && successScreen.classList.contains('is-active')) {
                successScreen.style.display = 'block';
            } else {
                renderCartPage();
            }
        }
    }

    /**
     * Renders the complete cart state (empty or populated)
     */
    function renderCartPage() {
        if (currentCartMode === 'orders') return;

        const cart = getCart();
        const emptyState = document.getElementById('cart-empty-state');
        const contentLayout = document.getElementById('cart-content-layout');
        const itemsList = document.getElementById('cart-items-list');
        const itemCountBadge = document.getElementById('cart-item-count-badge');
        const ordersView = document.getElementById('customer-orders-view');

        if (ordersView) ordersView.style.display = 'none';
        if (!emptyState || !contentLayout || !itemsList) return;

        if (cart.length === 0) {
            emptyState.style.display = 'block';
            contentLayout.style.display = 'none';
            if (itemCountBadge) itemCountBadge.textContent = '0 items';
            return;
        }

        emptyState.style.display = 'none';
        contentLayout.style.display = 'grid';

        const totalItemsCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
        if (itemCountBadge) {
            itemCountBadge.textContent = `${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''}`;
        }

        // Render Cart Item Rows
        itemsList.innerHTML = cart.map(item => {
            const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            return `
                <div class="cart-item-row" data-id="${item.id}">
                    <img src="${item.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${item.title}" class="cart-item-img" />
                    <div class="cart-item-details">
                        <h3 class="cart-item-title">${item.title}</h3>
                        <span class="cart-item-price">Rs. ${Number(item.price).toLocaleString('en-PK')} each</span>
                    </div>
                    <div class="cart-qty-stepper">
                        <button type="button" class="qty-btn" onclick="MrymifyCart.updateQty('${item.id}', -1)" aria-label="Decrease quantity">−</button>
                        <span class="qty-number">${item.quantity}</span>
                        <button type="button" class="qty-btn" onclick="MrymifyCart.updateQty('${item.id}', 1)" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="cart-item-subtotal">
                        Rs. ${itemTotal.toLocaleString('en-PK')}
                    </div>
                    <button type="button" class="cart-item-remove-btn" onclick="MrymifyCart.removeItem('${item.id}')" title="Remove item" aria-label="Remove ${item.title}">
                        ✕
                    </button>
                </div>
            `;
        }).join('');

        // Calculate Totals & Shipping
        updateSummaryTotals(cart);
        updateCartBadgeAndCounts();
    }

    /**
     * Updates Order Summary totals and Free Shipping progress bar
     */
    function updateSummaryTotals(cart) {
        const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
        const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
        const shippingFee = isFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
        const grandTotal = subtotal + shippingFee;

        // Update elements
        const subtotalEl = document.getElementById('summary-subtotal');
        const shippingEl = document.getElementById('summary-shipping');
        const grandTotalEl = document.getElementById('summary-grand-total');
        const meterText = document.getElementById('shipping-meter-text');
        const meterFill = document.getElementById('shipping-progress-fill');

        if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString('en-PK')}`;
        if (shippingEl) {
            shippingEl.textContent = isFreeShipping ? 'FREE' : `Rs. ${shippingFee.toLocaleString('en-PK')}`;
            shippingEl.style.color = isFreeShipping ? '#1b8a43' : 'var(--color-text-main)';
        }
        if (grandTotalEl) grandTotalEl.textContent = `Rs. ${grandTotal.toLocaleString('en-PK')}`;

        if (meterText && meterFill) {
            if (isFreeShipping) {
                meterText.innerHTML = `🎉 <strong>Congratulations!</strong> You have unlocked <strong>FREE Nationwide Delivery</strong>!`;
                meterFill.style.width = '100%';
                meterFill.style.backgroundColor = '#2f483e';
            } else {
                const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
                const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
                meterText.innerHTML = `🚚 Add <strong>Rs. ${remaining.toLocaleString('en-PK')}</strong> more to unlock <strong>FREE Delivery</strong>!`;
                meterFill.style.width = `${percent}%`;
                meterFill.style.backgroundColor = 'var(--color-primary)';
            }
        }
    }

    /**
     * Updates item quantity
     */
    function updateQty(productId, delta) {
        const cart = getCart();
        const item = cart.find(i => i.id === productId);
        if (!item) return;

        item.quantity = (Number(item.quantity) || 1) + delta;

        if (item.quantity <= 0) {
            removeItem(productId);
            return;
        }

        saveCart(cart);
        renderCartPage();
    }

    /**
     * Removes an item from the cart
     */
    function removeItem(productId) {
        let cart = getCart();
        cart = cart.filter(i => i.id !== productId);
        saveCart(cart);
        renderCartPage();
    }

    /**
     * Clears all items from the cart
     */
    function clearCart() {
        if (!confirm('Are you sure you want to clear your shopping bag?')) return;
        saveCart([]);
        renderCartPage();
    }

    /**
     * Initializes checkout form events
     */
    function initCheckoutEvents() {
        const placeOrderBtn = document.getElementById('btn-place-order');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', handlePlaceOrder);
        }
    }

    /**
     * Handles order placement with rich product receipt & live progress stepper
     */
    function handlePlaceOrder() {
        const cart = getCart();
        if (cart.length === 0) {
            alert('Your shopping bag is currently empty.');
            return;
        }

        const nameInput = document.getElementById('checkout-name');
        const phoneInput = document.getElementById('checkout-phone');
        const cityInput = document.getElementById('checkout-city');
        const addressInput = document.getElementById('checkout-address');
        const notesInput = document.getElementById('checkout-notes');
        const placeOrderBtn = document.getElementById('btn-place-order');

        const name = (nameInput?.value || '').trim();
        const phone = (phoneInput?.value || '').trim();
        const city = (cityInput?.value || '').trim();
        const address = (addressInput?.value || '').trim();
        const notes = (notesInput?.value || '').trim();

        // Validation for delivery fields
        if (!name) {
            alert('Please enter your full name for the order.');
            nameInput?.focus();
            return;
        }
        if (!phone) {
            alert('Please enter your phone number for delivery confirmation.');
            phoneInput?.focus();
            return;
        }
        if (!city) {
            alert('Please enter your city for delivery.');
            cityInput?.focus();
            return;
        }
        if (!address) {
            alert('Please enter your complete delivery address.');
            addressInput?.focus();
            return;
        }

        // Payment method
        const paymentRadio = document.querySelector('input[name="payment-method"]:checked');
        const paymentMethod = paymentRadio ? paymentRadio.value : 'Cash on Delivery (COD)';

        const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
        const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
        const shippingFee = isFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
        const grandTotal = subtotal + shippingFee;

        // Generate unique order ID and date
        const orderId = 'MRY-' + Math.floor(10000 + Math.random() * 90000);
        const orderDate = new Date().toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Disable button during processing
        if (placeOrderBtn) {
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<span>⏳ Processing Order...</span>';
        }

        // 1. Build Itemized Text for Admin Notification
        const itemsSummary = cart.map((item, idx) => {
            const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            return `${idx + 1}. ${item.title} x${item.quantity} (Rs. ${itemTotal.toLocaleString('en-PK')})`;
        }).join('\n');

        const adminMessage = `🔔 *NEW ORDER RECEIVED (${orderId})*\n\n` +
                             `👤 *Customer:* ${name}\n` +
                             `📞 *Phone:* ${phone}\n` +
                             `📍 *City:* ${city}\n` +
                             `🏠 *Address:* ${address}\n` +
                             `💳 *Payment:* ${paymentMethod}\n` +
                             (notes ? `📝 *Notes:* ${notes}\n` : '') +
                             `\n🛍️ *Items:*\n${itemsSummary}\n\n` +
                             `💰 *Subtotal:* Rs. ${subtotal.toLocaleString('en-PK')}\n` +
                             `🚚 *Delivery:* ${isFreeShipping ? 'FREE' : 'Rs. ' + shippingFee}\n` +
                             `✨ *Total Amount:* Rs. ${grandTotal.toLocaleString('en-PK')}\n` +
                             `📅 *Date:* ${orderDate}`;

        // 2. Save Order Record to Local Database
        const newOrder = {
            orderId: orderId,
            date: orderDate,
            status: 'pending',
            customer: { name, phone, city, address, notes, paymentMethod },
            items: JSON.parse(JSON.stringify(cart)),
            subtotal: subtotal,
            shipping: shippingFee,
            grandTotal: grandTotal
        };

        try {
            const pastOrders = JSON.parse(localStorage.getItem('mrymify_orders') || '[]');
            pastOrders.unshift(newOrder);
            localStorage.setItem('mrymify_orders', JSON.stringify(pastOrders));
            localStorage.setItem('mrymify_latest_order_id', orderId);
        } catch (e) {
            console.warn('Could not cache order history', e);
        }

        // 3. Background Silent Notification Dispatch
        try {
            const gatewayUrl = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(adminMessage)}&apikey=YOUR_APIKEY`;
            fetch(gatewayUrl, { mode: 'no-cors' }).catch(() => {});
        } catch (err) {}

        // 4. Populate & Reveal Order Confirmation Screen to Customer
        setTimeout(function () {
            // Clear cart
            saveCart([]);

            // Hide cart layout & mode tabs
            const contentLayout = document.getElementById('cart-content-layout');
            const emptyState = document.getElementById('cart-empty-state');
            const successScreen = document.getElementById('order-success-screen');

            if (contentLayout) contentLayout.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';

            // Populate Success Screen Details
            const orderIdEl = document.getElementById('success-order-id');
            const customerNameEl = document.getElementById('success-customer-name');
            const orderDateEl = document.getElementById('success-order-date');
            const itemsListEl = document.getElementById('success-items-list');
            const totalAmountEl = document.getElementById('success-total-amount');
            const deliveryAddressEl = document.getElementById('success-delivery-address');
            const paymentMethodEl = document.getElementById('success-payment-method');

            if (orderIdEl) orderIdEl.textContent = `Order #${orderId}`;
            if (customerNameEl) customerNameEl.textContent = name;
            if (orderDateEl) orderDateEl.textContent = orderDate;
            if (totalAmountEl) totalAmountEl.textContent = `Rs. ${grandTotal.toLocaleString('en-PK')}`;
            if (deliveryAddressEl) deliveryAddressEl.textContent = `${address}, ${city}`;
            if (paymentMethodEl) paymentMethodEl.textContent = paymentMethod;

            // Render rich product cards in the placed order receipt
            if (itemsListEl) {
                itemsListEl.innerHTML = newOrder.items.map(item => {
                    const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                    return `
                        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border-light);">
                            <img src="${item.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${item.title}" style="width: 54px; height: 54px; border-radius: 10px; object-fit: cover; border: 1px solid var(--color-border-light); flex-shrink: 0;" />
                            <div style="flex: 1; min-width: 0; text-align: left;">
                                <div style="font-weight: 600; color: var(--color-text-main); font-size: 0.95rem;">${item.title}</div>
                                <div style="font-size: 0.82rem; color: var(--color-text-muted);">Rs. ${Number(item.price).toLocaleString('en-PK')} × ${item.quantity}</div>
                            </div>
                            <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
                                Rs. ${itemTotal.toLocaleString('en-PK')}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Render live progress stepper inside success screen
            const successStepperBox = document.getElementById('success-order-stepper-box');
            if (successStepperBox) {
                successStepperBox.innerHTML = renderProgressStepperHtml(newOrder);
            }

            if (successScreen) {
                successScreen.classList.add('is-active');
                successScreen.style.display = 'block';
                successScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            updateCartBadgeAndCounts();
        }, 500);
    }

    /* ==========================================================================
       Customer "View Your Orders" System & Real-Time Sync
       ========================================================================== */

    function initOrderTracking() {
        const urlParams = new URLSearchParams(window.location.search);
        const trackParam = urlParams.get('track') || urlParams.get('orderId');
        const latestSavedId = localStorage.getItem('mrymify_latest_order_id');

        activeTrackingOrderId = trackParam || latestSavedId || null;

        // Real-time synchronization: When Admin updates status in another tab
        window.addEventListener('storage', function (e) {
            if (e.key === 'mrymify_orders') {
                if (currentCartMode === 'orders') {
                    renderCustomerOrdersList();
                }
                updateLiveSuccessScreen();
                updateCartBadgeAndCounts();
            }
        });

        // Fast background poll to ensure real-time synchronization
        setInterval(function () {
            if (currentCartMode === 'orders') {
                renderCustomerOrdersList();
            }
            updateLiveSuccessScreen();
        }, 2500);
    }

    function getSavedOrders() {
        try {
            return JSON.parse(localStorage.getItem('mrymify_orders') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Renders all customer orders in the dedicated "View Your Orders" tab
     */
    function renderCustomerOrdersList() {
        const container = document.getElementById('customer-orders-list-container');
        if (!container) return;

        const orders = getSavedOrders();

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="cart-empty-state" style="margin: 1rem auto;">
                    <span class="empty-icon">📦</span>
                    <h3 class="empty-title">No Orders Placed Yet</h3>
                    <p class="empty-desc">
                        Once you book a handcrafted crochet treasure, you can view its rich item details and live crafting progress right here!
                    </p>
                    <a href="categories.html" class="btn btn-primary btn-md">
                        <span>Browse Collections &rarr;</span>
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => {
            const itemsHtml = (order.items || []).map(item => {
                const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                return `
                    <div class="customer-order-item-row">
                        <img src="${item.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${item.title}" class="customer-order-item-thumb" />
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--color-text-main);">${item.title}</div>
                            <div style="font-size: 0.82rem; color: var(--color-text-muted);">
                                Rs. ${Number(item.price).toLocaleString('en-PK')} × ${item.quantity}
                            </div>
                        </div>
                        <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
                            Rs. ${itemTotal.toLocaleString('en-PK')}
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="customer-order-card">
                    <!-- Order Header -->
                    <div class="customer-order-header">
                        <div>
                            <span class="order-id-badge" style="margin-bottom: 0.25rem;">Order #${order.orderId}</span>
                            <div style="font-size: 0.82rem; color: var(--color-text-muted);">Placed on: ${order.date}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary);">
                                Rs. ${(Number(order.grandTotal) || 0).toLocaleString('en-PK')}
                            </div>
                            <div style="font-size: 0.8rem; color: var(--color-text-muted);">${order.customer?.paymentMethod || 'COD'}</div>
                        </div>
                    </div>

                    <!-- Live Progress Stepper -->
                    ${renderProgressStepperHtml(order)}

                    <!-- Ordered Products List -->
                    <div style="margin-top: 1.5rem;">
                        <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); margin-bottom: 0.6rem;">
                            Ordered Products (${order.items?.length || 0} item${(order.items?.length || 0) !== 1 ? 's' : ''})
                        </div>
                        <div class="customer-order-items-grid">
                            ${itemsHtml}
                        </div>
                    </div>

                    <!-- Delivery & Support Footer -->
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border-light); font-size: 0.85rem;">
                        <div>
                            <strong>Delivery to:</strong> ${escapeHtml(order.customer?.name || 'Customer')} (${escapeHtml(order.customer?.city || '')})
                        </div>
                        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Mariyam! I have a question regarding my Mrymify order #${order.orderId}.`)}" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); font-weight: 600; text-decoration: underline;">
                            Need help with this order? Chat on WhatsApp 💬
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Updates success screen stepper if order status was changed
     */
    function updateLiveSuccessScreen() {
        const successScreen = document.getElementById('order-success-screen');
        if (!successScreen || successScreen.style.display === 'none') return;

        const latestSavedId = localStorage.getItem('mrymify_latest_order_id');
        if (!latestSavedId) return;

        const orders = getSavedOrders();
        const order = orders.find(o => o.orderId === latestSavedId);
        if (!order) return;

        const successStepperBox = document.getElementById('success-order-stepper-box');
        if (successStepperBox) {
            successStepperBox.innerHTML = renderProgressStepperHtml(order);
        }
    }

    /**
     * Generates responsive HTML for the 5-step handcrafted progress stepper (no individual co-founder names)
     */
    function renderProgressStepperHtml(order) {
        const status = order.status || 'pending';

        // Step mapping:
        // 1: Pending (Order Placed)
        // 2: Crafting (Handcrafting in Progress)
        // 3: Ready (Packaged in Boutique Box)
        // 4: Dispatched (In Transit)
        // 5: Delivered (Received)

        let activeStepIndex = 1;
        let fillPercent = 10;
        let statusBadge = 'Pending Review';
        let statusIcon = '⏳';
        let statusMsg = 'Your order is confirmed! Our artisan studio has received your piece details.';
        let statusSub = 'Estimated crafting schedule is being assigned in our Gujranwala studio.';

        if (status === 'crafting') {
            activeStepIndex = 2;
            fillPercent = 35;
            statusBadge = '🧶 In Progress (Crafting)';
            statusIcon = '🧶';
            statusMsg = 'Your piece is currently being handcrafted stitch-by-stitch with soft hypoallergenic yarn!';
            statusSub = 'Every loop, petal, and detail is being shaped with patient artisan care in our studio.';
        } else if (status === 'ready') {
            activeStepIndex = 3;
            fillPercent = 60;
            statusBadge = '✨ Ready for Packaging';
            statusIcon = '✨';
            statusMsg = 'Crafting complete! Your items passed quality checks and are wrapped in our signature boutique box.';
            statusSub = 'Prepped with ribbons, tags, and protective padding ready for courier dispatch.';
        } else if (status === 'dispatched') {
            activeStepIndex = 4;
            fillPercent = 85;
            statusBadge = '🚚 Dispatched / In Transit';
            statusIcon = '🚚';
            statusMsg = `Your parcel is on its way to ${order.customer?.city || 'your address'}!`;
            statusSub = 'Handed over to our trusted courier partner for nationwide doorstep delivery.';
        } else if (status === 'delivered') {
            activeStepIndex = 5;
            fillPercent = 100;
            statusBadge = '✅ Delivered Successfully';
            statusIcon = '🌸';
            statusMsg = 'Your handcrafted creation has arrived! We hope it brings pure joy to your day.';
            statusSub = 'Thank you for supporting small handmade artisan businesses. Tag us on Instagram @mrymify!';
        } else if (status === 'cancelled') {
            return `
                <div class="tracking-live-status-box" style="border-color: #fecaca; background: #fef2f2;">
                    <span class="tracking-status-icon">❌</span>
                    <div class="tracking-status-info">
                        <span class="tracking-status-badge" style="background: #fee2e2; color: #b91c1c;">Order Cancelled</span>
                        <h4 class="tracking-status-msg">Order #${order.orderId} was cancelled</h4>
                        <p class="tracking-status-sub">If you have any questions or would like to re-order, chat directly with Mariyam on WhatsApp.</p>
                    </div>
                </div>
            `;
        }

        const steps = [
            { num: 1, icon: '📝', title: 'Order Placed', sub: 'Received' },
            { num: 2, icon: '🧶', title: 'Handcrafting', sub: 'In Progress' },
            { num: 3, icon: '✨', title: 'Ready & Packed', sub: 'Signature Box' },
            { num: 4, icon: '🚚', title: 'Dispatched', sub: 'In Transit' },
            { num: 5, icon: '🌸', title: 'Delivered', sub: 'Safe Arrival' }
        ];

        const stepsHtml = steps.map(s => {
            let stateClass = '';
            if (s.num < activeStepIndex) stateClass = 'completed';
            else if (s.num === activeStepIndex) stateClass = 'active';

            return `
                <div class="stepper-step ${stateClass}">
                    <div class="step-node">${s.num < activeStepIndex ? '✓' : s.icon}</div>
                    <div class="step-title">${s.title}</div>
                    <div class="step-sub">${s.sub}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="order-stepper-wrap">
                <div class="order-stepper-track">
                    <div class="order-stepper-progress-fill" style="width: ${fillPercent}%;"></div>
                    ${stepsHtml}
                </div>
            </div>

            <div class="tracking-live-status-box">
                <span class="tracking-status-icon">${statusIcon}</span>
                <div class="tracking-status-info">
                    <span class="tracking-status-badge" style="background: var(--color-primary-light); color: var(--color-primary);">${statusBadge}</span>
                    <h4 class="tracking-status-msg">${statusMsg}</h4>
                    <p class="tracking-status-sub">${statusSub}</p>
                </div>
                <div style="text-align: right; font-size: 0.82rem; color: var(--color-text-muted); white-space: nowrap;">
                    <div><strong>Order:</strong> ${order.orderId}</div>
                    <div>${order.date}</div>
                </div>
            </div>
        `;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Expose component API
    window.MrymifyCart = {
        getCart: getCart,
        updateQty: updateQty,
        removeItem: removeItem,
        clearCart: clearCart,
        handlePlaceOrder: handlePlaceOrder,
        switchCartMode: switchCartMode,
        renderCustomerOrdersList: renderCustomerOrdersList,
        updateCartBadgeAndCounts: updateCartBadgeAndCounts
    };
})();
