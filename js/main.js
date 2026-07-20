// CheapALot - Yiwu Sourcing Agent & Wholesale Clearance Platform
// cheapalot.com | Based in Yiwu · 20+ Years Export · A Lot of Stock. A Lot Cheap.

// Mobile nav toggle (hamburger)
const navToggle = document.querySelector('.nav-toggle');
const mainNav   = document.getElementById('mainNav');
if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('open');
        navToggle.classList.toggle('active', isOpen);
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // Close drawer when a nav link is tapped
    mainNav.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mainNav.classList.remove('open');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (mainNav.classList.contains('open') &&
            !mainNav.contains(e.target) &&
            !navToggle.contains(e.target)) {
            mainNav.classList.remove('open');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    });
}

// Sticky quick nav bar (appears when hero scrolls out)
const stickyBar = document.getElementById('sticky-bar');
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (stickyBar) {
        if (currentScroll > 600) {
            stickyBar.classList.add('is-visible');
        } else {
            stickyBar.classList.remove('is-visible');
        }
    }
});

// Sticky header on scroll
let lastScroll = 0;
const header = document.querySelector('.main-header');
const nav = document.querySelector('.main-nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 100) {
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '1000';
        header.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)';
    } else {
        header.style.position = '';
        header.style.boxShadow = '';
    }
    lastScroll = currentScroll;
});

// Formspree submission — keep the existing UI, but only show success after delivery.
document.querySelectorAll('form[action^="https://formspree.io/"]').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        if (!btn || btn.disabled) return;
        const originalText = btn.textContent;
        btn.textContent = 'SENDING...';
        btn.disabled = true;

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error('Form delivery failed');

            btn.textContent = '\u2713 SUBMITTED \u2014 WE\'LL CONTACT YOU SOON';
            btn.style.background = '#2d7a2d';
            form.reset();

            if (form.id === 'exitPopupForm') {
                const popup = document.getElementById('exitPopup');
                setTimeout(() => popup && popup.classList.remove('active'), 1600);
            }
        } catch (error) {
            btn.textContent = 'SEND FAILED \u2014 TRY WHATSAPP OR EMAIL';
            btn.style.background = '#9f1d1d';
        }

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 5000);
    });
});

// Search functionality
document.querySelectorAll('.header-search input').forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = input.value.trim();
            if (query) {
                window.location.href = `products.html?search=${encodeURIComponent(query)}`;
            }
        }
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#' || href.length <= 1) return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const offset = 140;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
        const item = q.parentElement;
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });
});

// Live World Clock — 5 time zones, updates every second
(function initWorldClock() {
    const cards = document.querySelectorAll('.clock-card');
    if (!cards.length) return;

    const statusTexts = {
        business: 'Office Hours',
        online: 'Online Replies',
        sleep: 'Sleeping'
    };

    function getStatus(hour) {
        if (hour >= 8 && hour < 17) return 'business';
        if (hour >= 17 && hour < 22) return 'online';
        return 'sleep';
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    function update() {
        const now = new Date();
        cards.forEach(card => {
            const tz = card.dataset.tz;
            if (!tz || typeof Intl === 'undefined') return;
            const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz };
            const timeStr = new Intl.DateTimeFormat('en-GB', options).format(now);
            const dateOptions = { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz };
            const dateStr = new Intl.DateTimeFormat('en-GB', dateOptions).format(now);
            // Get hour for status
            const hourOptions = { hour: '2-digit', hour12: false, timeZone: tz };
            const hourStr = new Intl.DateTimeFormat('en-GB', hourOptions).format(now);
            const hour = parseInt(hourStr, 10);
            const status = getStatus(hour);

            const timeEl = card.querySelector('[data-time]');
            const dateEl = card.querySelector('[data-date]');
            const statusEl = card.querySelector('.clock-status');
            if (timeEl) timeEl.textContent = timeStr;
            if (dateEl) dateEl.textContent = dateStr;
            if (statusEl) {
                statusEl.className = 'clock-status status-' + status;
                statusEl.textContent = statusTexts[status];
            }
            card.classList.toggle('is-open', status === 'business');
        });
    }
    update();
    setInterval(update, 1000);
})();

