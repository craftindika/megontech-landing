/* =============================================
   megontech — Horizon PMS & PoS
   main.js — UI Interactions v1.0
   ============================================= */
'use strict';

// ── NAVBAR SCROLL ──
(function () {
  var nav = document.getElementById('navbar');
  if (!nav) return;
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 20); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}());

// ── MOBILE MENU ──
(function () {
  var btn  = document.getElementById('mobile-menu-btn');
  var menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  var open = false;
  var iconMenu = '<svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>';
  var iconClose= '<svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
  btn.addEventListener('click', function () {
    open = !open;
    menu.classList.toggle('hidden', !open);
    btn.innerHTML = open ? iconClose : iconMenu;
    btn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', function (e) {
    if (open && !btn.contains(e.target) && !menu.contains(e.target)) {
      open = false; menu.classList.add('hidden'); btn.innerHTML = iconMenu; btn.setAttribute('aria-expanded', 'false');
    }
  });
}());

// ── COUNTER ANIMATION ──
(function () {
  var els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  function animate(el) {
    var raw    = el.getAttribute('data-count');
    var num    = parseFloat(raw.replace(/[^0-9.]/g, ''));
    var suffix = raw.replace(/[0-9.]/g, '').trim();
    var dec    = raw.includes('.');
    var dur    = 1800; var start = performance.now();
    (function step(now) {
      var t = Math.min((now - start) / dur, 1);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = dec ? (num * e).toFixed(1) + suffix : Math.floor(num * e).toLocaleString('en-IN') + suffix;
      if (t < 1) requestAnimationFrame(step);
    }(start));
  }
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting && !en.target.dataset.counted) { en.target.dataset.counted = '1'; animate(en.target); obs.unobserve(en.target); } });
  }, { threshold: 0.3 });
  els.forEach(function (el) { obs.observe(el); });
}());

// ── FAQ ACCORDION ──
(function () {
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-question');
    var a = item.querySelector('.faq-answer');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var was = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('active'); var ia = i.querySelector('.faq-answer'); if (ia) ia.classList.remove('open'); });
      if (!was) { item.classList.add('active'); a.classList.add('open'); }
    });
  });
}());

// ── TABS ──
(function () {
  document.querySelectorAll('[data-tab-group]').forEach(function (group) {
    var btns   = group.querySelectorAll('.tab-btn');
    var panels = group.querySelectorAll('.tab-panel');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-tab');
        btns.forEach(function (b) { b.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var p = group.querySelector('[data-tab-panel="' + t + '"]');
        if (p) p.classList.add('active');
      });
    });
  });
}());

// ── SCROLL REVEAL ──
(function () {
  var els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade');
  if (!els.length) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
  els.forEach(function (el) { obs.observe(el); });
}());

// ── PRICING BILLING TOGGLE ──
(function () {
  var mBtn = document.getElementById('billing-monthly');
  var aBtn = document.getElementById('billing-annual');
  if (!mBtn || !aBtn) return;
  var els = document.querySelectorAll('[data-monthly][data-annual]');
  function set(mode) {
    els.forEach(function (el) { el.textContent = el.getAttribute('data-' + mode); });
    mBtn.classList.toggle('active', mode === 'monthly');
    aBtn.classList.toggle('active', mode === 'annual');
  }
  mBtn.addEventListener('click', function () { set('monthly'); });
  aBtn.addEventListener('click', function () { set('annual'); });
}());

