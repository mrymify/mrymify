/**
 * Mrymify - Custom Orders & Personalization Studio Scripts (js/custom-orders.js)
 * Handles color swatch selection, addon options, FAQ accordions, and WhatsApp quote dispatch.
 */

(function () {
    'use strict';

    const WHATSAPP_PHONE = '923000896885';
    let selectedColorPalette = 'Custom / Open to Suggestions';

    document.addEventListener('DOMContentLoaded', function () {
        initColorSwatches();
        initCustomOrderForm();
        initFaqAccordion();
    });

    /**
     * Initializes interactive color palette chips
     */
    function initColorSwatches() {
        const chips = document.querySelectorAll('.swatch-chip');
        const customColorInput = document.getElementById('custom-color-input');

        chips.forEach(chip => {
            chip.addEventListener('click', function () {
                chips.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                selectedColorPalette = this.getAttribute('data-palette') || this.textContent.trim();

                if (customColorInput) {
                    if (selectedColorPalette.toLowerCase().includes('custom')) {
                        customColorInput.focus();
                    }
                }
            });
        });
    }

    /**
     * Initializes the Custom Commission Form
     */
    function initCustomOrderForm() {
        const form = document.getElementById('custom-order-builder-form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = (document.getElementById('co-name')?.value || '').trim();
            const phone = (document.getElementById('co-phone')?.value || '').trim();
            const category = document.getElementById('co-category')?.value || 'Amigurumi & Plushies';
            const customColors = (document.getElementById('custom-color-input')?.value || '').trim();
            const neededBy = (document.getElementById('co-date')?.value || '').trim();
            const details = (document.getElementById('co-details')?.value || '').trim();

            // Collect selected addons
            const selectedAddons = [];
            document.querySelectorAll('input[name="co-addons"]:checked').forEach(cb => {
                selectedAddons.push(cb.value);
            });

            if (!name) {
                alert('Please enter your name.');
                return;
            }
            if (!details) {
                alert('Please provide a brief description of what you would like handcrafted.');
                return;
            }

            // Build structured message for Mariyam
            const finalColorDesc = customColors ? `${selectedColorPalette} (${customColors})` : selectedColorPalette;
            const addonsText = selectedAddons.length > 0 ? selectedAddons.join(', ') : 'None requested';

            const waMessage = `🌸 *CUSTOM CROCHET COMMISSION INQUIRY*\n\n` +
                              `👤 *Client Name:* ${name}\n` +
                              `📞 *WhatsApp / Phone:* ${phone || 'Not specified'}\n` +
                              `🧶 *Piece Category:* ${category}\n` +
                              `🎨 *Color Palette:* ${finalColorDesc}\n` +
                              `✨ *Special Personalization / Add-ons:* ${addonsText}\n` +
                              `📅 *Estimated Needed-By Date:* ${neededBy || 'Flexible / As soon as crafted'}\n\n` +
                              `📝 *Design Details & Notes:*\n${details}\n\n` +
                              `---\n_Sent via Mrymify Custom Orders Studio_ ✨`;

            const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMessage)}`;
            window.open(waUrl, '_blank', 'noopener,noreferrer');
        });
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
