/**
 * cart.js — Shared cart drawer for CheapALot
 * Manages cart state via localStorage, renders slide-in drawer.
 * Checkout compiles items into WhatsApp message or email draft.
 */
(function() {
    'use strict';

    var STORAGE_KEY = 'cheapalot_cart';
    var WA_NUMBER = '8613367494665';
    var EMAIL = 'dscaro88@gmail.com';

    function load() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch(e) {
            return [];
        }
    }

    function save(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch(e) {}
    }

    function updateCount() {
        var items = load();
        var total = items.reduce(function(s, i) { return s + i.qty; }, 0);
        var els = document.querySelectorAll('#cartCount');
        els.forEach(function(el) { el.textContent = total; });
    }

    function render() {
        var items = load();
        var container = document.getElementById('cartItems');
        var footer = document.getElementById('cartFooter');

        if (!container) return;

        if (items.length === 0) {
            container.innerHTML =
                '<div class="cart-empty">' +
                '<p style="font-size:48px;margin-bottom:12px;">🛒</p>' +
                '<p>Your cart is empty</p>' +
                '<p style="font-size:13px;margin-top:8px;">Add products to request a bulk quote</p>' +
                '</div>';
            if (footer) footer.style.display = 'none';
            return;
        }

        var html = items.map(function(item, idx) {
            return '<div class="cart-item">' +
                '<img src="' + item.image + '" alt="">' +
                '<div class="cart-item-info">' +
                '  <h4>' + escapeHtml(item.name) + '</h4>' +
                '  <div class="sku">' + escapeHtml(item.sku) + (item.variant ? ' · ' + escapeHtml(item.variant) : '') + '</div>' +
                '  <div class="price">' + escapeHtml(item.priceDisplay) + '</div>' +
                '  <div class="cart-item-qty">' +
                '    <button onclick="cart.changeQty(' + idx + ', -1)">−</button>' +
                '    <span>' + item.qty + '</span>' +
                '    <button onclick="cart.changeQty(' + idx + ', 1)">+</button>' +
                '  </div>' +
                '</div>' +
                '<button class="cart-item-remove" onclick="cart.remove(' + idx + ')" title="Remove">&times;</button>' +
                '</div>';
        }).join('');

        container.innerHTML = html;

        // Total
        var total = items.reduce(function(s, i) {
            return s + (i.price * i.qty);
        }, 0);

        var totalEl = document.getElementById('cartTotal');
        if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
        if (footer) footer.style.display = 'block';
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
    }

    var cart = {
        add: function(product, qty, variant) {
            var items = load();
            qty = qty || 1;
            variant = variant || '';

            // Check if already in cart (same SKU + variant)
            var existing = items.filter(function(i) {
                return i.sku === product.sku && i.variant === variant;
            })[0];

            if (existing) {
                existing.qty += qty;
            } else {
                items.push({
                    sku: product.sku,
                    name: product.name.en || product.name,
                    price: product.price,
                    priceDisplay: product.price_display || ('$' + product.price.toFixed(2)),
                    image: product.image,
                    qty: qty,
                    variant: variant,
                    inspiredBy: product.inspired_by || '',
                    moq: product.moq || 1
                });
            }

            save(items);
            updateCount();
            render();
            this.open();
        },

        remove: function(idx) {
            var items = load();
            items.splice(idx, 1);
            save(items);
            updateCount();
            render();
        },

        changeQty: function(idx, delta) {
            var items = load();
            if (!items[idx]) return;
            items[idx].qty += delta;
            if (items[idx].qty < 1) {
                items.splice(idx, 1);
            }
            save(items);
            updateCount();
            render();
        },

        open: function() {
            var drawer = document.getElementById('cartDrawer');
            var overlay = document.getElementById('cartOverlay');
            if (drawer) drawer.classList.add('open');
            if (overlay) overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            render();
        },

        close: function() {
            var drawer = document.getElementById('cartDrawer');
            var overlay = document.getElementById('cartOverlay');
            if (drawer) drawer.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            document.body.style.overflow = '';
        },

        checkoutWhatsApp: function() {
            var items = load();
            if (items.length === 0) return;

            var msg = 'Hello CheapALot, I would like to order:\n\n';
            var total = 0;

            items.forEach(function(item, i) {
                msg += (i + 1) + '. ' + item.name + '\n';
                msg += '   SKU: ' + item.sku;
                if (item.variant) msg += ' · ' + item.variant;
                msg += '\n';
                msg += '   Qty: ' + item.qty + ' pcs\n';
                msg += '   Price: ' + item.priceDisplay + item.qty + ' = $' + (item.price * item.qty).toFixed(2) + '\n';
                if (item.inspiredBy) msg += '   Design: ' + item.inspiredBy + '\n';
                msg += '\n';
                total += item.price * item.qty;
            });

            msg += 'Estimated Total: $' + total.toFixed(2) + '\n\n';
            msg += 'Please confirm availability, final pricing, and shipping to my destination.';

            var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
            window.open(url, '_blank');
        },

        checkoutEmail: function() {
            var items = load();
            if (items.length === 0) return;

            var subject = 'Bulk Quote Request — ' + items.length + ' item(s)';
            var body = 'Hello CheapALot,\n\nI would like to request a bulk quote for the following items:\n\n';

            var total = 0;
            items.forEach(function(item, i) {
                body += (i + 1) + '. ' + item.name + ' (SKU: ' + item.sku + ')\n';
                body += '   Qty: ' + item.qty + ' pcs\n';
                body += '   Unit Price: ' + item.priceDisplay + '\n';
                if (item.inspiredBy) body += '   Design: ' + item.inspiredBy + '\n';
                body += '\n';
                total += item.price * item.qty;
            });

            body += 'Estimated Total: $' + total.toFixed(2) + '\n\n';
            body += 'Shipping destination: \n';
            body += 'Company name: \n';
            body += 'Contact: \n';

            var url = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
            window.location.href = url;
        },

        getCount: function() {
            var items = load();
            return items.reduce(function(s, i) { return s + i.qty; }, 0);
        }
    };

    // Expose globally
    window.cart = cart;

    // Init on load
    document.addEventListener('DOMContentLoaded', function() {
        updateCount();
        render();
    });
})();