// ── ACTIVE NAV LINK ──
(function () {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a[href]').forEach(function (link) {
    if (link.getAttribute('href') === path) { link.classList.add('text-white', 'font-medium'); link.classList.remove('text-slate-300'); }
  });
}());

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  if (a.getAttribute('href') === '#') return; // skip CTA buttons
  a.addEventListener('click', function (e) {
    var t = document.querySelector(this.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── LEAD CAPTURE MODAL ──
(function () {
  // Inject modal HTML into the page
  var modalHTML = ''
    + '<div id="lead-modal" class="lead-modal-backdrop" aria-hidden="true">'
    + '  <div class="lead-modal-card">'
    + '    <button class="lead-modal-close" aria-label="Close">'
    + '      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>'
    + '    </button>'
    + '    <div id="lead-form-state">'
    + '      <div class="text-center mb-6">'
    + '        <div class="w-14 h-14 rounded-2xl mx-auto mb-4" style="background:linear-gradient(135deg,#1D4ED8,#6366F1);display:flex;align-items:center;justify-content:center">'
    + '          <svg style="width:28px;height:28px;color:#fff" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>'
    + '        </div>'
    + '        <h3 style="font-size:1.375rem;font-weight:800;color:#0F172A;margin-bottom:4px">Start Your Free Trial</h3>'
    + '        <p style="font-size:.875rem;color:#64748B">14 days free. No credit card required.</p>'
    + '      </div>'
    + '      <form id="lead-form" class="lead-form">'
    + '        <div class="lead-field">'
    + '          <label for="lead-name">Full Name</label>'
    + '          <input type="text" id="lead-name" name="name" placeholder="Aditya Sharma" required/>'
    + '        </div>'
    + '        <div class="lead-field">'
    + '          <label for="lead-email">Email Address</label>'
    + '          <input type="email" id="lead-email" name="email" placeholder="aditya@hotel.com" required/>'
    + '        </div>'
    + '        <div class="lead-field">'
    + '          <label for="lead-phone">Phone Number</label>'
    + '          <input type="tel" id="lead-phone" name="phone" placeholder="+91 98765 43210" required/>'
    + '        </div>'
    + '        <button type="submit" class="lead-submit">Start Free Trial →</button>'
    + '        <p style="font-size:.75rem;color:#94A3B8;text-align:center;margin-top:12px">We\'ll set up your account and reach out within 24 hours.</p>'
    + '      </form>'
    + '    </div>'
    + '    <div id="lead-success-state" style="display:none">'
    + '      <div class="text-center" style="padding:20px 0">'
    + '        <div class="w-16 h-16 rounded-full mx-auto mb-5" style="background:#ECFDF5;display:flex;align-items:center;justify-content:center">'
    + '          <svg style="width:32px;height:32px;color:#10B981" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
    + '        </div>'
    + '        <h3 style="font-size:1.375rem;font-weight:800;color:#0F172A;margin-bottom:8px">You\'re In!</h3>'
    + '        <p style="font-size:.9375rem;color:#64748B;line-height:1.6;max-width:280px;margin:0 auto">We\'ll send your trial login details to your email within 24 hours.</p>'
    + '        <p style="font-size:.8125rem;color:#94A3B8;margin-top:16px">Check your inbox (and spam folder, just in case).</p>'
    + '      </div>'
    + '    </div>'
    + '  </div>'
    + '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  var modal     = document.getElementById('lead-modal');
  var form      = document.getElementById('lead-form');
  var formState = document.getElementById('lead-form-state');
  var successState = document.getElementById('lead-success-state');
  var closeBtn  = modal.querySelector('.lead-modal-close');

  function openModal(e) {
    if (e) e.preventDefault();
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Focus first input after animation
    setTimeout(function () {
      var firstInput = form.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 200);
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Reset to form state after close animation
    setTimeout(function () {
      formState.style.display = '';
      successState.style.display = 'none';
      form.reset();
    }, 300);
  }

  // Close handlers
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  // Form submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      name:  document.getElementById('lead-name').value,
      email: document.getElementById('lead-email').value,
      phone: document.getElementById('lead-phone').value,
      page:  window.location.pathname,
      time:  new Date().toISOString()
    };

    // TODO: Replace with your form endpoint (Formspree, Netlify Forms, Google Sheets, etc.)
    // Example: fetch('https://formspree.io/f/YOUR_ID', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    console.log('Lead captured:', data);

    // Show success state
    formState.style.display = 'none';
    successState.style.display = '';
  });

  // Bind modal to all CTA buttons with href="#"
  // Match: btn-gold, btn-brand, hero-btn-primary, hero-btn-secondary, lead-submit classes
  var ctaSelectors = [
    'a.btn-gold[href="#"]',
    'a.btn-brand[href="#"]',
    'a.hero-btn-primary[href="#"]',
    'a.hero-btn-secondary[href="#"]',
    'a.btn-ghost-dark[href="#"]:not([aria-label*="Login"])'
  ].join(',');

  document.querySelectorAll(ctaSelectors).forEach(function (cta) {
    // Skip Login buttons
    if (cta.textContent.trim().toLowerCase().indexOf('login') !== -1) return;
    cta.addEventListener('click', openModal);
  });

  // Also expose globally for inline onclick if needed
  window.openLeadModal = openModal;
}());
