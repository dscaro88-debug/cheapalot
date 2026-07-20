(function () {
  'use strict';
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  document.querySelectorAll('.btn-inquire').forEach(function (button) {
    button.addEventListener('click', function () {
      const field = document.getElementById('iq-product');
      if (field) field.value = button.getAttribute('data-product') || '';
    });
  });
  // Forms intentionally use their real HTML action. Never show success without a server response.
})();
