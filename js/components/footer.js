/**
 * Mrymify - Shared Footer Component
 * Renders the global responsive brand footer across all customer-facing pages.
 */

(function () {
    'use strict';

    function renderFooter() {
        const container = document.getElementById('footer-container');
        if (!container) return;

        const currentYear = new Date().getFullYear();

        container.innerHTML = `
            <footer class="site-footer" id="site-footer">
                <div class="container">
                    <div class="footer-grid">
                        <!-- Brand Column -->
                        <div class="footer-col footer-col-brand">
                            <div class="footer-logo">MRYM<span>IFY</span></div>
                            <p class="footer-about">
                                A boutique showcase of handcrafted crochet plushies, floral bouquets, wearables, and charming gifts. Each piece is crafted by hand with patience and care.
                            </p>
                            <span class="footer-badge-pill">
                                🧶 100% Handcrafted with Love
                            </span>
                        </div>

                        <!-- Shop Quick Links -->
                        <div class="footer-col">
                            <h4>Shop Categories</h4>
                            <ul class="footer-links">
                                <li><a href="shop.html" class="footer-link">All Products</a></li>
                                <li><a href="shop.html?category=amigurumi" class="footer-link">Amigurumi & Plushies</a></li>
                                <li><a href="shop.html?category=floral" class="footer-link">Floral Stems & Bouquets</a></li>
                                <li><a href="shop.html?category=wearables" class="footer-link">Bags & Wearables</a></li>
                                <li><a href="shop.html?category=keychains" class="footer-link">Keychains & Accessories</a></li>
                            </ul>
                        </div>

                        <!-- Company & Info -->
                        <div class="footer-col">
                            <h4>About & Help</h4>
                            <ul class="footer-links">
                                <li><a href="about.html" class="footer-link">About Mrymify</a></li>
                                <li><a href="contact.html" class="footer-link">Contact & Support</a></li>
                                <li><a href="about.html#custom-orders" class="footer-link">Custom Orders Guide</a></li>
                                <li><a href="about.html#care-guide" class="footer-link">Crochet Care Instructions</a></li>
                            </ul>
                        </div>

                        <!-- Customer Support & WhatsApp -->
                        <div class="footer-col">
                            <h4>Customer Care</h4>
                            <div class="footer-support-box">
                                <div class="footer-support-title">Mariyam • Care & Custom Orders</div>
                                <p class="footer-support-desc">
                                    Garden Town Phase 3, Gujranwala<br>
                                    <a href="mailto:mrymify9@gmail.com" style="color: #cbdad4; text-decoration: underline;">mrymify9@gmail.com</a>
                                </p>
                                <a href="https://wa.me/923000896885?text=Hello%20Mariyam!%20I%20need%20help%20about%20Mrymify%20handcrafted%20products." target="_blank" rel="noopener noreferrer" class="whatsapp-link" aria-label="Chat with Mariyam on WhatsApp">
                                    <span>💬 Chat: +92 300 0896885</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Social Links Row with @mrymify handles & official SVGs -->
                    <div style="display: flex; gap: 1.1rem; justify-content: center; align-items: center; flex-wrap: wrap; padding: 1.5rem 0 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.85rem;">
                        <span style="color: #cbdad4; font-weight: 600;">Connect:</span>
                        <a href="https://instagram.com/mrymify" target="_blank" rel="noopener noreferrer" style="color: #e5997b; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                            <span>Instagram (@mrymify)</span>
                        </a>
                        <span style="color: rgba(255,255,255,0.2);">•</span>
                        <a href="https://tiktok.com/@mrymify" target="_blank" rel="noopener noreferrer" style="color: #e5997b; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.32a6.34 6.34 0 0 0-.85-.06A6.33 6.33 0 0 0 3.15 15.6a6.33 6.33 0 0 0 8.74 5.86c3.48-1.55 4.31-4.75 4.31-7.85v-5a8.27 8.27 0 0 0 4.89 1.63v-3.55z"/></svg>
                            <span>TikTok (@mrymify)</span>
                        </a>
                        <span style="color: rgba(255,255,255,0.2);">•</span>
                        <a href="https://pinterest.com/mrymify" target="_blank" rel="noopener noreferrer" style="color: #e5997b; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.18c-.03-.94-.06-2.39.05-3.42l.78-3.32s-.2-.39-.2-.97c0-.91.53-1.59 1.18-1.59.56 0 .83.42.83.92 0 .56-.36 1.4-.54 2.18-.15.65.33 1.18.97 1.18 1.17 0 2.06-1.23 2.06-3.01 0-1.57-1.13-2.67-2.74-2.67-1.87 0-2.96 1.4-2.96 2.85 0 .56.22 1.17.49 1.5.05.07.06.13.04.2l-.19.78c-.03.12-.1.17-.23.11-1-.46-1.62-1.92-1.62-3.09 0-2.52 1.83-4.83 5.28-4.83 2.77 0 4.93 1.97 4.93 4.62 0 2.76-1.74 4.98-4.15 4.98-.81 0-1.57-.42-1.83-.92l-.5 1.9c-.18.7-.67 1.57-.99 2.1A12 12 0 1 0 12 0z"/></svg>
                            <span>Pinterest (@mrymify)</span>
                        </a>
                        <span style="color: rgba(255,255,255,0.2);">•</span>
                        <a href="https://facebook.com/mrymify" target="_blank" rel="noopener noreferrer" style="color: #e5997b; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            <span>Facebook (@mrymify)</span>
                        </a>
                        <span style="color: rgba(255,255,255,0.2);">•</span>
                        <a href="https://etsy.com/shop/mrymify" target="_blank" rel="noopener noreferrer" style="color: #e5997b; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8.27 2.25v2.54h2.51c1.33 0 1.63.4 1.63 1.48v11.46c0 1.08-.3 1.48-1.63 1.48H8.27v2.54h11.23v-5.26h-2.31c-.34 2.21-.99 2.72-2.88 2.72h-1.37v-4.83h1.8c1.37 0 1.77.34 1.93 1.65h2.17V8.97h-2.17c-.16 1.31-.56 1.65-1.93 1.65h-1.8V5.79h1.37c1.89 0 2.54.51 2.88 2.72h2.31V2.25H8.27z"/></svg>
                            <span>Etsy (@mrymify)</span>
                        </a>
                    </div>

                    <!-- Footer Bottom Bar -->
                    <div class="footer-bottom" style="border-top: none;">
                        <div class="footer-bottom-inner">
                            <p>© ${currentYear} Mrymify. All rights reserved. Handcrafted with heart.</p>
                            <div>
                                <a href="contact.html">Need help? Get in touch</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    // Auto-render footer immediately or when DOM content is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            renderFooter();
        });
    } else {
        renderFooter();
    }

    // Expose component API
    window.MrymifyFooter = {
        render: renderFooter
    };
})();
