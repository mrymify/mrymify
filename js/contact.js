/**
 * Mrymify - Contact & Custom Order Page Scripts (js/contact.js)
 * Manages dynamic, context-specific inquiry forms, tailored WhatsApp routing,
 * email fallback, and FAQ accordion.
 */

(function () {
    'use strict';

    const WHATSAPP_NUMBER = '923000896885';
    const EMAIL_ADDRESS = 'mrymify9@gmail.com';

    document.addEventListener('DOMContentLoaded', function () {
        initContactForm();
        initFaqAccordion();
    });

    /**
     * Initializes the smart dynamic contact form
     */
    function initContactForm() {
        const form = document.getElementById('contact-custom-form');
        const alertBox = document.getElementById('form-status-alert');
        const emailBtn = document.getElementById('btn-send-email');
        const purposeSelect = document.getElementById('contact-purpose');

        if (!form || !purposeSelect) return;

        // Form DOM references for dynamic context updates
        const badgeEl = document.getElementById('form-badge');
        const headingEl = document.getElementById('form-heading');
        const subheadingEl = document.getElementById('form-subheading');

        const wrapItem = document.getElementById('field-wrap-item');
        const labelItem = document.getElementById('label-contact-item');
        const inputItem = document.getElementById('contact-item');
        const hintItem = document.getElementById('hint-contact-item');

        const wrapColors = document.getElementById('field-wrap-colors');
        const inputColors = document.getElementById('contact-colors');

        const wrapTracking = document.getElementById('field-wrap-tracking');
        const inputOrderRef = document.getElementById('contact-order-ref');
        const inputCity = document.getElementById('contact-delivery-city');

        const wrapSupportTopic = document.getElementById('field-wrap-support-topic');
        const selectSupportTopic = document.getElementById('contact-support-topic');

        const wrapBulk = document.getElementById('field-wrap-bulk-details');
        const inputBulkQty = document.getElementById('contact-bulk-qty');
        const inputEventType = document.getElementById('contact-event-type');

        const labelMessage = document.getElementById('label-contact-message');
        const inputMessage = document.getElementById('contact-message');
        const btnSubmitText = document.getElementById('btn-submit-text');

        /**
         * Dynamically adjusts form fields and instructions based on inquiry type
         */
        function updateInquiryFields(purpose) {
            // Helper to toggle wrapper visibility with smooth entrance animation
            function setFieldVisibility(el, isVisible) {
                if (!el) return;
                if (isVisible) {
                    el.style.display = el.classList.contains('form-row-2') ? 'grid' : 'block';
                    el.classList.remove('field-fade-in');
                    // Trigger reflow to restart fade-in
                    void el.offsetWidth;
                    el.classList.add('field-fade-in');
                } else {
                    el.style.display = 'none';
                    el.classList.remove('field-fade-in');
                }
            }

            switch (purpose) {
                case 'tracking':
                    // Order Status & Delivery Check
                    if (badgeEl) badgeEl.textContent = '📦 Order Tracking';
                    if (headingEl) headingEl.textContent = 'Track Your Mrymify Order';
                    if (subheadingEl) {
                        subheadingEl.innerHTML = 'Enter your Order Reference ID or phone number below to receive an instant delivery & dispatch update from <strong>Mariyam</strong>.';
                    }

                    // Fields: Show Order Reference & City; Hide Item & Colors & Support & Bulk
                    setFieldVisibility(wrapItem, false);
                    if (inputItem) inputItem.required = false;

                    setFieldVisibility(wrapColors, false);

                    setFieldVisibility(wrapTracking, true);
                    if (inputOrderRef) inputOrderRef.required = true;

                    setFieldVisibility(wrapSupportTopic, false);
                    setFieldVisibility(wrapBulk, false);
                    if (inputBulkQty) inputBulkQty.required = false;

                    if (labelMessage) labelMessage.textContent = 'Tracking Query / Delivery Notes';
                    if (inputMessage) {
                        inputMessage.placeholder = 'e.g. Need courier tracking number, update delivery address, or check dispatch date...';
                        inputMessage.required = false;
                    }
                    if (btnSubmitText) btnSubmitText.textContent = 'Check Order Status via WhatsApp 📦';
                    break;

                case 'support':
                    // Customer Care & General Inquiry
                    if (badgeEl) badgeEl.textContent = '💡 Help & Support';
                    if (headingEl) headingEl.textContent = 'Customer Care & Product Inquiry';
                    if (subheadingEl) {
                        subheadingEl.innerHTML = 'Have questions regarding crochet care, sizing, gift packaging, or payments? <strong>Mariyam</strong> is here to help!';
                    }

                    // Fields: Show Support Topic; Hide Item & Colors & Tracking & Bulk
                    setFieldVisibility(wrapItem, false);
                    if (inputItem) inputItem.required = false;

                    setFieldVisibility(wrapColors, false);
                    setFieldVisibility(wrapTracking, false);
                    if (inputOrderRef) inputOrderRef.required = false;

                    setFieldVisibility(wrapSupportTopic, true);

                    setFieldVisibility(wrapBulk, false);
                    if (inputBulkQty) inputBulkQty.required = false;

                    if (labelMessage) labelMessage.textContent = 'Question / Inquiry Details *';
                    if (inputMessage) {
                        inputMessage.placeholder = 'Please explain your question or what you need assistance with...';
                        inputMessage.required = true;
                    }
                    if (btnSubmitText) btnSubmitText.textContent = 'Ask Mariyam on WhatsApp 💡';
                    break;

                case 'bulk':
                    // Bulk Favors / Event Gifts
                    if (badgeEl) badgeEl.textContent = '🎉 Event & Bulk Favors';
                    if (headingEl) headingEl.textContent = 'Bulk Favor & Event Commission';
                    if (subheadingEl) {
                        subheadingEl.innerHTML = 'Planning a wedding, bridal shower, baby announcement, or corporate event? Our boutique studio will craft handmade favors in quantity.';
                    }

                    // Fields: Show Item (labeled for favors) & Bulk Details; Hide Colors & Tracking & Support
                    setFieldVisibility(wrapItem, true);
                    if (labelItem) labelItem.textContent = 'Favor Item of Interest *';
                    if (inputItem) {
                        inputItem.placeholder = 'e.g. Mini Flower Pots, Daisy Keychains, Bookmark Favors';
                        inputItem.required = true;
                    }
                    if (hintItem) hintItem.textContent = 'Tell us which handcrafted items you are interested in ordering in bulk.';

                    setFieldVisibility(wrapColors, false);
                    setFieldVisibility(wrapTracking, false);
                    if (inputOrderRef) inputOrderRef.required = false;

                    setFieldVisibility(wrapSupportTopic, false);

                    setFieldVisibility(wrapBulk, true);
                    if (inputBulkQty) inputBulkQty.required = true;

                    if (labelMessage) labelMessage.textContent = 'Event Theme & Special Packaging Notes *';
                    if (inputMessage) {
                        inputMessage.placeholder = 'Tell us your color palette, custom thank-you tag wording, ribbon preferences, or event date...';
                        inputMessage.required = true;
                    }
                    if (btnSubmitText) btnSubmitText.textContent = 'Request Bulk Favor Quote via WhatsApp 🎉';
                    break;

                case 'custom':
                default:
                    // Custom Crochet Commission
                    if (badgeEl) badgeEl.textContent = '🧶 Custom Commission';
                    if (headingEl) headingEl.textContent = 'Send a Custom Request';
                    if (subheadingEl) {
                        subheadingEl.innerHTML = 'Share your dream crochet ideas with <strong>Mariyam</strong>! We will craft it stitch-by-stitch with premium yarn.';
                    }

                    // Fields: Show Item & Color Preferences; Hide Tracking & Support & Bulk
                    setFieldVisibility(wrapItem, true);
                    if (labelItem) labelItem.textContent = 'Item or Category *';
                    if (inputItem) {
                        inputItem.placeholder = 'e.g. Baby Panda Plushie, Tulip Bouquet, Custom Cardigan';
                        inputItem.required = true;
                    }
                    if (hintItem) hintItem.textContent = 'Specify what you would like handcrafted or customized.';

                    setFieldVisibility(wrapColors, true);

                    setFieldVisibility(wrapTracking, false);
                    if (inputOrderRef) inputOrderRef.required = false;

                    setFieldVisibility(wrapSupportTopic, false);
                    setFieldVisibility(wrapBulk, false);
                    if (inputBulkQty) inputBulkQty.required = false;

                    if (labelMessage) labelMessage.textContent = 'Design Details & Requirements *';
                    if (inputMessage) {
                        inputMessage.placeholder = 'Tell us about size requirements, reference ideas, or your specific requests...';
                        inputMessage.required = true;
                    }
                    if (btnSubmitText) btnSubmitText.textContent = 'Send Custom Request via WhatsApp 💬';
                    break;
            }
        }

        // Listen for inquiry purpose changes
        purposeSelect.addEventListener('change', function () {
            updateInquiryFields(this.value);
        });

        // Check URL query parameters on page load (e.g. contact.html?purpose=tracking)
        const urlParams = new URLSearchParams(window.location.search);
        const queryPurpose = urlParams.get('purpose');
        const queryItem = urlParams.get('item');

        if (queryPurpose && ['custom', 'tracking', 'support', 'bulk'].includes(queryPurpose)) {
            purposeSelect.value = queryPurpose;
        }
        if (queryItem && inputItem) {
            inputItem.value = queryItem;
        }

        // Initialize active fields immediately
        updateInquiryFields(purposeSelect.value);

        // WhatsApp submission handler
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = (document.getElementById('contact-name')?.value || '').trim();
            const phone = (document.getElementById('contact-phone')?.value || '').trim();
            const purpose = purposeSelect.value;
            const message = (inputMessage?.value || '').trim();

            if (!name) {
                showFeedback('Please provide your name.', false);
                return;
            }

            let text = '';

            if (purpose === 'tracking') {
                const orderRef = (inputOrderRef?.value || '').trim();
                const city = (inputCity?.value || '').trim();

                if (!orderRef) {
                    showFeedback('Please enter your Order Reference Number or Checkout Phone.', false);
                    if (inputOrderRef) inputOrderRef.focus();
                    return;
                }

                text = `Hello Mariyam! I need help checking my Mrymify order status.\n\n` +
                       `*Customer Name:* ${name}\n` +
                       (phone ? `*Phone/WhatsApp:* ${phone}\n` : '') +
                       `*Order Reference / ID:* ${orderRef}\n` +
                       (city ? `*Delivery City:* ${city}\n` : '') +
                       (message ? `*Notes/Query:* ${message}\n` : '') +
                       `\nLooking forward to your update!`;

            } else if (purpose === 'support') {
                const topic = selectSupportTopic ? selectSupportTopic.value : 'General Assistance';

                if (!message) {
                    showFeedback('Please describe what you need assistance with.', false);
                    if (inputMessage) inputMessage.focus();
                    return;
                }

                text = `Hello Mariyam! I need help with an inquiry about Mrymify.\n\n` +
                       `*Customer Name:* ${name}\n` +
                       (phone ? `*Phone/WhatsApp:* ${phone}\n` : '') +
                       `*Inquiry Topic:* ${topic}\n` +
                       `*Question Details:* ${message}`;

            } else if (purpose === 'bulk') {
                const item = (inputItem?.value || '').trim();
                const bulkQty = (inputBulkQty?.value || '').trim();
                const eventType = (inputEventType?.value || '').trim();

                if (!item || !bulkQty) {
                    showFeedback('Please provide the favor item and estimated quantity.', false);
                    return;
                }

                text = `Hello Mariyam! I would like to inquire about a bulk favor / event gift order with Mrymify.\n\n` +
                       `*Customer Name:* ${name}\n` +
                       (phone ? `*Phone/WhatsApp:* ${phone}\n` : '') +
                       `*Favor Item:* ${item}\n` +
                       `*Estimated Quantity:* ${bulkQty}\n` +
                       (eventType ? `*Event Type & Target Date:* ${eventType}\n` : '') +
                       (message ? `*Theme & Special Notes:* ${message}\n` : '');

            } else {
                // Custom commission
                const item = (inputItem?.value || '').trim();
                const colors = (inputColors?.value || '').trim();

                if (!item) {
                    showFeedback('Please specify the crochet item you would like crafted.', false);
                    if (inputItem) inputItem.focus();
                    return;
                }
                if (!message) {
                    showFeedback('Please provide some details about size, design, or references.', false);
                    if (inputMessage) inputMessage.focus();
                    return;
                }

                text = `Hello Mariyam! I want to order a custom handcrafted crochet piece from Mrymify.\n\n` +
                       `*Customer Name:* ${name}\n` +
                       (phone ? `*Phone/WhatsApp:* ${phone}\n` : '') +
                       `*Desired Piece:* ${item}\n` +
                       (colors ? `*Color Preferences / Notes:* ${colors}\n` : '') +
                       `*Design & Size Details:* ${message}`;
            }

            const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

            showFeedback(`Opening WhatsApp with your tailored inquiry for Mariyam... ✨`, true);

            setTimeout(function () {
                window.open(waUrl, '_blank', 'noopener,noreferrer');
            }, 600);
        });

        // Email submission fallback handler
        if (emailBtn) {
            emailBtn.addEventListener('click', function () {
                const name = (document.getElementById('contact-name')?.value || '').trim();
                const purpose = purposeSelect.value;
                const message = (inputMessage?.value || '').trim();

                let subject = '';
                let body = `Hi Mariyam,\n\nName: ${name || 'Customer'}\nInquiry Type: ${purpose}\n\n`;

                if (purpose === 'tracking') {
                    const orderRef = (inputOrderRef?.value || '').trim();
                    const city = (inputCity?.value || '').trim();
                    subject = `Order Status Inquiry - ${orderRef || 'Mrymify Customer'}`;
                    body += `Order Reference: ${orderRef}\nDelivery City: ${city}\nDetails:\n${message}\n`;
                } else if (purpose === 'support') {
                    const topic = selectSupportTopic ? selectSupportTopic.value : 'Customer Support';
                    subject = `Customer Support: ${topic} - ${name || 'Customer'}`;
                    body += `Topic: ${topic}\nDetails:\n${message}\n`;
                } else if (purpose === 'bulk') {
                    const item = (inputItem?.value || '').trim();
                    const bulkQty = (inputBulkQty?.value || '').trim();
                    subject = `Bulk Favor Order Inquiry - ${item || 'Special Event'} (${name || 'Customer'})`;
                    body += `Favor Item: ${item}\nQuantity: ${bulkQty}\nDetails:\n${message}\n`;
                } else {
                    const item = (inputItem?.value || '').trim();
                    const colors = (inputColors?.value || '').trim();
                    subject = `Custom Crochet Commission - ${item || 'Handmade Piece'} (${name || 'Customer'})`;
                    body += `Desired Piece: ${item}\nColor Preferences: ${colors}\nDetails:\n${message}\n`;
                }

                body += `\nSent via Mrymify Boutique Contact Form`;

                window.location.href = `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            });
        }

        function showFeedback(msg, isSuccess) {
            if (!alertBox) return;
            alertBox.textContent = msg;
            alertBox.className = 'form-status-alert ' + (isSuccess ? 'success' : '');
            alertBox.style.display = 'block';
            if (!isSuccess) {
                alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    /**
     * FAQ Accordion Interaction
     */
    function initFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(function (item) {
            const btn = item.querySelector('.faq-question-btn');
            if (!btn) return;

            btn.addEventListener('click', function () {
                const isActive = item.classList.contains('active');

                // Close other open items
                faqItems.forEach(function (other) {
                    other.classList.remove('active');
                });

                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }
})();
