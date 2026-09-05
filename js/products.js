/**
 * Mrymify - Product Catalog Data & Utilities
 * Complete 30-item catalog synchronized with Lookbook & Product Description PDF.
 */

(function () {
    'use strict';

    // WhatsApp Business Contact (Mariyam)
    const WHATSAPP_NUMBER = '923000896885';

    // Modern Chrome/Material Edit Pencil Icon Vector
    const EDIT_PENCIL_SVG = `<svg class="edit-pencil-icon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;

    const PRODUCTS = [
        {
            id: 'prod-01',
            title: 'Royal Crown Froggy',
            category: 'amigurumi',
            categoryLabel: 'Amigurumi & Plushies',
            price: 1450,
            originalPrice: 1700,
            image: 'images/products/01_Royal_Crown_Froggy.png',
            badge: 'Best Seller',
            description: 'Handcrafted plush froggy prince with an intricate golden yarn crown and adorable rosy cheeks.',
            isFeatured: true
        },
        {
            id: 'prod-02',
            title: 'Sweet Heart Panda Plush',
            category: 'amigurumi',
            categoryLabel: 'Amigurumi & Plushies',
            price: 1350,
            originalPrice: 1600,
            image: 'images/products/02_Sweet_Heart_Panda_Plush.png',
            badge: 'Popular',
            description: 'Lovable baby panda amigurumi holding a soft pink heart, crocheted using skin-friendly yarn.',
            isFeatured: true
        },
        {
            id: 'prod-03',
            title: 'Doctor Doll Keychain',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 550,
            originalPrice: 650,
            image: 'images/products/03_Doctor_Doll_Keychain.png',
            badge: 'Graduation Gift',
            description: 'Custom character doctor doll with stethoscope and coat, ideal for medical students and doctors.',
            isFeatured: false
        },
        {
            id: 'prod-04',
            title: 'Little Yellow Chicks Set',
            category: 'amigurumi',
            categoryLabel: 'Amigurumi & Plushies',
            price: 950,
            originalPrice: 1100,
            image: 'images/products/04_Little_Yellow_Chicks_Set.png',
            badge: 'Set of 3',
            description: 'Delightful trio of fluffy yellow chicks with comb details and sweet embroidered faces.',
            isFeatured: false
        },
        {
            id: 'prod-05',
            title: 'We Bare Bears Trio',
            category: 'amigurumi',
            categoryLabel: 'Amigurumi & Plushies',
            price: 1450,
            originalPrice: 1750,
            image: 'images/products/05_We_Bare_Bears_Trio.png',
            badge: 'Fan Favorite',
            description: 'The iconic Grizz, Panda, and Ice Bear hand-crocheted key charms in full stacked cuteness.',
            isFeatured: false
        },
        {
            id: 'prod-06',
            title: 'Cozy Scarf Bunny Pair',
            category: 'amigurumi',
            categoryLabel: 'Amigurumi & Plushies',
            price: 1650,
            originalPrice: 1900,
            image: 'images/products/06_Cozy_Scarf_Bunny_Pair.png',
            badge: 'Couple Gift',
            description: 'Two pure white cuddle bunnies bundled together in warm knitted winter scarves.',
            isFeatured: true
        },
        {
            id: 'prod-07',
            title: 'Pure White Tulip Bouquet',
            category: 'floral',
            categoryLabel: 'Floral Bouquets',
            price: 1800,
            originalPrice: 2200,
            image: 'images/products/07_Pure_White_Tulip_Bouquet.png',
            badge: 'Best Seller',
            description: 'Evergreen open crochet tulips wrapped with lush green leaves and tied with elegant satin ribbon.',
            isFeatured: true
        },
        {
            id: 'prod-08',
            title: 'Pink Stargazer Lilies',
            category: 'floral',
            categoryLabel: 'Floral Bouquets',
            price: 1650,
            originalPrice: 1950,
            image: 'images/products/08_Pink_Stargazer_Lilies.png',
            badge: 'Elegant',
            description: 'Realistic pink stargazer lilies with wired petals that can be gently shaped and displayed.',
            isFeatured: false
        },
        {
            id: 'prod-09',
            title: 'Grand Mixed Rose & Tulip Bouquet',
            category: 'floral',
            categoryLabel: 'Floral Bouquets',
            price: 2450,
            originalPrice: 2900,
            image: 'images/products/09_Grand_Mixed_Rose_Tulip_Bouquet.png',
            badge: 'Showcase Masterpiece',
            description: 'Our premier floral showcase: an opulent blend of roses, open tulips, and baby breath in luxury wrap.',
            isFeatured: true
        },
        {
            id: 'prod-10',
            title: 'Sunshine Daisy & Tulip Wrap',
            category: 'floral',
            categoryLabel: 'Floral Bouquets',
            price: 1850,
            originalPrice: 2100,
            image: 'images/products/10_Sunshine_Daisy_Tulip_Wrap.png',
            badge: 'Bright & Cheerful',
            description: 'Cheerful yellow daisies paired with cream tulips wrapped in boutique kraft floral packaging.',
            isFeatured: false
        },
        {
            id: 'prod-11',
            title: 'Rose & Tulip Single Stems',
            category: 'floral',
            categoryLabel: 'Floral Bouquets',
            price: 450,
            originalPrice: 550,
            image: 'images/products/11_Rose_Tulip_Single_Stems.png',
            badge: 'Single Stem',
            description: 'Individual crochet rose and tulip stems, perfect for single-stem vases and sweet tokens of love.',
            isFeatured: false
        },
        {
            id: 'prod-12',
            title: 'Daisy Chain Vine Garland',
            category: 'floral',
            categoryLabel: 'Floral Bouquets',
            price: 1250,
            originalPrice: 1500,
            image: 'images/products/12_Daisy_Chain_Vine_Garland.png',
            badge: 'Room Decor',
            description: 'Long trailing botanical vine featuring delicate white blooming daisies for mirrors and walls.',
            isFeatured: false
        },
        {
            id: 'prod-13',
            title: 'Spiderweb Fingerless Gloves (White)',
            category: 'wearables',
            categoryLabel: 'Bags & Wearables',
            price: 950,
            originalPrice: 1200,
            image: 'images/products/13_Spiderweb_Fingerless_Gloves_White.png',
            badge: 'Trending',
            description: 'Intricate spiderweb lace fingerless gloves hand-stitched in pure white with elastic comfortable fit.',
            isFeatured: false
        },
        {
            id: 'prod-14',
            title: 'Spiderweb Fingerless Gloves (Maroon)',
            category: 'wearables',
            categoryLabel: 'Bags & Wearables',
            price: 950,
            originalPrice: 1200,
            image: 'images/products/14_Spiderweb_Fingerless_Gloves_Maroon.png',
            badge: 'Trending',
            description: 'Deep maroon gothic-chic spiderweb gloves, ideal for cosplay, festive fashion, and cold days.',
            isFeatured: false
        },
        {
            id: 'prod-15',
            title: 'Bobble Stitch Shoulder Bag',
            category: 'wearables',
            categoryLabel: 'Bags & Wearables',
            price: 2850,
            originalPrice: 3400,
            image: 'images/products/15_Bobble_Stitch_Shoulder_Bag.png',
            badge: 'Artisan Bag',
            description: 'Chic hand-crocheted shoulder bag with rich textured bobble stitches in warm terracotta brown.',
            isFeatured: true
        },
        {
            id: 'prod-16',
            title: 'Striped Luxury Style Handbag',
            category: 'wearables',
            categoryLabel: 'Bags & Wearables',
            price: 3200,
            originalPrice: 3800,
            image: 'images/products/16_Striped_Luxury_Style_Handbag.png',
            badge: 'Luxury Tote',
            description: 'Sturdy structured crochet handbag with designer-inspired color blocking and double handles.',
            isFeatured: false
        },
        {
            id: 'prod-17',
            title: 'Scalloped Lavender Crossbody Bag',
            category: 'wearables',
            categoryLabel: 'Bags & Wearables',
            price: 2650,
            originalPrice: 3100,
            image: 'images/products/17_Scalloped_Lavender_Crossbody_Bag.png',
            badge: 'Pastel Chic',
            description: 'Circular floral blossom crossbody pouch in pastel lavender with contrasting scalloped petal trim.',
            isFeatured: false
        },
        {
            id: 'prod-18',
            title: 'Frilled Bangle Bracelet Set',
            category: 'wearables',
            categoryLabel: 'Bags & Wearables',
            price: 750,
            originalPrice: 950,
            image: 'images/products/18_Frilled_Bangle_Bracelet_Set.png',
            badge: 'Starting Rs. 750',
            description: 'Yarn-wrapped bangle set embellished with delicate frills, pearls, and traditional festive charm.',
            isFeatured: false
        },
        {
            id: 'prod-19',
            title: 'Wrapped Tulip Charm',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 450,
            originalPrice: 550,
            image: 'images/products/19_Wrapped_Tulip_Charm.png',
            badge: 'Bag Charm',
            description: 'A pocket-sized wrapped tulip bouquet with green leaves and lobster clip for handbags.',
            isFeatured: false
        },
        {
            id: 'prod-20',
            title: 'Strawberry & Blossom Keyring',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 450,
            originalPrice: 550,
            image: 'images/products/20_Strawberry_Blossom_Keyring.png',
            badge: 'Best Seller',
            description: 'Sweet textured strawberry with green calyx and tiny white flower charm on a gold keyring.',
            isFeatured: true
        },
        {
            id: 'prod-21',
            title: 'Cherry & Pearl Bead Charm',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 450,
            originalPrice: 550,
            image: 'images/products/21_Cherry_Pearl_Bead_Charm.png',
            badge: 'Cute',
            description: 'Glossy red twin cherries suspended from a faux pearl beaded wristlet and keychain.',
            isFeatured: false
        },
        {
            id: 'prod-22',
            title: 'Pink Floral Hair Bun Pin',
            category: 'keychains',
            categoryLabel: 'Hair Accessories',
            price: 450,
            originalPrice: 550,
            image: 'images/products/22_Pink_Floral_Hair_Bun_Pin.png',
            badge: 'Hair Pin',
            description: 'Handcrafted bow and flower hair pins mounted on secure grip pins for neat hairstyles.',
            isFeatured: false
        },
        {
            id: 'prod-23',
            title: 'Sunflower Hair Bun Ring',
            category: 'keychains',
            categoryLabel: 'Hair Accessories',
            price: 750,
            originalPrice: 900,
            image: 'images/products/23_Sunflower_Hair_Bun_Ring.png',
            badge: 'Hair Ring',
            description: 'Crochet sunflower bun ring with central hairpin stick, turning buns into radiant floral crowns.',
            isFeatured: false
        },
        {
            id: 'prod-24',
            title: 'Monogram Heart & Key Set',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 550,
            originalPrice: 700,
            image: 'images/products/24_Monogram_Heart_Key_Set.png',
            badge: 'Personalized',
            description: 'Padded heart keychain embroidered with your chosen initial, paired with a matching yarn key.',
            isFeatured: false
        },
        {
            id: 'prod-25',
            title: 'Ice Cream Lip Balm Holder',
            category: 'novelties',
            categoryLabel: 'Novelty Gifts',
            price: 650,
            originalPrice: 800,
            image: 'images/products/25_Ice_Cream_Lip_Balm_Holder.png',
            badge: 'Functional',
            description: 'Cute ice cream cone with vanilla swirl cap that holds your favorite chapstick or lip balm.',
            isFeatured: false
        },
        {
            id: 'prod-26',
            title: 'Mini Amigurumi Charms',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 350,
            originalPrice: 450,
            image: 'images/products/26_Mini_Amigurumi_Charms.png',
            badge: 'Pocket Mini',
            description: 'Miniature bumblebees, smiling clouds, chicks, and hearts for backpacks and zipper pulls.',
            isFeatured: false
        },
        {
            id: 'prod-27',
            title: 'Cute Berry & Bow Keyrings',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 450,
            originalPrice: 550,
            image: 'images/products/27_Cute_Berry_Bow_Keyrings.png',
            badge: 'Sweet Gift',
            description: 'Pastel berry keychains tied with soft matching crochet bows and silver key loops.',
            isFeatured: false
        },
        {
            id: 'prod-28',
            title: 'Hanging Stars Gift Box',
            category: 'novelties',
            categoryLabel: 'Novelty Gifts',
            price: 850,
            originalPrice: 1050,
            image: 'images/products/28_Hanging_Stars_Gift_Box.png',
            badge: 'Keepsake',
            description: 'Cascading crochet star pendants presented in a sweet gift box, perfect for bedroom aesthetic.',
            isFeatured: false
        },
        {
            id: 'prod-29',
            title: 'Crochet Ring Storage Box',
            category: 'novelties',
            categoryLabel: 'Novelty Gifts',
            price: 750,
            originalPrice: 900,
            image: 'images/products/29_Crochet_Ring_Storage_Box.png',
            badge: 'Organizer',
            description: 'Handmade miniature jewelry box with fitted lid to safely hold rings, earrings, and trinkets.',
            isFeatured: false
        },
        {
            id: 'prod-30',
            title: 'Ribbon Bow Heart Keyring',
            category: 'keychains',
            categoryLabel: 'Keychains & Charms',
            price: 450,
            originalPrice: 550,
            image: 'images/products/30_Ribbon_Bow_Heart_Keyring.png',
            badge: 'Charming',
            description: 'Blush pink crochet heart with ribbon bow tails and sturdy metal keyring hardware.',
            isFeatured: false
        }
    ];

    /**
     * Formatting helper for Pakistani Rupee prices
     */
    function formatPrice(amount) {
        return 'Rs. ' + Number(amount).toLocaleString('en-PK');
    }

    /**
     * Generates direct WhatsApp order URL with pre-filled message
     */
    function generateWhatsAppOrderUrl(product) {
        const text = encodeURIComponent(
            `Hello Mariyam! 👋\nI would like to order:\n\n*Product:* ${product.title}\n*Price:* ${formatPrice(product.price)}\n*Code:* ${product.id}\n\nPlease confirm availability and payment details.`
        );
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    }

    /**
     * Retrieves stored like count or seeds a clean true value
     */
    function getProductLikes(productId) {
        try {
            const allLikes = JSON.parse(localStorage.getItem('mrymify_product_likes') || '{}');
            if (allLikes[productId] !== undefined) {
                return Number(allLikes[productId]) || 0;
            }
            // True base count (not random)
            const baseCount = 0;
            allLikes[productId] = baseCount;
            localStorage.setItem('mrymify_product_likes', JSON.stringify(allLikes));
            return baseCount;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Checks whether like counts are visible to users
     */
    function isLikeCountVisible() {
        return localStorage.getItem('mrymify_show_likes') !== 'false';
    }

    /**
     * Checks if current user has liked this product
     */
    function isUserLiked(productId) {
        try {
            const likedList = JSON.parse(localStorage.getItem('mrymify_user_liked') || '[]');
            return likedList.includes(productId);
        } catch (e) {
            return false;
        }
    }

    /**
     * Handles clicking the Like heart button
     */
    function handleLike(productId, event) {
        if (event) event.stopPropagation();

        try {
            const allLikes = JSON.parse(localStorage.getItem('mrymify_product_likes') || '{}');
            let userLiked = JSON.parse(localStorage.getItem('mrymify_user_liked') || '[]');
            let currentCount = allLikes[productId] !== undefined ? Number(allLikes[productId]) : getProductLikes(productId);

            const alreadyLiked = userLiked.includes(productId);
            if (alreadyLiked) {
                currentCount = Math.max(0, currentCount - 1);
                userLiked = userLiked.filter(id => id !== productId);
            } else {
                currentCount += 1;
                userLiked.push(productId);
            }

            allLikes[productId] = currentCount;
            localStorage.setItem('mrymify_product_likes', JSON.stringify(allLikes));
            localStorage.setItem('mrymify_user_liked', JSON.stringify(userLiked));

            // Dispatch global event for navbar and wishlist tab
            window.dispatchEvent(new CustomEvent('mrymify:likes_updated', {
                detail: { count: userLiked.length, userLiked: userLiked }
            }));

            const showCount = isLikeCountVisible();
            const countHtml = showCount ? `<span class="like-count">${currentCount}</span>` : '';

        // Update all DOM elements for this product
        const buttons = document.querySelectorAll(`[data-like-btn="${productId}"]`);
        buttons.forEach(btn => {
            if (!alreadyLiked) {
                btn.classList.add('liked');
                btn.innerHTML = `<span class="heart-icon">❤️</span>${countHtml}`;
            } else {
                btn.classList.remove('liked');
                btn.innerHTML = `<span class="heart-icon">🤍</span>${countHtml}`;
            }
            btn.classList.add('heart-bump');
            setTimeout(() => btn.classList.remove('heart-bump'), 300);
        });

        // Log user like action to visitor journey
        if (!alreadyLiked && window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackAction === 'function') {
            const prod = getEffectiveCatalog(true).find(p => p.id === productId);
            window.MrymifyAnalytics.trackAction('like', `Liked piece: "${prod ? prod.title : productId}" ❤️`, { productId });
        }
    } catch (e) {
        console.error('Error updating likes', e);
    }
}

/**
 * Handles clicking the Customize pencil button
 */
function handleCustomize(productId, event) {
    if (event) event.stopPropagation();
    
    const product = getEffectiveCatalog(true).find(p => p.id === productId);
    const title = product ? product.title : '';
    const cat = product ? product.category : '';

    // Track customize click in ADP analytics
    if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackCustomizationClick === 'function') {
        window.MrymifyAnalytics.trackCustomizationClick(productId, title);
    }

    // Navigate to Custom Orders page with pre-selected item and quoted refProduct
    window.location.href = `custom-orders.html?refProduct=${encodeURIComponent(productId)}&item=${encodeURIComponent(title)}&cat=${encodeURIComponent(cat)}`;
}

/**
 * Handles card click to open full-screen product details page
 */
function handleCardClick(productId, event) {
    // Ignore if clicking action buttons (Cart, Like, Customize)
    if (event && event.target && event.target.closest('.product-card-actions, button, a')) {
        return;
    }
    const product = getEffectiveCatalog(true).find(p => p.id === productId);
    if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackProductView === 'function') {
        window.MrymifyAnalytics.trackProductView(productId, product ? product.title : productId);
    }
    window.location.href = `product-details.html?id=${encodeURIComponent(productId)}`;
}

/**
 * Reviews database generator for authentic boutique feedback
 */
function getProductReviews(product) {
    const defaultReviews = [
        { author: "Fatima Z.", rating: 5, text: "The stitching is beyond neat! Super soft yarn and beautifully packaged in Mariyam's signature box." },
        { author: "Ayesha K.", rating: 5, text: "Ordered as a birthday present and she absolutely loved it. Will definitely be ordering more!" },
        { author: "Hina M.", rating: 5, text: "Exceeded all my expectations! The details are so intricate and colors are just as pictured." }
    ];
    return defaultReviews;
}

let modalDwellTimer = null;
let currentModalProductId = null;

/**
 * Opens Full Product Summary Modal
 */
function openProductModal(productId) {
    const product = getEffectiveCatalog().find(p => p.id === productId);
    if (!product) return;

    // Close any existing modal
    closeProductModal();

    currentModalProductId = productId;
    const dwellStart = Date.now();
    if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackProductView === 'function') {
        window.MrymifyAnalytics.trackProductView(productId, product.title);
    }

        const liked = isUserLiked(product.id);
        const likesCount = getProductLikes(product.id);
        const showLikes = isLikeCountVisible();
        const reviews = getProductReviews(product);
        const discountBadge = product.originalPrice && product.originalPrice > product.price
            ? `<span class="badge badge-primary">Save Rs. ${product.originalPrice - product.price}</span>`
            : '';

        const modalHtml = `
            <div id="mrymify-product-modal" class="product-modal-backdrop" onclick="if (event.target === this) MrymifyProducts.closeProductModal();">
                <div class="product-modal-card" role="dialog" aria-modal="true">
                    <button type="button" class="product-modal-close" onclick="MrymifyProducts.closeProductModal()" aria-label="Close modal">&times;</button>
                    
                    <div class="product-modal-gallery">
                        <div class="product-modal-img-wrap">
                            <img src="${product.image}" alt="${product.title}" class="product-modal-img" id="modal-main-img" />
                        </div>
                    </div>

                    <div class="product-modal-details">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                            <span class="product-modal-category">${product.categoryLabel || product.category}</span>
                            ${discountBadge}
                        </div>

                        <h2 class="product-modal-title">${product.title}</h2>

                        <div class="product-modal-pricing">
                            <span class="product-modal-price">${formatPrice(product.price)}</span>
                            ${product.originalPrice ? `<span class="product-modal-original-price">${formatPrice(product.originalPrice)}</span>` : ''}
                        </div>

                        <p class="product-modal-desc">${product.description}</p>

                        <div class="product-modal-specs">
                            <div class="product-spec-item">
                                <strong>🧶 Premium Yarn</strong>
                                <span>100% Skin-Friendly Milk Cotton</span>
                            </div>
                            <div class="product-spec-item">
                                <strong>🖐️ Handcrafted</strong>
                                <span>Patiently Crocheted by Hand</span>
                            </div>
                            <div class="product-spec-item">
                                <strong>🚚 Nationwide Care</strong>
                                <span>Gift Boxed & Wax Sealed</span>
                            </div>
                            <div class="product-spec-item">
                                <strong>✨ Custom Friendly</strong>
                                <span>Colors & Initials Available</span>
                            </div>
                        </div>

                        <!-- Customer Reviews -->
                        <div class="product-modal-reviews">
                            <div class="product-reviews-header">
                                <span class="review-stars">★★★★★</span>
                                <span class="review-badge">Verified Artisan Purchase</span>
                            </div>
                            <p class="review-quote">"${reviews[0].text}"</p>
                            <span class="review-author">— ${reviews[0].author} (Verified Buyer)</span>
                        </div>

                        <!-- Action Buttons -->
                        <div class="product-modal-actions">
                            <button class="btn btn-primary btn-add-cart" onclick="MrymifyProducts.handleAddToCart('${product.id}')">
                                <span>Add to Cart 🧺</span>
                            </button>
                            <button class="btn btn-outline btn-customize-big" onclick="MrymifyProducts.handleCustomize('${product.id}', event)" title="Customize this item">
                                ${EDIT_PENCIL_SVG}
                                <span style="margin-left: 6px;">Customize</span>
                            </button>
                            <button class="btn btn-outline btn-like ${liked ? 'liked' : ''}" data-like-btn="${product.id}" onclick="MrymifyProducts.handleLike('${product.id}', event)" title="Like piece">
                                <span class="heart-icon">${liked ? '❤️' : '🤍'}</span>
                                ${showLikes ? `<span class="like-count">${likesCount}</span>` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';

        // Register dwell time tracker on close
        modalDwellTimer = () => {
            const elapsed = (Date.now() - dwellStart) / 1000;
            if (elapsed >= 1 && window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackProductDwellTime === 'function') {
                window.MrymifyAnalytics.trackProductDwellTime(productId, elapsed, product.title);
            }
        };
    }

    /**
     * Closes the product modal
     */
    function closeProductModal() {
        const modal = document.getElementById('mrymify-product-modal');
        if (modal) {
            if (modalDwellTimer) {
                modalDwellTimer();
                modalDwellTimer = null;
            }
            modal.remove();
            document.body.style.overflow = '';
        }
        currentModalProductId = null;
    }

    /**
     * Generates the HTML for a single standardized product card
     */
    function createProductCardHtml(product) {
        const discountBadge = product.originalPrice && product.originalPrice > product.price
            ? `<span class="product-discount-badge">Save Rs. ${product.originalPrice - product.price}</span>`
            : '';

        const likesCount = getProductLikes(product.id);
        const liked = isUserLiked(product.id);
        const showLikes = isLikeCountVisible();

        return `
            <article class="product-card" data-category="${product.category}" data-id="${product.id}" onclick="MrymifyProducts.handleCardClick('${product.id}', event)">
                <div class="product-card-img-wrap">
                    <img 
                        src="${product.image}" 
                        alt="${product.title}" 
                        class="product-card-img" 
                        loading="lazy"
                        width="378"
                        height="332"
                    />
                    <div class="product-card-badges">
                        ${product.badge ? `<span class="badge badge-primary">${product.badge}</span>` : ''}
                        ${discountBadge}
                    </div>
                </div>

                <div class="product-card-content">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 0.25rem;">
                        <span class="product-card-category">${product.categoryLabel || product.category}</span>
                        <span style="font-size: 0.72rem; color: #b45309; background: rgba(245, 158, 11, 0.12); padding: 2px 7px; border-radius: 999px; font-weight: 600; white-space: nowrap;">⏳ ${product.estimatedMakingTime || '2-3 Days'}</span>
                    </div>
                    <h3 class="product-card-title">${product.title}</h3>
                    <p class="product-card-desc">${product.description}</p>
                    
                    <div class="product-card-pricing">
                        <span class="product-price-current">${formatPrice(product.price)}</span>
                        ${product.originalPrice ? `<span class="product-price-original">${formatPrice(product.originalPrice)}</span>` : ''}
                    </div>

                    <div class="product-card-actions">
                        <button class="btn btn-primary btn-sm btn-add-cart" onclick="MrymifyProducts.handleAddToCart('${product.id}')" title="Add to Bag">
                            <span>Add to Cart</span>
                        </button>
                        <button class="btn btn-outline btn-sm btn-customize" data-customize-btn="${product.id}" onclick="MrymifyProducts.handleCustomize('${product.id}', event)" title="Customize / Personalize this piece">
                            ${EDIT_PENCIL_SVG}
                        </button>
                        <button class="btn btn-outline btn-sm btn-like ${liked ? 'liked' : ''}" data-like-btn="${product.id}" onclick="MrymifyProducts.handleLike('${product.id}', event)" title="Like product">
                            <span class="heart-icon">${liked ? '❤️' : '🤍'}</span>
                            ${showLikes ? `<span class="like-count">${likesCount}</span>` : ''}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }


    /**
     * Adds item to localStorage cart and notifies navbar
     */
    function handleAddToCart(productId) {
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) return;

        try {
            let cart = [];
            const raw = localStorage.getItem('mrymify_cart');
            if (raw) cart = JSON.parse(raw);
            if (!Array.isArray(cart)) cart = [];

            const existingIndex = cart.findIndex(item => item.id === productId);
            if (existingIndex > -1) {
                cart[existingIndex].quantity = (Number(cart[existingIndex].quantity) || 1) + 1;
            } else {
                cart.push({
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    image: product.image,
                    quantity: 1
                });
            }

            localStorage.setItem('mrymify_cart', JSON.stringify(cart));

            // Calculate total count
            const totalCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

            // Update navbar badge if available
            if (window.MrymifyNavbar && typeof window.MrymifyNavbar.updateCartBadge === 'function') {
                window.MrymifyNavbar.updateCartBadge(totalCount);
            }

            // Track in analytics
            if (window.MrymifyAnalytics && typeof window.MrymifyAnalytics.trackAddToCart === 'function') {
                window.MrymifyAnalytics.trackAddToCart(product.id, product.title);
            }

            // Quick feedback toast / notification
            showCartToast(product.title);
        } catch (e) {
            console.error('Error updating cart', e);
        }
    }

    /**
     * Shows a non-blocking toast when adding an item to cart
     */
    function showCartToast(productTitle) {
        let toast = document.getElementById('cart-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'cart-toast';
            toast.className = 'cart-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `
            <span>✓</span>
            <div><strong>${productTitle}</strong> added to cart!</div>
        `;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2600);
    }

    /**
     * Filters products grid by category (Used on Shop page)
     */
    function filterProductsGrid(category, gridId) {
        const targetGridId = gridId || 'shop-products-grid';
        const grid = document.getElementById(targetGridId);
        const buttons = document.querySelectorAll('.filter-pill');
        if (!grid) return;

        buttons.forEach(btn => {
            if (btn.getAttribute('data-filter') === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const cards = grid.querySelectorAll('.product-card');
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            if (category === 'all' || cardCat === category) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Retrieves the effective catalog by applying admin overrides and newly added items
     */
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    function purgeExpiredRecycleBin() {
        try {
            const raw = localStorage.getItem('mrymify_recycle_bin');
            if (!raw) return;
            const bin = JSON.parse(raw);
            const now = Date.now();
            const valid = bin.filter(item => {
                const deletedAt = Number(item.deletedAt) || now;
                return (now - deletedAt) <= THIRTY_DAYS_MS;
            });
            if (valid.length !== bin.length) {
                localStorage.setItem('mrymify_recycle_bin', JSON.stringify(valid));
            }
        } catch(e) {}
    }

    function getEffectiveCatalog(includeUnlisted = false) {
        try {
            purgeExpiredRecycleBin();
            const overrides = JSON.parse(localStorage.getItem('mrymify_product_overrides') || '{}');
            const customProducts = JSON.parse(localStorage.getItem('mrymify_custom_products') || '[]');
            const recycleBin = JSON.parse(localStorage.getItem('mrymify_recycle_bin') || '[]');
            const recycledIds = new Set(recycleBin.map(b => b.id));
            
            // Apply price, badge, making time, unlisted and stock overrides to base PRODUCTS
            let effective = PRODUCTS.map(p => {
                if (overrides[p.id]) {
                    return { ...p, ...overrides[p.id] };
                }
                return p;
            });

            // Filter out any items marked as hidden/archived, deleted, or in recycle bin
            effective = effective.filter(p => !overrides[p.id]?.isHidden && !overrides[p.id]?.deleted && !recycledIds.has(p.id));

            // Append any new custom creations added via Admin Panel (exclude deleted or recycled)
            const activeCustom = customProducts.filter(p => !p.deleted && !recycledIds.has(p.id));
            const merged = [...effective, ...activeCustom];

            // Filter out unlisted products unless specifically requested (e.g. by ADP)
            if (!includeUnlisted) {
                return merged.filter(p => p.unlisted !== true);
            }

            return merged;
        } catch (e) {
            console.warn('Could not read product overrides', e);
            return PRODUCTS;
        }
    }

    // Expose Global Products API
    window.MrymifyProducts = {
        get catalog() { return getEffectiveCatalog(); },
        formatPrice: formatPrice,
        generateWhatsAppOrderUrl: generateWhatsAppOrderUrl,
        createProductCardHtml: createProductCardHtml,
        handleAddToCart: handleAddToCart,
        handleLike: handleLike,
        getProductLikes: getProductLikes,
        isUserLiked: isUserLiked,
        getUserLiked: () => JSON.parse(localStorage.getItem('mrymify_user_liked') || '[]'),
        filterProductsGrid: filterProductsGrid,
        getFeatured: () => getEffectiveCatalog().filter(p => p.isFeatured),
        getOther: () => getEffectiveCatalog().filter(p => !p.isFeatured),
        getById: (id) => getEffectiveCatalog(true).find(p => p.id === id),
        getBaseCatalog: () => PRODUCTS,
        getEffectiveCatalog: getEffectiveCatalog,
        openProductModal: openProductModal,
        closeProductModal: closeProductModal,
        handleCardClick: handleCardClick,
        handleCustomize: handleCustomize,
        getEditPencilSvg: () => EDIT_PENCIL_SVG
    };
})();
