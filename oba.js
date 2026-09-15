/* OBA Registrations — shared behaviour
   header scroll state · mobile nav · countdown · panelist tiles · registration form */
(function () {
  'use strict';

  /* ---- mobile nav sheet ---- */
  var sheet = document.getElementById('mobile-nav');
  var openBtn = document.querySelector('[data-nav-open]');
  if (sheet && openBtn) {
    var closeEls = sheet.querySelectorAll('[data-nav-close]');
    var setOpen = function (open) {
      sheet.classList.toggle('is-open', open);
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('nav-locked', open);
      if (open) { var first = sheet.querySelector('a, button'); if (first) first.focus(); }
      else openBtn.focus();
    };
    openBtn.addEventListener('click', function () { setOpen(true); });
    closeEls.forEach(function (el) { el.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('is-open')) setOpen(false); });
  }

  /* ---- countdown: data-target is the exact start instant (ISO, UTC) ---- */
  document.querySelectorAll('[data-countdown]').forEach(function (root) {
    var target = new Date(root.getAttribute('data-target')).getTime();
    if (isNaN(target)) return;
    var cells = { d: root.querySelector('[data-d]'), h: root.querySelector('[data-h]'), m: root.querySelector('[data-m]'), s: root.querySelector('[data-s]') };
    var timer;
    var tick = function () {
      var delta = target - Date.now();
      if (delta <= 0) {
        root.innerHTML = '<p class="countdown-done">This panel has already started.</p>';
        clearInterval(timer);
        return;
      }
      var total = Math.floor(delta / 1000);
      var v = { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
      Object.keys(v).forEach(function (k) { if (cells[k]) cells[k].textContent = String(v[k]).padStart(2, '0'); });
    };
    tick();
    timer = setInterval(tick, 1000);
  });

  /* ---- panelist tiles: each tile opens and closes on its own ---- */
  document.querySelectorAll('[data-bento] .tile').forEach(function (tile) {
    var btn = tile.querySelector('.tile__head[aria-expanded]');
    var pane = tile.querySelector('.tile__bio');
    if (!btn || !pane) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      pane.classList.toggle('is-open', open);
      var inner = pane.firstElementChild;
      if (inner) { if (open) inner.removeAttribute('inert'); else inner.setAttribute('inert', ''); }
    });
  });

  /* ---- registration form → Apps Script (same endpoint + payload as before) ---- */
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5cWS9j1LmzIi01qQ5GuWTgibXw6Rz8PLAoMEOqll1sJNHLFUBx8Mh_YoFWsycprjJnQ/exec';
  var form = document.getElementById('reg-form');
  if (form) {
    var btn = form.querySelector('[type="submit"]');
    var msg = form.querySelector('.reg-form__msg');
    var btnLabel = btn ? btn.innerHTML : '';
    var rules = {
      first_name: 'Enter your first name.',
      last_name: 'Enter your last name.',
      email: 'Enter a valid email.',
      phone: 'Enter a phone number.',
      job_title: 'Enter your job title.',
      practice_name: 'Enter your practice name.',
      text_reminder: 'Choose one.',
      practice_owner: 'Choose one.',
      question: "Tell the panel what you'd like them to address."
    };
    var setError = function (name, text) {
      var control = form.elements[name];
      var err = form.querySelector('[data-error-for="' + name + '"]');
      if (control) control.setAttribute('aria-invalid', text ? 'true' : 'false');
      if (err) err.textContent = text || '';
    };
    Object.keys(rules).forEach(function (name) {
      var c = form.elements[name];
      if (c) c.addEventListener('input', function () { setError(name, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = function (n) { var c = form.elements[n]; return c ? String(c.value || '').trim() : ''; };
      var firstBad = null;
      Object.keys(rules).forEach(function (name) {
        var bad = name === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value(name)) : !value(name);
        setError(name, bad ? rules[name] : '');
        if (bad && !firstBad) firstBad = name;
      });
      if (firstBad) { form.elements[firstBad].focus(); return; }

      var source_id = new URLSearchParams(window.location.search).get('s') || '';
      var data = {
        event_key: form.getAttribute('data-event-key'),
        first_name: value('first_name'),
        last_name: value('last_name'),
        email: value('email'),
        phone: value('phone'),
        job_title: value('job_title'),
        practice_name: value('practice_name'),
        text_reminder: value('text_reminder'),
        practice_owner: value('practice_owner'),
        question: value('question'),
        source_id: source_id,
        source_name: ''
      };

      if (msg) { msg.className = 'reg-form__msg'; msg.textContent = ''; }
      if (btn) { btn.disabled = true; btn.innerHTML = '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Registering…'; }
      form.setAttribute('aria-busy', 'true');

      // Fire and show success immediately: the no-cors response is opaque, and
      // Apps Script cold starts can take several seconds. keepalive lets the
      // request complete even if the visitor navigates away.
      fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(data) })
        .catch(function (err) {
          console.error('Registration error:', err);
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
          form.removeAttribute('aria-busy');
          if (msg) { msg.className = 'reg-form__msg is-error'; msg.textContent = 'Something went wrong. Please try again or contact us directly.'; }
        });

      var card = form.closest('.reg-card') || form.parentNode;
      var success = document.createElement('div');
      success.className = 'success';
      success.setAttribute('role', 'status');
      success.setAttribute('tabindex', '-1');
      success.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>' +
        '<h3>You’re registered</h3><p>Check your inbox for the Zoom joining link. The replay is sent to everyone who registers.</p>';
      setTimeout(function () {
        var intro = card.querySelector('.reg-card__intro');
        form.replaceWith(success);
        if (intro) intro.remove();
        success.focus();
      }, 400);
    });
  }
})();