// Console branding
console.log('%cCheapALot', 'color:#E30613;font-size:28px;font-weight:bold;font-family:Bebas Neue, sans-serif');
console.log('%cYiwu Sourcing Agent · 20+ Years Export · A Lot of Stock. A Lot Cheap.', 'color:#ffcd00;font-size:14px');
console.log('%chttps://cheapalot.com', 'color:#E30613;font-size:12px');

// Do not manufacture urgency from a browser timer. Keep the existing stock label styling.
document.querySelectorAll('.countdown').forEach(el => {
    const container = el.closest('.scarcity-text, .deal-stock-line');
    if (!container) return;
    const language = (document.documentElement.lang || 'en').slice(0, 2);
    container.textContent = language === 'es'
        ? 'Disponibilidad actual · Confirmar por cotización'
        : language === 'ar'
            ? 'التوفر الحالي · يُؤكد بعرض السعر'
            : 'Current availability · Confirm by quote';
});

// "Inquire Now" buttons — pre-fill product name in inquiry form
document.querySelectorAll('.btn-inquire').forEach(btn => {
    btn.addEventListener('click', () => {
        const productName = btn.dataset.product || '';
        const productField = document.getElementById('iq-product');
        if (productField && productName) {
            setTimeout(() => { productField.value = productName; }, 200);
        }
    });
});

// Preserve product context when a catalogue link opens the homepage inquiry form.
const requestedProduct = new URLSearchParams(window.location.search).get('product');
const requestedProductField = document.getElementById('iq-product');
if (requestedProduct && requestedProductField) {
    requestedProductField.value = requestedProduct.slice(0, 200);
}

// Exit intent popup
(function initExitPopup() {
    const popup = document.getElementById('exitPopup');
    const closeBtn = document.getElementById('exitPopupClose');
    const form = document.getElementById('exitPopupForm');
    if (!popup) return;

    let shown = false;

    document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 0 && !shown && !sessionStorage.getItem('exitPopupShown')) {
            popup.classList.add('active');
            shown = true;
            sessionStorage.setItem('exitPopupShown', '1');
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => popup.classList.remove('active'));
    }

    popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.classList.remove('active');
    });

    // Mobile: show on scroll up after scrolling down
    let lastScrollY = window.pageYOffset;
    let scrolledDown = false;
    window.addEventListener('scroll', () => {
        const currentY = window.pageYOffset;
        if (currentY > lastScrollY && currentY > 600) {
            scrolledDown = true;
        }
        if (currentY < lastScrollY && scrolledDown && !shown && !sessionStorage.getItem('exitPopupShown')) {
            popup.classList.add('active');
            shown = true;
            sessionStorage.setItem('exitPopupShown', '1');
            scrolledDown = false;
        }
        lastScrollY = currentY;
    }, { passive: true });
})();

// ─── Product Inquiry Pre-fill ───
// Called when "Add to Cart" or "View" button is clicked on product cards
// Pre-fills the inquiry form with product info and scrolls to it
function prefillInquiry(productName, price) {
    // Find the inquiry form
    const inquiryForm = document.getElementById('quickInquiryForm') ||
                        document.getElementById('inquiry-form');
    if (!inquiryForm) {
        // Fallback: find any form with class inquiry-form
        const form = document.querySelector('.inquiry-form');
        if (!form) return;
    }

    // Find the message/product field in the form
    const form = document.getElementById('quickInquiryForm') || document.querySelector('.inquiry-form');
    if (!form) return;

    // Look for a textarea or input for product/message
    let messageField = form.querySelector('textarea') ||
                       form.querySelector('input[name="iq-product"]') ||
                       form.querySelector('input[name="message"]') ||
                       form.querySelector('input[placeholder*="product"]') ||
                       form.querySelector('input[placeholder*="Product"]');

    // If no message field exists, try to find the notes/message field
    if (!messageField) {
        messageField = form.querySelector('input[name="iq-notes"]') ||
                       form.querySelector('textarea[name="message"]') ||
                       form.querySelector('input[name="message"]');
    }

    // Pre-fill the field
    if (messageField) {
        const message = `I'm interested in: ${productName} (${price}). Please send me pricing and availability.`;
        if (messageField.tagName === 'TEXTAREA') {
            messageField.value = message;
        } else {
            messageField.value = productName + ' (' + price + ')';
        }
        messageField.focus();
    }

    // Scroll to the form
    const formSection = form.closest('section') || form;
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Expose globally for inline onclick handlers
window.prefillInquiry = prefillInquiry;
