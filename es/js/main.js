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

// Form submission
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = '\u2713 SUBMITTED \u2014 WE\'LL CONTACT YOU WITHIN 24H';
        btn.style.background = '#2d7a2d';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
            form.reset();
        }, 4000);
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

// Countdown timers for scarcity tags
(function initCountdowns() {
    const countdowns = document.querySelectorAll('.countdown');
    if (!countdowns.length) return;

    function update() {
        const now = Date.now();
        countdowns.forEach(el => {
            const days = parseInt(el.dataset.deadline || '1', 10);
            if (!el.dataset.targetTime) {
                const end = Date.now() + days * 86400000 + Math.floor(Math.random() * 36000000);
                el.dataset.targetTime = end;
            }
            const remaining = parseInt(el.dataset.targetTime, 10) - now;
            if (remaining <= 0) {
                el.textContent = 'ENDED';
                el.style.color = '#9ca3af';
                return;
            }
            const d = Math.floor(remaining / 86400000);
            const h = Math.floor((remaining % 86400000) / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            el.textContent = d + 'd ' + h + 'h ' + m + 'm';
        });
    }
    update();
    setInterval(update, 60000);
})();

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

// Inquiry form submission
const inquiryForm = document.getElementById('quickInquiryForm');
if (inquiryForm) {
    inquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = inquiryForm.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.textContent = '\u2713 SENT \u2014 WE\'LL RESPOND WITHIN 24H';
        btn.style.background = '#2d7a2d';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.disabled = false;
            inquiryForm.reset();
        }, 5000);
    });
}

// Sourcing request form submission
const sourcingForm = document.getElementById('sourcingRequestForm');
if (sourcingForm) {
    sourcingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = sourcingForm.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.textContent = '\u2713 SUBMITTED \u2014 WE\'LL CONTACT YOU WITHIN 48H';
        btn.style.background = '#2d7a2d';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.disabled = false;
            sourcingForm.reset();
        }, 5000);
    });
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

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.textContent = '\u2713 YOU\'RE IN! CHECK YOUR INBOX';
            btn.style.background = '#2d7a2d';
            setTimeout(() => {
                popup.classList.remove('active');
                form.reset();
            }, 2000);
        });
    }

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
