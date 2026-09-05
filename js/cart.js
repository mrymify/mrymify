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
    let activePaymentProofBase64 = null;
    let activePaymentProofName = '';

    document.addEventListener('DOMContentLoaded', function () {
        renderCartPage();
        initCheckoutEvents();
        initReferralEvents();
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
     * Opens full product details modal or navigates to product details page
     */
    function showProductDetails(productId) {
        if (!productId) return;
        if (window.MrymifyProducts && typeof window.MrymifyProducts.openProductModal === 'function') {
            const product = window.MrymifyProducts.getById(productId);
            if (product) {
                window.MrymifyProducts.openProductModal(productId);
                return;
            }
        }
        window.location.href = `product-details.html?id=${encodeURIComponent(productId)}`;
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

        // Render Cart Item Rows (Upfront compact card, clicking product shows full details)
        itemsList.innerHTML = cart.map(item => {
            const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            return `
                <div class="cart-compact-card cart-item-row" data-id="${item.id}">
                    <div class="cart-card-thumb-wrap" onclick="MrymifyCart.showProductDetails('${item.id}')" title="Click to view full piece details">
                        <img src="${item.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${escapeHtml(item.title)}" class="cart-card-thumb" />
                    </div>
                    <div class="cart-card-body">
                        <div class="cart-expanded-header">
                            <h4 class="cart-expanded-title" onclick="MrymifyCart.showProductDetails('${item.id}')" title="Click to view full piece details" style="cursor: pointer;">
                                ${escapeHtml(item.title)}
                                <span class="cart-details-pill" title="Click to view full product details">👁️ Details</span>
                            </h4>
                            <span class="cart-expanded-unit">Rs. ${Number(item.price).toLocaleString('en-PK')} each</span>
                        </div>
                        <div class="cart-card-controls">
                            <div class="cart-qty-stepper">
                                <button type="button" class="qty-btn" onclick="MrymifyCart.updateQty('${item.id}', -1)" aria-label="Decrease quantity">−</button>
                                <span class="qty-number">${item.quantity}</span>
                                <button type="button" class="qty-btn" onclick="MrymifyCart.updateQty('${item.id}', 1)" aria-label="Increase quantity">+</button>
                            </div>
                            <div class="cart-card-subtotal-wrap">
                                <span class="cart-card-subtotal-label">Subtotal:</span>
                                <span class="cart-card-subtotal-val">Rs. ${itemTotal.toLocaleString('en-PK')}</span>
                            </div>
                            <button type="button" class="cart-card-remove-action" onclick="MrymifyCart.removeItem('${item.id}')" title="Remove ${escapeHtml(item.title)}">
                                🗑️ Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Calculate Totals & Shipping
        updateSummaryTotals(cart);
        updateCartBadgeAndCounts();
    }

    /* ==========================================================================
       Referral & Discount Engine
       ========================================================================== */
    let activeReferral = null;

    function getRegisteredReferrals() {
        try {
            const stored = JSON.parse(localStorage.getItem('mrymify_referral_codes') || '{}');
            const defaults = {
                'MARIYAM10': { type: 'percent', value: 10, active: true },
                'FRIEND15': { type: 'percent', value: 15, active: true },
                'STUDIO200': { type: 'fixed', value: 200, active: true }
            };
            return Object.assign(defaults, stored);
        } catch (e) {
            return {
                'MARIYAM10': { type: 'percent', value: 10, active: true }
            };
        }
    }

    function initReferralEvents() {
        const applyBtn = document.getElementById('btn-apply-referral');
        const input = document.getElementById('cart-referral-code');
        if (applyBtn && input) {
            applyBtn.addEventListener('click', applyReferralCode);
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyReferralCode();
                }
            });
        }
    }

    function applyReferralCode() {
        const input = document.getElementById('cart-referral-code');
        const feedback = document.getElementById('referral-feedback');
        if (!input || !feedback) return;

        const code = (input.value || '').trim().toUpperCase();
        if (!code) {
            feedback.style.display = 'block';
            feedback.style.color = '#ef4444';
            feedback.textContent = 'Please enter a referral or promo code.';
            return;
        }

        const registry = getRegisteredReferrals();
        const ref = registry[code];

        if (ref && ref.active !== false) {
            activeReferral = { code: code, type: ref.type, value: ref.value };
            feedback.style.display = 'block';
            feedback.style.color = '#10b981';
            const desc = ref.type === 'percent' ? `${ref.value}% OFF` : `Rs. ${ref.value} OFF`;
            feedback.innerHTML = `✓ Code <strong>${code}</strong> applied! You saved <strong>${desc}</strong>!`;
            updateSummaryTotals(getCart());
        } else {
            feedback.style.display = 'block';
            feedback.style.color = '#ef4444';
            feedback.textContent = 'Invalid or expired referral code. Please check and try again.';
            activeReferral = null;
            updateSummaryTotals(getCart());
        }
    }

    /**
     * Updates Order Summary totals and Free Shipping progress bar
     */
    function updateSummaryTotals(cart) {
        const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
        
        // Calculate Discount
        let discountAmount = 0;
        if (activeReferral && subtotal > 0) {
            if (activeReferral.type === 'percent') {
                discountAmount = Math.round(subtotal * (activeReferral.value / 100));
            } else {
                discountAmount = Math.min(subtotal, activeReferral.value);
            }
        }

        // Storewide discounts check from ADP
        try {
            const storeDiscounts = JSON.parse(localStorage.getItem('mrymify_store_discounts') || '{}');
            if (storeDiscounts.storewide && storeDiscounts.storewide.active && storeDiscounts.storewide.value > 0) {
                const storeVal = Number(storeDiscounts.storewide.value);
                const storeDisc = storeDiscounts.storewide.type === 'percent' ? Math.round(subtotal * (storeVal / 100)) : storeVal;
                discountAmount = Math.max(discountAmount, storeDisc);
            }
        } catch (e) {}

        let currentThreshold = FREE_SHIPPING_THRESHOLD;
        let currentShippingFee = STANDARD_SHIPPING_FEE;
        try {
            const rawConfig = localStorage.getItem('mrymify_branding_config');
            if (rawConfig) {
                const cfg = JSON.parse(rawConfig);
                if (cfg.freeShippingThreshold && Number(cfg.freeShippingThreshold) > 0) {
                    currentThreshold = Number(cfg.freeShippingThreshold);
                }
                if (cfg.shippingFee !== undefined && cfg.shippingFee !== '') {
                    currentShippingFee = Number(cfg.shippingFee);
                }
            }
        } catch (e) {}

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const isFreeShipping = discountedSubtotal >= currentThreshold;
        const shippingFee = (discountedSubtotal === 0 || isFreeShipping) ? 0 : currentShippingFee;
        const grandTotal = discountedSubtotal + shippingFee;

        // Update elements
        const subtotalEl = document.getElementById('summary-subtotal');
        const discountRowEl = document.getElementById('summary-discount-row');
        const discountEl = document.getElementById('summary-discount');
        const shippingEl = document.getElementById('summary-shipping');
        const grandTotalEl = document.getElementById('summary-grand-total');
        const meterText = document.getElementById('shipping-meter-text');
        const meterFill = document.getElementById('shipping-progress-fill');

        if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString('en-PK')}`;
        
        if (discountRowEl && discountEl) {
            if (discountAmount > 0) {
                discountRowEl.style.display = 'flex';
                discountEl.textContent = `- Rs. ${discountAmount.toLocaleString('en-PK')}`;
            } else {
                discountRowEl.style.display = 'none';
            }
        }

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
                const remaining = currentThreshold - discountedSubtotal;
                const percent = Math.min(100, Math.round((discountedSubtotal / currentThreshold) * 100));
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
     * Initializes checkout form events & pre-fills saved profile
     */
    function initCheckoutEvents() {
        prefillCustomerProfile();
        onPaymentMethodChange();
        const placeOrderBtn = document.getElementById('btn-place-order');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', handlePlaceOrder);
        }
    }

    /**
     * Pakistan Payment Method Change Handler
     */
    function onPaymentMethodChange() {
        const select = document.getElementById('checkout-payment-method');
        const instructionsEl = document.getElementById('checkout-payment-instructions');
        const proofWrap = document.getElementById('checkout-payment-proof-wrap');
        if (!select || !instructionsEl) return;

        const val = select.value;
        if (val === 'Cash on Delivery (COD)') {
            instructionsEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #10b981; font-weight: 700;">
                    <span>📦 Standard Cash on Delivery (COD)</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.35rem;">
                    Pay the exact order amount in cash to our courier partner at your doorstep upon delivery.
                </div>
            `;
            if (proofWrap) proofWrap.style.display = 'none';
        } else if (val.includes('Meezan') || val.includes('Bank Transfer')) {
            instructionsEl.innerHTML = `
                <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.25rem;">🏦 Bank Transfer / Raast (Meezan Bank)</div>
                <div><strong>Account Title:</strong> Mariyam Tariq</div>
                <div><strong>Account Number:</strong> 02890108920194</div>
                <div><strong>IBAN:</strong> PK89MEZN0002890108920194</div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.35rem;">Transfer via your banking app or Raast, then attach the confirmation screenshot below.</div>
            `;
            if (proofWrap) proofWrap.style.display = 'block';
        } else if (val.includes('Alfalah')) {
            instructionsEl.innerHTML = `
                <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.25rem;">🏦 Bank Alfalah Transfer</div>
                <div><strong>Account Title:</strong> Mariyam Tariq</div>
                <div><strong>Account Number:</strong> 0289-1002893821</div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.35rem;">Transfer via Alfalah Alfa app or online banking, then attach the receipt screenshot below.</div>
            `;
            if (proofWrap) proofWrap.style.display = 'block';
        } else if (val.includes('JazzCash')) {
            instructionsEl.innerHTML = `
                <div style="font-weight: 700; color: #ec4899; margin-bottom: 0.25rem;">📱 JazzCash Wallet Transfer</div>
                <div><strong>Account Number:</strong> 0300-0896885</div>
                <div><strong>Account Title:</strong> Mariyam Tariq</div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.35rem;">Send payment via JazzCash app/USSD and upload confirmation screenshot below.</div>
            `;
            if (proofWrap) proofWrap.style.display = 'block';
        } else if (val.includes('EasyPaisa')) {
            instructionsEl.innerHTML = `
                <div style="font-weight: 700; color: #10b981; margin-bottom: 0.25rem;">📱 EasyPaisa Wallet Transfer</div>
                <div><strong>Account Number:</strong> 0300-0896885</div>
                <div><strong>Account Title:</strong> Mariyam Tariq</div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.35rem;">Send payment via EasyPaisa app/USSD and upload confirmation screenshot below.</div>
            `;
            if (proofWrap) proofWrap.style.display = 'block';
        } else if (val.includes('SadaPay')) {
            instructionsEl.innerHTML = `
                <div style="font-weight: 700; color: #f97316; margin-bottom: 0.25rem;">💳 SadaPay Transfer</div>
                <div><strong>SadaPay Number:</strong> 0300-0896885</div>
                <div><strong>Account Title:</strong> Mariyam Tariq</div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.35rem;">Send money via SadaPay and upload the transfer receipt below.</div>
            `;
            if (proofWrap) proofWrap.style.display = 'block';
        } else if (val.includes('NayaPay')) {
            instructionsEl.innerHTML = `
                <div style="font-weight: 700; color: #06b6d4; margin-bottom: 0.25rem;">💳 NayaPay Transfer</div>
                <div><strong>NayaPay ID / Mobile:</strong> 0300-0896885</div>
                <div><strong>Account Title:</strong> Mariyam Tariq</div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.35rem;">Send payment via NayaPay and upload the transaction screenshot below.</div>
            `;
            if (proofWrap) proofWrap.style.display = 'block';
        }
    }

    /**
     * Handles Payment Proof Screenshot Upload
     */
    function handleProofFileSelect(input) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (PNG, JPG, WebP) of your transfer receipt.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            activePaymentProofBase64 = e.target.result;
            activePaymentProofName = file.name;

            const previewEl = document.getElementById('payment-proof-preview');
            const imgEl = document.getElementById('payment-proof-img');
            const nameEl = document.getElementById('payment-proof-name');
            if (imgEl) imgEl.src = activePaymentProofBase64;
            if (nameEl) nameEl.textContent = file.name;
            if (previewEl) previewEl.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    /**
     * Clears Selected Payment Proof
     */
    function clearPaymentProof() {
        activePaymentProofBase64 = null;
        activePaymentProofName = '';
        const input = document.getElementById('checkout-payment-proof');
        if (input) input.value = '';
        const previewEl = document.getElementById('payment-proof-preview');
        if (previewEl) previewEl.style.display = 'none';
    }

    function prefillCustomerProfile() {
        try {
            const raw = localStorage.getItem('mrymify_user_profile');
            if (!raw) return;
            const profile = JSON.parse(raw);
            const nameInput = document.getElementById('checkout-name');
            const phoneInput = document.getElementById('checkout-phone');
            const cityInput = document.getElementById('checkout-city');
            const addressInput = document.getElementById('checkout-address');

            if (nameInput && !nameInput.value && profile.name) nameInput.value = profile.name;
            if (phoneInput && !phoneInput.value && profile.phone) phoneInput.value = profile.phone;
            if (cityInput && !cityInput.value && profile.city) cityInput.value = profile.city;
            if (addressInput && !addressInput.value && profile.address) addressInput.value = profile.address;
        } catch (e) {}
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

        // Save/Update User Profile for future automatic prefill
        try {
            const userProfile = { name, phone, city, address, lastUpdated: new Date().toISOString() };
            localStorage.setItem('mrymify_user_profile', JSON.stringify(userProfile));
        } catch (e) {}

        // Payment method from dropdown
        const paymentSelect = document.getElementById('checkout-payment-method');
        const paymentMethod = paymentSelect ? paymentSelect.value : 'Bank Transfer (Meezan Bank)';

        const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
        
        let discountAmount = 0;
        if (activeReferral && subtotal > 0) {
            if (activeReferral.type === 'percent') {
                discountAmount = Math.round(subtotal * (activeReferral.value / 100));
            } else {
                discountAmount = Math.min(subtotal, activeReferral.value);
            }
        }
        try {
            const storeDiscounts = JSON.parse(localStorage.getItem('mrymify_store_discounts') || '{}');
            if (storeDiscounts.storewide && storeDiscounts.storewide.active && storeDiscounts.storewide.value > 0) {
                const storeVal = Number(storeDiscounts.storewide.value);
                const storeDisc = storeDiscounts.storewide.type === 'percent' ? Math.round(subtotal * (storeVal / 100)) : storeVal;
                discountAmount = Math.max(discountAmount, storeDisc);
            }
        } catch (e) {}

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const isFreeShipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD;
        const shippingFee = (discountedSubtotal === 0 || isFreeShipping) ? 0 : STANDARD_SHIPPING_FEE;
        const grandTotal = discountedSubtotal + shippingFee;

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
                             (activeReferral ? `🎟️ *Referral Code:* ${activeReferral.code} (- Rs. ${discountAmount})\n` : '') +
                             (notes ? `📝 *Notes:* ${notes}\n` : '') +
                             `\n🛍️ *Items:*\n${itemsSummary}\n\n` +
                             `💰 *Subtotal:* Rs. ${subtotal.toLocaleString('en-PK')}\n` +
                             (discountAmount > 0 ? `🎟️ *Discount:* - Rs. ${discountAmount.toLocaleString('en-PK')}\n` : '') +
                             `🚚 *Delivery:* ${isFreeShipping ? 'FREE' : 'Rs. ' + shippingFee}\n` +
                             `✨ *Total Amount:* Rs. ${grandTotal.toLocaleString('en-PK')}\n` +
                             `📅 *Date:* ${orderDate}`;

        // 2. Save Order Record to Local Database
        const newOrder = {
            orderId: orderId,
            date: orderDate,
            status: 'pending',
            paymentVerified: false,
            paymentMethod: paymentMethod,
            paymentProof: activePaymentProofBase64 || null,
            paymentProofName: activePaymentProofName || null,
            customer: { name, phone, city, address, notes, paymentMethod },
            items: JSON.parse(JSON.stringify(cart)),
            subtotal: subtotal,
            discount: discountAmount,
            referralCode: activeReferral ? activeReferral.code : null,
            shipping: shippingFee,
            grandTotal: grandTotal
        };

        try {
            const pastOrders = JSON.parse(localStorage.getItem('mrymify_orders') || '[]');
            pastOrders.unshift(newOrder);
            localStorage.setItem('mrymify_orders', JSON.stringify(pastOrders));
            localStorage.setItem('mrymify_latest_order_id', orderId);

            // Update referral stats
            if (activeReferral) {
                const stats = JSON.parse(localStorage.getItem('mrymify_referral_stats') || '{}');
                if (!stats[activeReferral.code]) stats[activeReferral.code] = { uses: 0, revenue: 0 };
                stats[activeReferral.code].uses += 1;
                stats[activeReferral.code].revenue += grandTotal;
                localStorage.setItem('mrymify_referral_stats', JSON.stringify(stats));
            }

            // Track Order in Analytics
            if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackOrderPlaced === 'function') {
                window.MrymifyAnalytics.trackOrderPlaced(city, orderId, grandTotal);
            }
            if (city && window.MrymifyAnalytics && typeof window.MrymifyAnalytics.updateUserCity === 'function') {
                window.MrymifyAnalytics.updateUserCity(city);
            }
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
     * Renders Customer Handcrafted Orders List
     * Shows customer name, order metadata & visual progress stepper upfront
     * Clicking the card opens the full Order Card Modal (card-opening visual)
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
            return `
                <div class="customer-order-card" data-order-id="${order.orderId}" onclick="MrymifyCart.openCustomerOrderDetail('${order.orderId}')" title="Click to open full order card">
                    <!-- Order Header (Upfront) -->
                    <div class="customer-order-header">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                <span class="order-id-badge">Order #${order.orderId}</span>
                                <span style="font-weight: 700; font-size: 0.96rem; color: var(--color-text-main);">👤 ${escapeHtml(order.customer?.name || 'Customer')}</span>
                            </div>
                            <div style="font-size: 0.82rem; color: var(--color-text-muted); margin-top: 0.25rem;">
                                Placed on: ${order.date} • ${order.items?.length || 0} item${(order.items?.length || 0) !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary);">
                                Rs. ${(Number(order.grandTotal) || 0).toLocaleString('en-PK')}
                            </div>
                            <div style="font-size: 0.8rem; color: var(--color-text-muted);">${order.customer?.paymentMethod || 'COD'}</div>
                            ${order.paymentVerified 
                                ? '<div style="font-size: 0.74rem; color: #10b981; font-weight: 700; margin-top: 2px;">✓ Payment Verified</div>' 
                                : (order.status === 'cancelled' 
                                    ? '<div style="font-size: 0.74rem; color: #ef4444; font-weight: 700; margin-top: 2px;">❌ Cancelled</div>' 
                                    : '<div style="font-size: 0.74rem; color: #f59e0b; font-weight: 700; margin-top: 2px;">⏳ Verification Pending</div>')}
                        </div>
                    </div>

                    <!-- Live Progress Stepper (Visual Track Upfront - Status Message Box Hidden Here) -->
                    ${renderProgressStepperHtml(order, false)}

                    <!-- Order Card Footer Bar (Click to Open Card Trigger) -->
                    <div class="customer-order-footer-bar">
                        <div style="color: var(--color-text-muted); font-size: 0.82rem;">
                            📍 Delivery to: <strong>${escapeHtml(order.customer?.city || 'Pakistan')}</strong>
                            ${order.paymentProof ? '<span style="color: #10b981; font-weight: 600; margin-left: 6px;">• 📸 Proof Attached</span>' : ''}
                        </div>
                        <span class="btn-open-order-card">
                            Open Order Card ↗
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Opens full customer order card modal (Card-Opening Visual)
     */
    function openCustomerOrderDetail(orderId) {
        const orders = getSavedOrders();
        const order = orders.find(o => o.orderId === orderId);
        if (!order) return;

        const modal = document.getElementById('customer-order-detail-modal');
        const titleEl = document.getElementById('customer-modal-order-title');
        const subEl = document.getElementById('customer-modal-order-sub');
        const bodyEl = document.getElementById('customer-modal-order-body');
        const footerEl = document.getElementById('customer-modal-order-footer');
        if (!modal || !bodyEl) return;

        if (titleEl) titleEl.textContent = `Order #${order.orderId}`;
        if (subEl) {
            subEl.innerHTML = `
                👤 ${escapeHtml(order.customer?.name || 'Customer')} • Placed on ${order.date} • Total: <strong>Rs. ${(Number(order.grandTotal) || 0).toLocaleString('en-PK')}</strong>
                ${order.paymentVerified 
                    ? '<span style="color: #10b981; font-weight: 700; margin-left: 6px;">(✓ Payment Verified)</span>' 
                    : (order.status === 'cancelled' ? '<span style="color: #ef4444; font-weight: 700; margin-left: 6px;">(❌ Cancelled)</span>' : '<span style="color: #f59e0b; font-weight: 700; margin-left: 6px;">(⏳ Verification Pending)</span>')}
            `;
        }

        const itemsHtml = (order.items || []).map(item => {
            const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            return `
                <div class="customer-order-item-row" onclick="MrymifyCart.showProductDetails('${item.id}')" style="cursor: pointer;" title="Click to view piece details">
                    <img src="${item.image || 'images/products/01_Royal_Crown_Froggy.png'}" alt="${escapeHtml(item.title)}" class="customer-order-item-thumb" />
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.95rem; color: var(--color-text-main);">
                            ${escapeHtml(item.title)}
                            <span style="font-size: 0.72rem; color: var(--color-primary); font-weight: 600; margin-left: 4px;">👁️ Details</span>
                        </div>
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

        bodyEl.innerHTML = `
            <!-- Live Progress Stepper WITH Status Message ("Your order is confirmed...") inside card modal -->
            ${renderProgressStepperHtml(order, true)}

            <!-- Ordered Pieces Breakdown -->
            <div style="margin: 1.5rem 0 1.25rem;">
                <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); margin-bottom: 0.55rem;">
                    Ordered Creations (${order.items?.length || 0} item${(order.items?.length || 0) !== 1 ? 's' : ''})
                </div>
                <div class="customer-order-items-grid">
                    ${itemsHtml}
                </div>
            </div>

            <!-- Delivery & Contact Information -->
            <div style="background: var(--color-bg); border-radius: var(--radius-md); padding: 1rem 1.15rem; border: 1px solid var(--color-border-light); margin-bottom: 1.25rem; font-size: 0.88rem;">
                <div style="font-weight: 700; color: var(--color-text-main); margin-bottom: 0.65rem;">
                    📦 Delivery & Contact Details
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.65rem;">
                    <div>
                        <span style="color: var(--color-text-muted); font-size: 0.8rem;">Recipient Name:</span><br>
                        <strong>${escapeHtml(order.customer?.name || 'Customer')}</strong>
                    </div>
                    <div>
                        <span style="color: var(--color-text-muted); font-size: 0.8rem;">Phone Number:</span><br>
                        <strong>${escapeHtml(order.customer?.phone || 'Not provided')}</strong>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <span style="color: var(--color-text-muted); font-size: 0.8rem;">Delivery Address:</span><br>
                        <strong>${escapeHtml(order.customer?.address || '')}, ${escapeHtml(order.customer?.city || '')}</strong>
                    </div>
                </div>
            </div>

            <!-- Payment Method & Attached Proof -->
            <div style="background: var(--color-bg); border-radius: var(--radius-md); padding: 1rem 1.15rem; border: 1px solid var(--color-border-light); font-size: 0.88rem;">
                <div style="font-weight: 700; color: var(--color-text-main); margin-bottom: 0.65rem;">
                    💳 Payment Verification & Proof
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <div style="color: var(--color-text-muted); font-size: 0.8rem;">Selected Channel:</div>
                        <strong style="color: var(--color-primary);">${escapeHtml(order.customer?.paymentMethod || 'COD')}</strong>
                    </div>
                    ${order.paymentProof ? `
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <img src="${order.paymentProof}" alt="Receipt Proof" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border-light);" />
                            <div>
                                <div style="color: #10b981; font-weight: 700; font-size: 0.82rem;">✓ Proof Receipt Attached</div>
                                <a href="${order.paymentProof}" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); font-size: 0.8rem; text-decoration: underline;">View Full Size ↗</a>
                            </div>
                        </div>
                    ` : '<span style="color: var(--color-text-muted); font-size: 0.82rem;">No transfer receipt uploaded</span>'}
                </div>
            </div>
        `;

        if (footerEl) {
            footerEl.innerHTML = `
                <div>
                    <!-- Cancellation Option: ONLY permitted before payment verification -->
                    ${(order.status === 'pending' && !order.paymentVerified) ? `
                        <button type="button" class="btn-cancel-order" onclick="MrymifyCart.cancelCustomerOrder('${order.orderId}')" style="background: none; border: 1.5px solid #ef4444; color: #ef4444; padding: 0.45rem 0.95rem; border-radius: 8px; font-weight: 600; font-size: 0.84rem; cursor: pointer; transition: all 0.2s;" title="Cancel this order before payment verification">
                            ✕ Cancel Order
                        </button>
                    ` : '<span style="font-size: 0.82rem; color: var(--color-text-muted);">Verified orders cannot be cancelled online.</span>'}
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Mariyam! I have a question regarding my Mrymify order #${order.orderId}.`)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-decoration: none; padding: 0.45rem 1rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                        <span>Inquire with Mariyam 💬</span>
                    </a>
                    <button type="button" class="btn btn-outline" onclick="MrymifyCart.closeCustomerOrderDetail()" style="padding: 0.45rem 1rem; font-size: 0.85rem;">
                        Close
                    </button>
                </div>
            `;
        }

        modal.classList.add('is-active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Closes customer order card modal
     */
    function closeCustomerOrderDetail() {
        const modal = document.getElementById('customer-order-detail-modal');
        if (modal) {
            modal.classList.remove('is-active');
        }
        document.body.style.overflow = '';
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
            successStepperBox.innerHTML = renderProgressStepperHtml(order, true);
        }
    }

    /**
     * Generates responsive HTML for the 5-step handcrafted progress stepper (no individual co-founder names)
     * @param {Object} order
     * @param {boolean} includeStatusBox - If true, renders the message box ("Your order is confirmed..."). If false, renders only the visual track upfront.
     */
    function renderProgressStepperHtml(order, includeStatusBox = true) {
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
            if (!includeStatusBox) {
                return `
                    <div style="margin: 0.5rem 0;">
                        <span style="display: inline-block; padding: 0.35rem 0.75rem; background: #fee2e2; color: #b91c1c; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">❌ Order Cancelled</span>
                    </div>
                `;
            }
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

        const stepperTrackHtml = `
            <div class="order-stepper-wrap">
                <div class="order-stepper-track">
                    <div class="order-stepper-progress-fill" style="width: ${fillPercent}%;"></div>
                    ${stepsHtml}
                </div>
            </div>
        `;

        if (!includeStatusBox) {
            return stepperTrackHtml;
        }

        return `
            ${stepperTrackHtml}

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

    /**
     * Customer Order Cancellation - Permitted strictly before payment verification
     */
    function cancelCustomerOrder(orderId) {
        const orders = getSavedOrders();
        const order = orders.find(o => o.orderId === orderId);
        if (!order) return;

        if (order.status !== 'pending' || order.paymentVerified) {
            alert('This order has already been verified and is in handcrafting. It can no longer be cancelled online.');
            return;
        }

        if (!confirm(`Are you sure you want to cancel Order #${order.orderId}?\n\nOnce cancelled, the crafting slot will be released.`)) return;

        order.status = 'cancelled';
        try {
            localStorage.setItem('mrymify_orders', JSON.stringify(orders));
        } catch (e) {
            console.error('Error saving cancelled order', e);
        }

        closeCustomerOrderDetail();
        updateCartBadgeAndCounts();
        renderCustomerOrdersList();
        alert(`Order #${order.orderId} has been cancelled.`);
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
        updateCartBadgeAndCounts: updateCartBadgeAndCounts,
        onPaymentMethodChange: onPaymentMethodChange,
        handleProofFileSelect: handleProofFileSelect,
        clearPaymentProof: clearPaymentProof,
        cancelCustomerOrder: cancelCustomerOrder,
        showProductDetails: showProductDetails,
        openCustomerOrderDetail: openCustomerOrderDetail,
        closeCustomerOrderDetail: closeCustomerOrderDetail
    };
})();
