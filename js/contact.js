/**
 * Mrymify - Customer Care & Help Support Page Scripts (js/contact.js)
 * Dedicated solely to customer support, order tracking, sizing, and help desk inquiries.
 */

(function () {
    'use strict';

    const WHATSAPP_NUMBER = '923000896885';
    const EMAIL_ADDRESS = 'mrymify9@gmail.com';

    document.addEventListener('DOMContentLoaded', function () {
        // 1. Mount Navigation & Footer Components
        if (window.MrymifyNavbar && typeof window.MrymifyNavbar.render === 'function') {
            window.MrymifyNavbar.render('contact');
        }
        if (window.MrymifyFooter && typeof window.MrymifyFooter.render === 'function') {
            window.MrymifyFooter.render();
        }

        // 2. Initialize Help Desk Form & FAQs
        initContactForm();
        initFaqAccordion();
    });

    /**
     * Initializes the support & help desk inquiry form
     */
    function initContactForm() {
        const form = document.getElementById('contact-custom-form');
        const alertBox = document.getElementById('form-status-alert');
        const emailBtn = document.getElementById('btn-send-email');
        const purposeSelect = document.getElementById('contact-purpose');
        const inputOrderRef = document.getElementById('contact-order-ref');
        const inputCity = document.getElementById('contact-delivery-city');
        const inputMessage = document.getElementById('contact-message');

        if (!form || !purposeSelect) return;

        // Auto-focus or adjust hints based on topic change
        purposeSelect.addEventListener('change', function () {
            if (this.value === 'tracking' && inputOrderRef) {
                inputOrderRef.focus();
            }
        });

        // Check query parameters (e.g. contact.html?purpose=tracking)
        const urlParams = new URLSearchParams(window.location.search);
        const queryPurpose = urlParams.get('purpose');
        const queryRef = urlParams.get('ref');

        if (queryPurpose && ['tracking', 'sizing', 'care', 'delivery', 'payment', 'general'].includes(queryPurpose)) {
            purposeSelect.value = queryPurpose;
        }
        if (queryRef && inputOrderRef) {
            inputOrderRef.value = queryRef;
        }

        // WhatsApp submission handler
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = (document.getElementById('contact-name')?.value || '').trim();
            const phone = (document.getElementById('contact-phone')?.value || '').trim();
            const purposeKey = purposeSelect.value;
            const topicText = purposeSelect.options[purposeSelect.selectedIndex]?.text || purposeKey;
            const orderRef = (inputOrderRef?.value || '').trim();
            const city = (inputCity?.value || '').trim();
            const message = (inputMessage?.value || '').trim();

            if (!name) {
                showFeedback('Please enter your name.', false);
                return;
            }
            if (!message) {
                showFeedback('Please describe what you need assistance with.', false);
                if (inputMessage) inputMessage.focus();
                return;
            }

            // Build clear customer support WhatsApp message
            let waText = `💡 *MRYMIFY CUSTOMER HELP & SUPPORT*\n\n` +
                        `👤 *Customer Name:* ${name}\n` +
                        (phone ? `📞 *Phone/WhatsApp:* ${phone}\n` : '') +
                        `📋 *Inquiry Topic:* ${topicText}\n`;

            if (orderRef) {
                waText += `📦 *Order Reference / ID:* ${orderRef}\n`;
            }
            if (city) {
                waText += `📍 *Delivery City:* ${city}\n`;
            }

            waText += `\n💬 *Question / Query Details:*\n${message}\n\n` +
                      `---\n_Sent via Mrymify Help Desk_ ✨`;

            const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

            showFeedback(`Opening WhatsApp to connect directly with Mariyam... ✨`, true);

            setTimeout(function () {
                window.open(waUrl, '_blank', 'noopener,noreferrer');
            }, 600);
        });

        // Email fallback handler
        if (emailBtn) {
            emailBtn.addEventListener('click', function () {
                const name = (document.getElementById('contact-name')?.value || '').trim();
                const phone = (document.getElementById('contact-phone')?.value || '').trim();
                const purposeKey = purposeSelect.value;
                const topicText = purposeSelect.options[purposeSelect.selectedIndex]?.text || purposeKey;
                const orderRef = (inputOrderRef?.value || '').trim();
                const city = (inputCity?.value || '').trim();
                const message = (inputMessage?.value || '').trim();

                const subject = `Mrymify Support: ${topicText} (${name || 'Customer'})`;
                let body = `Hello Mariyam,\n\nI have a support question regarding Mrymify.\n\n` +
                           `Customer Name: ${name || 'Customer'}\n` +
                           (phone ? `Phone: ${phone}\n` : '') +
                           `Topic: ${topicText}\n`;

                if (orderRef) body += `Order Reference: ${orderRef}\n`;
                if (city) body += `Delivery City: ${city}\n`;

                body += `\nQuery Details:\n${message || 'N/A'}\n\nThank you!`;

                const mailtoUrl = `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailtoUrl;
            });
        }

        function showFeedback(text, isSuccess) {
            if (!alertBox) {
                alert(text);
                return;
            }
            alertBox.className = 'form-status-alert ' + (isSuccess ? 'alert-success' : 'alert-error');
            alertBox.textContent = text;
            alertBox.style.display = 'block';
            alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Initializes Contact page FAQ accordion
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
