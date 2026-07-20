(function () {
  'use strict';

  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.getElementById('mainNav');

  function closeNav() {
    if (!navToggle || !mainNav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    mainNav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
  }

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      const willOpen = !mainNav.classList.contains('is-open');
      mainNav.classList.toggle('is-open', willOpen);
      navToggle.setAttribute('aria-expanded', String(willOpen));
      document.body.classList.toggle('nav-open', willOpen);
    });

    mainNav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav();
    });
  }

  document.querySelectorAll('.js-prefill').forEach(function (link) {
    link.addEventListener('click', function () {
      const product = link.getAttribute('data-product') || '';
      const field = document.getElementById('quoteProduct') || document.getElementById('catalogProduct');
      if (field && product) {
        field.value = product;
        window.setTimeout(function () {
          field.focus({ preventScroll: true });
        }, 400);
      }
    });
  });

  function track(name, detail) {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: name,
        cheapalot_detail: detail || ''
      });
    }
  }

  document.querySelectorAll('a[href*="wa.me"]').forEach(function (link) {
    link.addEventListener('click', function () {
      track('whatsapp_click', link.getAttribute('href'));
    });
  });

  document.querySelectorAll('[data-async-form]').forEach(function (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      const submit = form.querySelector('button[type="submit"]');
      const status = form.querySelector('[data-form-status]');
      if (!submit || !form.action) return;

      const originalLabel = submit.textContent;
      submit.disabled = true;
      submit.textContent = 'Sending…';
      if (status) {
        status.className = 'form-status';
        status.textContent = 'Sending your request securely…';
      }

      try {
        const response = await fetch(form.action, {
          method: (form.method || 'POST').toUpperCase(),
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error('The enquiry service did not accept the request.');
        }

        form.reset();
        submit.textContent = 'Request sent';
        if (status) {
          status.className = 'form-status is-success';
          status.textContent = 'Thank you. Your request was delivered successfully.';
        }
        track('lead_submit_success', form.querySelector('[name="lead_type"]')?.value || 'form');

        window.setTimeout(function () {
          submit.disabled = false;
          submit.textContent = originalLabel;
        }, 5000);
      } catch (error) {
        submit.disabled = false;
        submit.textContent = originalLabel;
        if (status) {
          status.className = 'form-status is-error';
          status.textContent = 'We could not send this request. Please use WhatsApp or email us directly.';
        }
        track('lead_submit_error', form.querySelector('[name="lead_type"]')?.value || 'form');
      }
    });
  });
})();
