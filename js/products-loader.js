/**
 * products-loader.js — Dynamic product loading from products.json
 * Replaces static HTML cards with dynamic fetch + render
 * Supports: filtering, search, sort, pagination
 */
(function() {
    'use strict';

    var PRODUCTS = [];
    var FILTERED = [];
    var LANG = (document.documentElement.lang || 'en').substring(0, 2);
    if (LANG !== 'es' && LANG !== 'ar') LANG = 'en';
    var PAGE = 1;
    var PER_PAGE = 60;

    function t(obj, field) {
        if (!obj) return '';
        return obj[field] || obj['en'] || '';
    }

    function tagLabel(tag) {
        var map = {
            'best_seller': { en: 'Best Seller', es: 'Más Vendido', ar: 'الأكثر مبيعاً' },
            'new': { en: 'New', es: 'Nuevo', ar: 'جديد' },
            'limited': { en: 'Limited', es: 'Limitado', ar: 'محدود' },
            'hot': { en: 'Hot', es: 'Popular', ar: 'رائج' },
            'sale': { en: 'Sale', es: 'Oferta', ar: 'تخفيض' }
        };
        var m = map[tag] || map['new'];
        return m[LANG] || m['en'];
    }

    function tagClass(tag) {
        var map = { 'best_seller': '', 'new': 'green', 'limited': 'orange', 'hot': 'red', 'sale': 'orange' };
        return map[tag] || '';
    }

    function stockLabel(status) {
        var map = {
            'in_stock': { en: '✓ In Stock', es: '✓ En Stock', ar: '✓ متوفر' },
            'limited': { en: '⚡ Limited', es: '⚡ Limitado', ar: '⚡ محدود' },
            'out_of_stock': { en: '✗ Sold Out', es: '✗ Agotado', ar: '✗ نفذ' }
        };
        var m = map[status] || map['in_stock'];
        return m[LANG] || m['en'];
    }

    function renderCard(p) {
        var name = t(p.name, LANG);
        var cat = t(p.category_display, LANG);
        var priceUnit = t(p.price_unit, LANG);
        var minOrder = t(p.min_order, LANG);
        var priceDisp = p.price_display || ('£' + p.price.toFixed(2));

        var tagHtml = p.tag ? '<span class="product-tag ' + tagClass(p.tag) + '">' + tagLabel(p.tag) + '</span>' : '';
        var imgStyle = p.image ? 'background-image: url(\'' + p.image + '\')' : 'background-image: url(\'images/placeholder.jpg\')';

        return '<div class="product-card" data-id="' + p.id + '" data-category="' + (p.category || '') + '" data-price="' + p.price + '" data-stock="' + (p.stock_status || 'in_stock') + '">' +
            '  <div class="product-img" style="' + imgStyle + '">' + tagHtml + '</div>' +
            '  <div class="product-body">' +
            '    <div class="product-cat">' + cat + '</div>' +
            '    <h3 class="product-title">' + name + '</h3>' +
            '    <div class="product-meta">' +
            '      <span>📦 Min: ' + minOrder + '</span>' +
            '      <span>' + stockLabel(p.stock_status) + '</span>' +
            '    </div>' +
            '    <div class="product-price">' + priceDisp + '<small>' + priceUnit + '</small></div>' +
            '    <div class="product-actions">' +
            '      <a href="#inquiry" class="btn btn-primary" onclick="prefillInquiry(\'' + name.replace(/'/g, "\\'") + '\', \'' + priceDisp + '\')">' +
            (LANG === 'es' ? 'Cotizar' : LANG === 'ar' ? 'استفسار' : 'Add to Cart') +
            '      </a>' +
            '      <a href="#inquiry" class="btn btn-outline">' +
            (LANG === 'es' ? 'Ver' : LANG === 'ar' ? 'عرض' : 'View') +
            '      </a>' +
            '    </div>' +
            '  </div>' +
            '</div>';
    }

    function render() {
        var grid = document.getElementById('productGrid');
        if (!grid) return;

        var start = (PAGE - 1) * PER_PAGE;
        var end = start + PER_PAGE;
        var html = '';
        for (var i = start; i < Math.min(end, FILTERED.length); i++) {
            html += renderCard(FILTERED[i]);
        }

        if (FILTERED.length === 0) {
            html = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#999;">' +
                (LANG === 'es' ? 'No se encontraron productos' : LANG === 'ar' ? 'لم يتم العثور على منتجات' : 'No products found') +
                '</div>';
        }

        grid.innerHTML = html;

        // Update info
        var info = document.querySelector('.toolbar-info');
        if (info) {
            var showing = Math.min(end, FILTERED.length);
            info.innerHTML = (LANG === 'es' ? 'Mostrando' : LANG === 'ar' ? 'عرض' : 'Showing') +
                ' <strong>' + (start + 1) + '-' + showing + '</strong> ' +
                (LANG === 'es' ? 'de' : LANG === 'ar' ? 'من' : 'of') +
                ' <strong>' + FILTERED.length + '</strong> ' +
                (LANG === 'es' ? 'productos' : LANG === 'ar' ? 'منتج' : 'products');
        }

        renderPagination();
    }

    function renderPagination() {
        var pages = Math.ceil(FILTERED.length / PER_PAGE);
        var container = document.getElementById('pagination');
        if (!container) return;

        var html = '';
        for (var i = 1; i <= Math.min(pages, 10); i++) {
            var cls = i === PAGE ? 'active' : '';
            html += '<button class="page-btn ' + cls + '" onclick="productsLoader.goPage(' + i + ')">' + i + '</button>';
        }
        if (pages > 10) {
            html += '<span>...</span>';
            html += '<button class="page-btn" onclick="productsLoader.goPage(' + pages + ')">' + pages + '</button>';
        }
        container.innerHTML = html;
    }

    function applyFilters() {
        FILTERED = PRODUCTS.slice();

        // Category filter
        var checkedCats = [];
        document.querySelectorAll('.filter-group input[type="checkbox"][data-category]').forEach(function(cb) {
            if (cb.checked) checkedCats.push(cb.dataset.category);
        });
        if (checkedCats.length > 0) {
            FILTERED = FILTERED.filter(function(p) {
                return checkedCats.indexOf(p.category) !== -1;
            });
        }

        // Search filter
        var params = new URLSearchParams(window.location.search);
        var search = params.get('search');
        if (search) {
            var q = search.toLowerCase();
            FILTERED = FILTERED.filter(function(p) {
                var name = t(p.name, LANG).toLowerCase();
                var cat = t(p.category_display, LANG).toLowerCase();
                return name.indexOf(q) !== -1 || cat.indexOf(q) !== -1;
            });
        }

        // Sort
        var sortSel = document.querySelector('.toolbar-sort select');
        if (sortSel) {
            var sortVal = sortSel.value;
            if (sortVal.indexOf('Price: Low') !== -1) {
                FILTERED.sort(function(a, b) { return a.price - b.price; });
            } else if (sortVal.indexOf('Price: High') !== -1) {
                FILTERED.sort(function(a, b) { return b.price - a.price; });
            }
        }

        PAGE = 1;
        render();
    }

    function goPage(n) {
        PAGE = n;
        render();
        var grid = document.getElementById('productGrid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function buildCategoryFilters() {
        var container = document.getElementById('categoryFilters');
        if (!container || !PRODUCTS.length) return;

        var cats = {};
        PRODUCTS.forEach(function(p) {
            if (p.category) {
                if (!cats[p.category]) cats[p.category] = 0;
                cats[p.category]++;
            }
        });

        var html = '';
        Object.keys(cats).sort().forEach(function(catId) {
            var catName = catId;
            // Find category name from products.json categories array
            if (window.PRODUCT_CATEGORIES && window.PRODUCT_CATEGORIES[catId]) {
                catName = t(window.PRODUCT_CATEGORIES[catId], LANG);
            }
            html += '<label><input type="checkbox" data-category="' + catId + '"> ' + catName + ' <span class="count">(' + cats[catId] + ')</span></label>';
        });
        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
            cb.addEventListener('change', applyFilters);
        });
    }

    function init() {
        var grid = document.getElementById('productGrid');
        if (!grid) return;

        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;">Loading products...</div>';

        // Determine JSON path based on language
        var jsonPath = 'data/products.json';
        if (LANG === 'es') jsonPath = '../data/products.json';
        if (LANG === 'ar') jsonPath = '../data/products.json';

        fetch(jsonPath)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                PRODUCTS = data.products || [];
                if (data.categories) {
                    var catMap = {};
                    data.categories.forEach(function(c) {
                        catMap[c.id] = c.name;
                    });
                    window.PRODUCT_CATEGORIES = catMap;
                }
                buildCategoryFilters();
                applyFilters();
            })
            .catch(function(err) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#c00;">Failed to load products. Please refresh.</div>';
            });
    }

    // Public API
    window.productsLoader = {
        goPage: goPage,
        applyFilters: applyFilters
    };

    // Sort dropdown listener
    document.addEventListener('DOMContentLoaded', function() {
        var sortSel = document.querySelector('.toolbar-sort select');
        if (sortSel) {
            sortSel.addEventListener('change', applyFilters);
        }
        init();
    });
})();
