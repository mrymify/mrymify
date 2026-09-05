/**
 * Mrymify - Custom Orders & Personalization Studio Scripts (js/custom-orders.js)
 * Features:
 * - WhatsApp-style quoted product reply (via ?refProduct= or ?item=)
 * - Customer reference image / sketch attachment with preview
 * - Dynamic yarn palette loaded from ADP dev tools with custom color entry
 * - Handwritten note card option with +Rs. 10 extra charge
 * - Customer profile auto-fill and auto-save (mrymify_user_profile)
 * - Seamless order dispatch to ADP orders pipeline and WhatsApp
 */

(function () {
    'use strict';

    const WHATSAPP_PHONE = '923000896885';

    // State
    let activeQuotedProduct = null;
    let activeReferenceImage = null;

    const DEFAULT_YARN_COLORS = [
        'Blush Pink', 'Sage Green', 'Lavender Purple', 'Buttercream Yellow',
        'Sky Blue', 'Crimson Red', 'Caramel Beige', 'Pure Snow White',
        'Charcoal Night', 'Emerald Forest', 'Warm Terracotta', 'Mustard Gold'
    ];

    const SWATCH_COLOR_MAP = {
        'blush pink': '#fbcfe8',
        'sage green': '#bbf7d0',
        'lavender purple': '#e9d5ff',
        'buttercream yellow': '#fef08a',
        'sky blue': '#bae6fd',
        'crimson red': '#fca5a5',
        'caramel beige': '#d7ccc8',
        'pure snow white': '#ffffff',
        'charcoal night': '#334155',
        'emerald forest': '#065f46',
        'warm terracotta': '#ea580c',
        'mustard gold': '#ca8a04'
    };

    document.addEventListener('DOMContentLoaded', function () {
        // 1. Mount Navigation & Footer Components
        if (window.MrymifyNavbar && typeof window.MrymifyNavbar.render === 'function') {
            window.MrymifyNavbar.render('custom-orders');
        }
        if (window.MrymifyFooter && typeof window.MrymifyFooter.render === 'function') {
            window.MrymifyFooter.render();
        }

        // 2. Initialize Custom Order Studio Components
        initQuotedProduct();
        initReferenceImage();
        initYarnPalette();
        initAddonDrawers();
        initCustomerProfilePrefill();
        initCustomOrderForm();
        initFaqAccordion();
    });

    /**
     * Initializes WhatsApp-style quoted product reply card when arriving from product customize button
     */
    function initQuotedProduct() {
        const urlParams = new URLSearchParams(window.location.search);
        const refId = urlParams.get('refProduct');
        const itemName = urlParams.get('item');
        const catName = urlParams.get('cat');

        let product = null;
        if (window.MrymifyProducts && typeof window.MrymifyProducts.getEffectiveCatalog === 'function') {
            const catalog = window.MrymifyProducts.getEffectiveCatalog(true);
            if (refId) {
                product = catalog.find(p => p.id === refId);
            }
            if (!product && itemName) {
                product = catalog.find(p => p.title.toLowerCase() === itemName.toLowerCase() || p.title.toLowerCase().includes(itemName.toLowerCase()));
            }
        }

        const banner = document.getElementById('co-quoted-product-banner');
        const titleEl = document.getElementById('co-quoted-product-title');
        const subEl = document.getElementById('co-quoted-product-sub');
        const imgEl = document.getElementById('co-quoted-product-img');
        const removeBtn = document.getElementById('btn-remove-quoted-product');

        if (product && banner) {
            activeQuotedProduct = product;
            if (titleEl) titleEl.textContent = product.title;
            if (subEl) subEl.textContent = `Rs. ${Number(product.price).toLocaleString('en-PK')} • ${product.categoryLabel || product.category}`;
            if (imgEl) {
                imgEl.src = product.image;
                imgEl.alt = product.title;
            }
            banner.style.display = 'flex';

            // Auto-select category if matching
            const catSelect = document.getElementById('co-category');
            if (catSelect && product.category) {
                for (let i = 0; i < catSelect.options.length; i++) {
                    if (catSelect.options[i].value.toLowerCase().includes(product.category.toLowerCase()) || 
                        product.category.toLowerCase().includes(catSelect.options[i].value.toLowerCase())) {
                        catSelect.selectedIndex = i;
                        break;
                    }
                }
            }

            // Pre-fill initial description note
            const detailsInput = document.getElementById('co-details');
            if (detailsInput && !detailsInput.value) {
                detailsInput.value = `Referenced Piece: "${product.title}" — Please craft with my custom color choices and personalization.`;
            }

            if (removeBtn) {
                removeBtn.onclick = function () {
                    activeQuotedProduct = null;
                    banner.style.display = 'none';
                };
            }
        } else if (catName) {
            const catSelect = document.getElementById('co-category');
            if (catSelect) {
                for (let i = 0; i < catSelect.options.length; i++) {
                    if (catSelect.options[i].value.toLowerCase().includes(catName.toLowerCase()) || 
                        catName.toLowerCase().includes(catSelect.options[i].value.toLowerCase())) {
                        catSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Initializes customer reference image / sketch attachment
     */
    function initReferenceImage() {
        const fileInput = document.getElementById('co-reference-file');
        const previewBox = document.getElementById('co-reference-preview-box');
        const previewImg = document.getElementById('co-reference-img');
        const filenameEl = document.getElementById('co-reference-filename');
        const clearBtn = document.getElementById('btn-clear-reference');

        if (!fileInput) return;

        fileInput.addEventListener('change', function (e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('Please upload an image smaller than 5MB.');
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (evt) {
                activeReferenceImage = evt.target.result;
                if (previewImg) previewImg.src = activeReferenceImage;
                if (filenameEl) filenameEl.textContent = file.name;
                if (previewBox) previewBox.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                activeReferenceImage = null;
                fileInput.value = '';
                if (previewBox) previewBox.style.display = 'none';
            });
        }
    }

    /**
     * Renders available yarn palette dynamically from ADP settings
     */
    function initYarnPalette() {
        const wrap = document.getElementById('co-yarn-swatches-wrap');
        const colorInput = document.getElementById('custom-color-input');
        if (!wrap || !colorInput) return;

        let colors = DEFAULT_YARN_COLORS;
        try {
            const stored = localStorage.getItem('mrymify_available_yarn_colors');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) colors = parsed;
            }
        } catch(e) {}

        wrap.innerHTML = colors.map(col => {
            const cleanKey = col.toLowerCase().trim();
            const dotColor = SWATCH_COLOR_MAP[cleanKey] || '#b85d43';
            return `
                <button type="button" class="swatch-chip" data-color="${col}" title="Select ${col}">
                    <span class="swatch-color-dot" style="background: ${dotColor}; border: 1px solid rgba(0,0,0,0.15);"></span>
                    <span>${col}</span>
                </button>
            `;
        }).join('');

        // Wire swatch clicks
        const chips = wrap.querySelectorAll('.swatch-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', function () {
                const chosen = this.getAttribute('data-color') || this.textContent.trim();
                const currentVal = colorInput.value.trim();

                if (!currentVal) {
                    colorInput.value = chosen;
                } else if (!currentVal.toLowerCase().includes(chosen.toLowerCase())) {
                    colorInput.value = currentVal + ', ' + chosen;
                }
                this.classList.add('selected');
                colorInput.focus();
            });
        });
    }

    /**
     * Initializes interactive collapsible drawers for special queries / add-ons
     */
    function initAddonDrawers() {
        const addonConfigs = [
            { checkId: 'addon-note-check', drawerId: 'drawer-note', cardId: 'addon-card-note', inputId: 'addon-note-msg' },
            { checkId: 'addon-initials-check', drawerId: 'drawer-initials', cardId: 'addon-card-initials', inputId: 'addon-initials-val' },
            { checkId: 'addon-packaging-check', drawerId: 'drawer-packaging', cardId: 'addon-card-packaging', inputId: 'addon-packaging-val' },
            { checkId: 'addon-date-check', drawerId: 'drawer-date', cardId: 'addon-card-date', inputId: 'addon-date-val' }
        ];

        addonConfigs.forEach(item => {
            const checkbox = document.getElementById(item.checkId);
            const drawer = document.getElementById(item.drawerId);
            const card = document.getElementById(item.cardId);
            const targetInput = document.getElementById(item.inputId);

            if (!checkbox || !drawer || !card) return;

            function syncState() {
                if (checkbox.checked) {
                    card.classList.add('is-selected');
                    drawer.classList.add('open');
                    if (targetInput) {
                        setTimeout(() => targetInput.focus(), 80);
                    }
                } else {
                    card.classList.remove('is-selected');
                    drawer.classList.remove('open');
                }
            }

            checkbox.addEventListener('change', syncState);
            syncState();
        });
    }

    /**
     * Auto-prefills customer profile info from device storage
     */
    function initCustomerProfilePrefill() {
        try {
            const raw = localStorage.getItem('mrymify_user_profile');
            if (!raw) return;
            const profile = JSON.parse(raw);
            const nameInput = document.getElementById('co-name');
            const phoneInput = document.getElementById('co-phone');

            if (nameInput && !nameInput.value && profile.name) nameInput.value = profile.name;
            if (phoneInput && !phoneInput.value && profile.phone) phoneInput.value = profile.phone;
        } catch(e) {}
    }

    /**
     * Handles custom order submission: saves to ADP orders and opens structured WhatsApp
     */
    function initCustomOrderForm() {
        const form = document.getElementById('custom-order-builder-form');
        const feedbackEl = document.getElementById('co-form-feedback');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = (document.getElementById('co-name')?.value || '').trim();
            const phone = (document.getElementById('co-phone')?.value || '').trim();
            const category = document.getElementById('co-category')?.value || 'Amigurumi & Plushies';
            const details = (document.getElementById('co-details')?.value || '').trim();
            const colors = (document.getElementById('custom-color-input')?.value || '').trim();

            if (!name) {
                showFeedback('Please enter your full name.', false);
                return;
            }
            if (!phone) {
                showFeedback('Please enter your WhatsApp / phone number.', false);
                return;
            }
            if (!details) {
                showFeedback('Please provide a description of the piece you want handcrafted.', false);
                return;
            }
            if (!colors) {
                showFeedback('Please specify your desired colors or yarn shades.', false);
                return;
            }

            // Save/update user profile on device
            try {
                const existing = JSON.parse(localStorage.getItem('mrymify_user_profile') || '{}');
                existing.name = name;
                existing.phone = phone;
                existing.lastUpdated = new Date().toISOString();
                localStorage.setItem('mrymify_user_profile', JSON.stringify(existing));
            } catch(e) {}

            // Gather special add-on queries and their respective input texts
            const addonsSummary = [];
            const noteCheck = document.getElementById('addon-note-check');
            const isNoteSelected = Boolean(noteCheck && noteCheck.checked);
            const noteMsg = (document.getElementById('addon-note-msg')?.value || '').trim();
            const noteFee = isNoteSelected ? 10 : 0;

            if (isNoteSelected) {
                addonsSummary.push(`💌 *Handwritten Gift Note Card (+Rs. 10):* ${noteMsg ? `"${noteMsg}"` : 'Included'}`);
            }

            const initialsCheck = document.getElementById('addon-initials-check');
            if (initialsCheck && initialsCheck.checked) {
                const initialsVal = (document.getElementById('addon-initials-val')?.value || '').trim();
                addonsSummary.push(`🔤 *Custom Initials / Name:* ${initialsVal ? `"${initialsVal}"` : 'Requested'}`);
            }

            const packCheck = document.getElementById('addon-packaging-check');
            if (packCheck && packCheck.checked) {
                const packVal = (document.getElementById('addon-packaging-val')?.value || '').trim();
                addonsSummary.push(`🎁 *Signature Gift Packaging:* ${packVal ? `"${packVal}"` : 'Boutique wrap requested'}`);
            }

            const dateCheck = document.getElementById('addon-date-check');
            if (dateCheck && dateCheck.checked) {
                const dateVal = (document.getElementById('addon-date-val')?.value || '').trim();
                addonsSummary.push(`📅 *Needed-By Event Date:* ${dateVal ? `"${dateVal}"` : 'Urgent timeline requested'}`);
            }

            // Save custom request into Admin Panel (ADP) Orders database
            const orderId = 'CST-' + Math.floor(10000 + Math.random() * 90000);
            const orderDate = new Date().toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
            const basePrice = activeQuotedProduct ? (Number(activeQuotedProduct.price) || 0) : 0;
            const subtotal = basePrice + noteFee;
            const shipping = (subtotal >= 3500 || subtotal === 0) ? 0 : 200;
            const grandTotal = subtotal + shipping;

            try {
                let userProfile = {};
                try { userProfile = JSON.parse(localStorage.getItem('mrymify_user_profile') || '{}'); } catch(e) {}

                const orderRecord = {
                    orderId: orderId,
                    date: orderDate,
                    status: 'pending',
                    customer: {
                        name: name,
                        phone: phone,
                        city: userProfile.city || 'Custom Commission',
                        address: userProfile.address || 'Direct Inquiry',
                        notes: details,
                        paymentMethod: 'Advance Payment'
                    },
                    items: activeQuotedProduct ? [
                        {
                            id: activeQuotedProduct.id,
                            title: `Customized: ${activeQuotedProduct.title}`,
                            price: activeQuotedProduct.price + noteFee,
                            image: activeQuotedProduct.image,
                            quantity: 1
                        }
                    ] : [
                        {
                            id: 'custom-' + Date.now(),
                            title: `Custom Commission: ${category}`,
                            price: noteFee,
                            image: activeReferenceImage || 'images/logo.jpg',
                            quantity: 1
                        }
                    ],
                    quotedProduct: activeQuotedProduct ? {
                        id: activeQuotedProduct.id,
                        title: activeQuotedProduct.title,
                        price: activeQuotedProduct.price,
                        image: activeQuotedProduct.image
                    } : null,
                    referenceImage: activeReferenceImage || null,
                    yarnColor: colors,
                    giftNoteCard: isNoteSelected,
                    giftNoteText: isNoteSelected ? (noteMsg || 'Boutique Note Card') : null,
                    subtotal: subtotal,
                    shipping: shipping,
                    grandTotal: grandTotal,
                    isCustomRequest: true
                };

                const currentOrders = JSON.parse(localStorage.getItem('mrymify_orders') || '[]');
                currentOrders.unshift(orderRecord);
                localStorage.setItem('mrymify_orders', JSON.stringify(currentOrders));
                localStorage.setItem('mrymify_latest_order_id', orderId);

                // Track analytics
                if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackCustomOrder === 'function') {
                    window.MrymifyAnalytics.trackCustomOrder(category);
                }
            } catch(err) {
                console.warn('Could not save custom commission to ADP', err);
            }

            // Build structured WhatsApp message for Mariyam
            let waMessage = `🌸 *CUSTOM BESPOKE CROCHET COMMISSION* (#${orderId})\n\n`;

            if (activeQuotedProduct) {
                waMessage += `↩️ *Quoted / Replied Piece:* ${activeQuotedProduct.title} (Rs. ${activeQuotedProduct.price})\n` +
                             `🆔 *Ref ID:* ${activeQuotedProduct.id}\n\n`;
            }

            waMessage += `👤 *Client Name:* ${name}\n` +
                         `📞 *WhatsApp / Phone:* ${phone}\n` +
                         `🧶 *Piece Category:* ${category}\n` +
                         `🎨 *Desired Colors & Yarn:* ${colors}\n\n` +
                         `📝 *Design Details & Description:*\n${details}\n\n`;

            if (activeReferenceImage) {
                waMessage += `📸 *Reference Photo:* Attached to Commission Record #${orderId} (Sharing directly in this chat!)\n\n`;
            }

            if (addonsSummary.length > 0) {
                waMessage += `✨ *Special Personalization & Add-ons:*\n` + addonsSummary.join('\n') + `\n\n`;
            }

            if (isNoteSelected) {
                waMessage += `💌 *Special Note Card:* +Rs. 10 included\n`;
            }

            waMessage += `\n---\n_Registered as Commission #${orderId} in Mrymify Atelier_ ✨`;

            const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMessage)}`;

            showFeedback(`Commission #${orderId} registered! Opening WhatsApp with Mariyam... ✨`, true);

            setTimeout(function () {
                window.open(waUrl, '_blank', 'noopener,noreferrer');
            }, 600);
        });

        function showFeedback(text, isSuccess) {
            if (!feedbackEl) {
                alert(text);
                return;
            }
            feedbackEl.className = 'form-status-alert ' + (isSuccess ? 'alert-success' : 'alert-error');
            feedbackEl.textContent = text;
            feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Initializes FAQ accordion toggling
     */
    function initFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(item => {
            const questionBtn = item.querySelector('.faq-question');
            if (!questionBtn) return;

            questionBtn.addEventListener('click', function () {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }

})();
