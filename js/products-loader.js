(function () {
  'use strict';

  const grid = document.getElementById('productGrid');
  const count = document.getElementById('catalogCount');
  const filters = document.getElementById('categoryFilters');
  const searchForm = document.getElementById('catalogSearch');
  const searchInput = document.getElementById('productSearch');

  if (!grid || !count || !filters) return;

  let products = [];
  let activeCategory = 'all';
  let query = new URLSearchParams(window.location.search).get('search') || '';

  function textFor(value) {
    if (!value) return '';
    return typeof value === 'string' ? value : (value.en || '');
  }

  function isBuyerReady(product) {
    const sourceIsCurated = !product.source || (product.source === 'supplier' && product.approved === true);
    return sourceIsCurated &&
      Number(product.price) > 0 &&
      textFor(product.name).trim().length > 2 &&
      !/[\u3400-\u9fff]/.test(textFor(product.name));
  }

  function categoryName(product) {
    return textFor(product.category_display) || product.category || 'Wholesale';
  }

  function createCard(product) {
    const card = document.createElement('article');
    card.className = 'catalog-card';

    const visual = document.createElement('div');
    visual.className = 'catalog-card__visual';
    const visualCategory = document.createElement('span');
    visualCategory.textContent = categoryName(product);
    const visualReference = document.createElement('strong');
    visualReference.textContent = product.id.toUpperCase();
    const visualNote = document.createElement('small');
    visualNote.textContent = 'Current photos supplied with quote';
    visual.append(visualCategory, visualReference, visualNote);
    card.appendChild(visual);

    const body = document.createElement('div');
    body.className = 'catalog-card__body';

    const meta = document.createElement('div');
    meta.className = 'catalog-card__meta';
    const category = document.createElement('span');
    category.textContent = categoryName(product);
    const reference = document.createElement('span');
    reference.textContent = 'Ref ' + product.id;
    meta.append(category, reference);

    const title = document.createElement('h2');
    title.textContent = textFor(product.name);

    const price = document.createElement('p');
    price.className = 'catalog-card__price';
    price.textContent = product.price_display || ('£' + Number(product.price).toFixed(2));
    const priceNote = document.createElement('small');
    priceNote.textContent = ' indicative';
    price.appendChild(priceNote);

    const moq = document.createElement('p');
    moq.className = 'catalog-card__moq';
    moq.textContent = 'Indicative MOQ: ' + (textFor(product.min_order) || 'Confirm by quote');

    const actions = document.createElement('div');
    actions.className = 'catalog-card__actions';
    const quote = document.createElement('a');
    quote.className = 'button button--primary button--compact js-catalog-quote';
    quote.href = '#catalogInquiry';
    quote.setAttribute('data-product', textFor(product.name) + ' (' + product.id + ')');
    quote.textContent = 'Get current quote';

    const whatsapp = document.createElement('a');
    whatsapp.className = 'catalog-card__wa';
    whatsapp.href = 'https://wa.me/8613516946001?text=' +
      encodeURIComponent('Hi CheapALot, please quote ' + textFor(product.name) + ' (ref ' + product.id + ').');
    whatsapp.target = '_blank';
    whatsapp.rel = 'noopener';
    whatsapp.textContent = 'WA';
    whatsapp.setAttribute('aria-label', 'Ask about ' + textFor(product.name) + ' on WhatsApp');

    actions.append(quote, whatsapp);
    body.append(meta, title, price, moq, actions);
    card.appendChild(body);
    return card;
  }

  function visibleProducts() {
    const normalized = query.trim().toLowerCase();
    return products.filter(function (product) {
      const categoryMatch = activeCategory === 'all' || product.category === activeCategory;
      const searchable = (textFor(product.name) + ' ' + categoryName(product)).toLowerCase();
      return categoryMatch && (!normalized || searchable.includes(normalized));
    });
  }

  function render() {
    const visible = visibleProducts();
    grid.replaceChildren();

    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'catalog-empty';
      empty.textContent = 'No selected offer matches this search. Send us a sourcing request instead.';
      grid.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      visible.forEach(function (product) {
        fragment.appendChild(createCard(product));
      });
      grid.appendChild(fragment);
    }

    count.textContent = visible.length + ' curated trade offer' + (visible.length === 1 ? '' : 's');
  }

  function buildFilters() {
    const names = new Map();
    products.forEach(function (product) {
      if (!names.has(product.category)) names.set(product.category, categoryName(product));
    });

    const options = [['all', 'All selected offers']].concat(Array.from(names.entries()));
    const fragment = document.createDocumentFragment();
    options.forEach(function (option) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-chip' + (option[0] === activeCategory ? ' is-active' : '');
      button.textContent = option[1];
      button.setAttribute('data-category', option[0]);
      fragment.appendChild(button);
    });
    filters.replaceChildren(fragment);
  }

  filters.addEventListener('click', function (event) {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.getAttribute('data-category') || 'all';
    filters.querySelectorAll('.filter-chip').forEach(function (chip) {
      chip.classList.toggle('is-active', chip === button);
    });
    render();
  });

  grid.addEventListener('click', function (event) {
    const link = event.target.closest('.js-catalog-quote');
    if (!link) return;
    const field = document.getElementById('catalogProduct');
    if (field) field.value = link.getAttribute('data-product') || '';
  });

  if (searchForm && searchInput) {
    searchInput.value = query;
    searchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      query = searchInput.value;
      render();
    });
    searchInput.addEventListener('input', function () {
      query = searchInput.value;
      render();
    });
  }

  fetch('data/products.json')
    .then(function (response) {
      if (!response.ok) throw new Error('Catalogue unavailable');
      return response.json();
    })
    .then(function (data) {
      products = (data.products || []).filter(isBuyerReady);
      buildFilters();
      render();
    })
    .catch(function () {
      count.textContent = 'Catalogue temporarily unavailable';
      const empty = document.createElement('div');
      empty.className = 'catalog-empty';
      empty.textContent = 'Please request a sourcing quote or contact us on WhatsApp.';
      grid.replaceChildren(empty);
    });
})();
