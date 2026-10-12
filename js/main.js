/* =============================================
   Reservista by Megon. main.js v2.0
   UI interactions: nav scroll, mobile menu, reveals, counters
   ============================================= */
'use strict';

// ══════════════════════════════════════════════════
// NAV: scroll-aware shell  (Brass & Midnight)
// ══════════════════════════════════════════════════
(function () {
  var nav = document.getElementById('megNav');
  if (!nav) return;
  var ticking = false;
  function apply() {
    nav.classList.toggle('is-scrolled', window.scrollY > 20);
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { requestAnimationFrame(apply); ticking = true; }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  apply();
}());

// ══════════════════════════════════════════════════
// NAV: Products dropdown — keyboard & a11y toggle
// (CSS hover/focus-within handles pointer opening)
// ══════════════════════════════════════════════════
(function () {
  var trigger = document.querySelector('.meg-nav-trigger');
  var wrap    = document.querySelector('.meg-nav-dropdown-wrap');
  if (!trigger || !wrap) return;
  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    var open = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!open));
  });
  wrap.addEventListener('focusout', function (e) {
    if (!wrap.contains(e.relatedTarget)) {
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  wrap.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  });
}());

// ══════════════════════════════════════════════════
// NAV: Mobile drawer — slide-in from right
// Handles: open, close, Escape, body scroll lock, focus trap, backdrop tap
// ══════════════════════════════════════════════════
(function () {
  var btn       = document.getElementById('megHamburger');
  var drawer    = document.getElementById('megDrawer');
  var backdrop  = document.getElementById('megDrawerBackdrop');
  var closeBtn  = document.getElementById('megDrawerClose');
  if (!btn || !drawer || !backdrop) return;

  var lastFocus = null;
  var isOpen = false;

  function firstFocusable() {
    return drawer.querySelector(
      'a[href]:not([aria-disabled="true"]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('meg-drawer-lock');
    // Focus first link after slide-in completes
    setTimeout(function () {
      var f = firstFocusable();
      if (f) f.focus();
    }, 360);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('meg-drawer-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.addEventListener('click', function (e) { e.preventDefault(); isOpen ? close() : open(); });
  closeBtn && closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  // Any link inside drawer closes it on tap. Close synchronously so the
  // drawer doesn't keep painting while the next page loads.
  drawer.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (a && !a.hasAttribute('aria-disabled')) close();
  });

  // Escape to close
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    // Focus trap
    if (e.key === 'Tab') {
      var focusables = drawer.querySelectorAll(
        'a[href]:not([aria-disabled="true"]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // If viewport grows past desktop breakpoint while drawer is open, close it
  var mq = window.matchMedia('(min-width: 1024px)');
  if (mq.addEventListener) mq.addEventListener('change', function (e) { if (e.matches) close(); });
  else if (mq.addListener) mq.addListener(function (e) { if (e.matches) close(); });
}());

// ══════════════════════════════════════════════════
// NAV: Active-link state based on current page
// ══════════════════════════════════════════════════
(function () {
  var path = (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
  var map = { 'about': 'about', 'pricing': 'pricing', 'contact': 'contact' };
  var key = map[path];
  if (!key) return;
  var link = document.querySelector('.meg-nav-link[data-nav="' + key + '"]');
  if (link) link.classList.add('is-active');
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

// (Legacy active-nav helper removed; replaced by the data-nav version in the new header block above.)

// ── BLOG SEARCH + CATEGORY FILTER ──
(function () {
  var search = document.getElementById('blog-search');
  var tabs   = document.getElementById('blog-category-tabs');
  if (!search || !tabs) return;

  var articles      = document.querySelectorAll('.card-blog[data-category]');
  var tabBtns       = tabs.querySelectorAll('[data-filter]');
  var featured      = document.getElementById('blog-featured');
  var filterBar     = document.getElementById('blog-filter-bar');
  var searchInline  = document.getElementById('blog-search-inline');
  var searchLabel   = document.getElementById('blog-search-label');
  var searchClear   = document.getElementById('blog-search-clear');
  var activeFilter  = 'All';
  var isSearching   = false;

  function setSearchMode(active) {
    isSearching = active;
    // Hide/show featured article
    if (featured) featured.style.display = active ? 'none' : '';
    // Show/hide inline search indicator in filter bar
    if (searchInline) searchInline.style.display = active ? 'flex' : 'none';
    // Add background to sticky bar when searching
    if (filterBar) {
      if (active) {
        filterBar.classList.add('bg-white', 'shadow-sm', 'border-b', 'border-slate-100', 'pt-4');
      } else {
        filterBar.classList.remove('bg-white', 'shadow-sm', 'border-b', 'border-slate-100', 'pt-4');
      }
    }
    // Scroll results into view
    if (active && filterBar) {
      filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function filterArticles() {
    var query = search.value.toLowerCase().trim();
    var shown = 0;

    // Toggle search mode
    if (query && !isSearching) setSearchMode(true);
    if (!query && isSearching) setSearchMode(false);

    // Update inline label
    if (searchLabel && query) {
      searchLabel.textContent = 'Searching: "' + search.value.trim() + '"';
    }

    articles.forEach(function (el) {
      var cat   = el.getAttribute('data-category') || '';
      var title = el.getAttribute('data-title') || '';
      var text  = el.textContent.toLowerCase();
      var matchCat   = (activeFilter === 'All' || cat === activeFilter);
      var matchQuery = (!query || title.toLowerCase().indexOf(query) !== -1 || text.indexOf(query) !== -1);
      if (matchCat && matchQuery) {
        el.style.display = '';
        shown++;
      } else {
        el.style.display = 'none';
      }
    });

    // Show "no results" message
    var grid = articles[0] && articles[0].parentElement;
    var noRes = document.getElementById('blog-no-results');
    if (shown === 0 && grid) {
      if (!noRes) {
        noRes = document.createElement('div');
        noRes.id = 'blog-no-results';
        noRes.className = 'col-span-full text-center py-16';
        noRes.innerHTML = '<p class="text-slate-400 text-lg">No articles found. Try a different search or category.</p>';
        grid.appendChild(noRes);
      }
      noRes.style.display = '';
    } else if (noRes) {
      noRes.style.display = 'none';
    }
  }

  // Search input
  search.addEventListener('input', filterArticles);

  // Clear search
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      search.value = '';
      filterArticles();
      search.focus();
    });
  }

  // Category tabs
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      filterArticles();
    });
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
    + '        <h3 style="font-size:1.375rem;font-weight:800;color:#0F172A;margin-bottom:4px">Book a Free Demo</h3>'
    + '        <p style="font-size:.875rem;color:#64748B">30-minute walkthrough of Reservista. in your language, at your pace.</p>'
    + '      </div>'
    + '      <form id="lead-form" class="lead-form">'
    + '        <div class="lead-field">'
    + '          <label for="lead-name">Full Name</label>'
    + '          <input type="text" id="lead-name" name="name" placeholder="Aditya Sharma" required/>'
    + '        </div>'
    + '        <div class="lead-field">'
    + '          <label for="lead-email">Email Address</label>'
    + '          <input type="email" id="lead-email" name="email" placeholder="you@hotel.com" required/>'
    + '        </div>'
    + '        <div class="lead-field">'
    + '          <label for="lead-phone">Phone Number</label>'
    + '          <input type="tel" id="lead-phone" name="phone" placeholder="+91 98765 43210" required/>'
    + '        </div>'
    + '        <button type="submit" class="lead-submit">Book Free Demo →</button>'
    + '        <p style="font-size:.75rem;color:#94A3B8;text-align:center;margin-top:12px">We\'ll message you on WhatsApp within a few hours to pick a time.</p>'
    + '      </form>'
    + '    </div>'
    + '    <div id="lead-success-state" style="display:none">'
    + '      <div class="text-center" style="padding:20px 0">'
    + '        <div class="w-16 h-16 rounded-full mx-auto mb-5" style="background:#ECFDF5;display:flex;align-items:center;justify-content:center">'
    + '          <svg style="width:32px;height:32px;color:#10B981" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
    + '        </div>'
    + '        <h3 style="font-size:1.375rem;font-weight:800;color:#0F172A;margin-bottom:8px">Got it. talk soon!</h3>'
    + '        <p style="font-size:.9375rem;color:#64748B;line-height:1.6;max-width:300px;margin:0 auto">We\'ll reach out on WhatsApp within a few hours to pick a demo time that works for you.</p>'
    + '        <p style="font-size:.8125rem;color:#94A3B8;margin-top:16px">Need us sooner? Just message <b>+91 98640 89400</b>.</p>'
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

  // Form submit — send to /api/send-form (WorkMail SMTP via Vercel Function)
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    var origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    var payload = {
      form_type: 'contact',
      full_name: document.getElementById('lead-name').value,
      email:     document.getElementById('lead-email').value,
      phone:     document.getElementById('lead-phone').value,
      message:   'Lead capture from ' + window.location.pathname,
      source_page: window.location.pathname
    };

    fetch('/api/send-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) {
        formState.style.display = 'none';
        successState.style.display = '';
      } else {
        if (btn) { btn.disabled = false; btn.textContent = origText; }
        alert((j && j.error) || 'Something went wrong. Please try again.');
      }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      alert('Connection failed. Please try again.');
    });
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


// ══════════════════════════════════════════════════
// SUITE: Product bento cards → modal "screen"
// ══════════════════════════════════════════════════
(function () {
  var root = document.getElementById('suiteModalRoot');
  if (!root) return;

  var cards   = document.querySelectorAll('.suite-card[data-product]');
  var lastFocus = null;
  var activeModal = null;

  function openModal(product) {
    var modal = document.getElementById('suite-modal-' + product);
    if (!modal) return;
    lastFocus = document.activeElement;
    // Hide any previously-open modal first
    root.querySelectorAll('.suite-modal.is-open').forEach(function (m) {
      m.classList.remove('is-open');
      m.setAttribute('aria-hidden', 'true');
    });
    // Open root + this modal
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('suite-modal-lock');
    activeModal = modal;
    // Focus first focusable inside the modal after the transition starts
    setTimeout(function () {
      var f = modal.querySelector('button, [href], input');
      if (f) f.focus();
    }, 120);
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.classList.remove('is-open');
    activeModal.setAttribute('aria-hidden', 'true');
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('suite-modal-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    activeModal = null;
  }

  // Card clicks → open
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      openModal(card.getAttribute('data-product'));
    });
    // Also open on Enter / Space for keyboard users
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card.getAttribute('data-product'));
      }
    });
  });

  // Any element with data-close inside root closes the modal
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal();
  });

  // Escape key + focus trap
  document.addEventListener('keydown', function (e) {
    if (!activeModal) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab') {
      var f = activeModal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Waitlist form — send to /api/send-form (kyc_waitlist or alohi_waitlist)
  root.querySelectorAll('.suite-waitlist-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var parent  = form.closest('.suite-waitlist');
      var product = parent ? parent.getAttribute('data-product') : '';
      var email   = form.querySelector('input[type="email"]');
      var btn     = form.querySelector('button[type="submit"]');
      if (!email || !email.value) return;

      var origText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      var formType = product === 'kyc' ? 'kyc_waitlist' : 'alohi_waitlist';
      fetch('/api/send-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_type: formType, email: email.value })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.ok) {
          parent.classList.add('is-submitted');
        } else {
          if (btn) { btn.disabled = false; btn.textContent = origText; }
          alert((j && j.error) || 'Something went wrong. Please try again.');
        }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = origText; }
        alert('Connection failed. Please try again.');
      });
    });
  });
}());


// ══════════════════════════════════════════════════
// GENERIC FORM HANDLER — any <form data-form-send data-form-type="…"> posts
// to /api/send-form and shows inline success/error via [data-form-status].
// Used by: contact form, demo form, footer subscribe, blog subscribe.
// ══════════════════════════════════════════════════
(function () {
  var forms = document.querySelectorAll('form[data-form-send]');
  if (!forms.length) return;

  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var origText = btn ? btn.textContent : '';
      var status = form.querySelector('[data-form-status]');

      function setStatus(msg, kind) {
        if (!status) return;
        status.textContent = msg || '';
        status.setAttribute('data-kind', kind || '');
      }

      // Gather form data
      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (value, key) {
        if (data[key] === undefined) { data[key] = value; return; }
        if (Array.isArray(data[key])) data[key].push(value);
        else data[key] = [data[key], value];
      });
      data.source_page = window.location.pathname;

      // Minimal client-side email check (backend re-validates)
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
        setStatus('Please enter a valid email address.', 'error');
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      setStatus('', '');

      fetch('/api/send-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
        .then(function (res) {
          if (btn) { btn.disabled = false; btn.textContent = origText; }
          if (res.status === 200 && res.body && res.body.ok) {
            setStatus('Thanks! We received your submission and sent a confirmation to your email.', 'ok');
            form.reset();
          } else {
            setStatus((res.body && res.body.error) || 'Something went wrong. Please try again.', 'error');
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = origText; }
          setStatus('Connection failed. Please try again in a moment.', 'error');
        });
    });
  });
}());


// ══════════════════════════════════════════════════
// SUITE: Pointer-spotlight on each card
// Tracks cursor position, writes to --mx / --my CSS vars
// ══════════════════════════════════════════════════
(function () {
  var cards = document.querySelectorAll('.suite-card');
  if (!cards.length) return;
  var rafId = null;
  var pending = null;

  function flush() {
    if (pending) {
      pending.card.style.setProperty('--mx', pending.x + 'px');
      pending.card.style.setProperty('--my', pending.y + 'px');
      pending = null;
    }
    rafId = null;
  }

  cards.forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var rect = card.getBoundingClientRect();
      pending = {
        card: card,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      if (!rafId) rafId = requestAnimationFrame(flush);
    });
  });
}());


// ══════════════════════════════════════════════════
// SUITE: Live micro-animations inside mini mockups
// Each product gets one signature "it's alive" beat.
// Uses IntersectionObserver so animations only run when visible.
// ══════════════════════════════════════════════════
(function () {
  var cards = document.querySelectorAll('.suite-card');
  if (!cards.length || !('IntersectionObserver' in window)) return;
  var timers = new Map();

  function startAnimations(card) {
    if (timers.has(card)) return;                       // already running
    var product = card.getAttribute('data-product');
    var handles = [];

    // ── PMS: occupancy % ticks up every 12s ──
    if (product === 'pms') {
      var tile = card.querySelectorAll('.viz-tile-num')[2]; // 3rd tile = Occupancy
      if (tile) {
        var v = 87;
        handles.push(setInterval(function () {
          v = (v === 87 ? 89 : (v === 89 ? 91 : 87));
          tile.textContent = v + '%';
          tile.animate(
            [{ opacity: 1 }, { opacity: .5 }, { opacity: 1 }],
            { duration: 400, easing: 'ease-in-out' }
          );
        }, 12000));
      }
    }

    // ── POS: new line item appears + total updates every 10s ──
    if (product === 'pos') {
      var receipt = card.querySelector('.viz-pos-receipt');
      if (receipt) {
        var rotation = [
          ['1× Paneer Tikka', '₹200'],
          ['2× Masala Dosa', '₹240'],
          ['1× Fresh Lime', '₹80']
        ];
        var total = 1002;
        var iter = 0;
        handles.push(setInterval(function () {
          var rows = receipt.querySelectorAll('.viz-pos-row:not(.viz-pos-total)');
          if (rows.length >= 3) rows[2].remove();
          var item = rotation[iter % rotation.length];
          iter++;
          var newRow = document.createElement('div');
          newRow.className = 'viz-pos-row';
          newRow.style.opacity = '0';
          newRow.innerHTML = '<span>' + item[0] + '</span><span>' + item[1] + '</span>';
          var totalRow = receipt.querySelector('.viz-pos-total');
          receipt.insertBefore(newRow, totalRow);
          requestAnimationFrame(function () {
            newRow.style.transition = 'opacity 500ms ease';
            newRow.style.opacity = '1';
          });
          var addAmount = parseInt(item[1].replace(/[^\d]/g, ''), 10);
          total = 1002 + addAmount;
          if (totalRow) {
            var totalSpan = totalRow.querySelectorAll('span')[1];
            if (totalSpan) totalSpan.textContent = '₹' + total.toLocaleString('en-IN');
          }
        }, 10000));
      }
    }

    // ── CM: pulse dots already animate in CSS (sequenced via delays). Nothing to do. ──

    // ── KYC: no JS needed — CSS laser scans continuously (subtle). ──

    // ── MyAlohi: parallax-shift hero image on pointer move within card ──
    if (product === 'alohi') {
      var heroImg = card.querySelector('.viz-alohi-hero');
      if (heroImg) {
        var onMove = function (e) {
          var rect = card.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width  - .5; // -0.5 .. 0.5
          var y = (e.clientY - rect.top)  / rect.height - .5;
          heroImg.style.transform = 'translate(' + (x * 6) + 'px, ' + (y * 4) + 'px) scale(1.04)';
          heroImg.style.transition = 'transform 200ms ease-out';
        };
        var onLeave = function () {
          heroImg.style.transform = 'translate(0,0) scale(1)';
        };
        card.addEventListener('pointermove', onMove);
        card.addEventListener('pointerleave', onLeave);
        handles.push({ remove: function () {
          card.removeEventListener('pointermove', onMove);
          card.removeEventListener('pointerleave', onLeave);
        }});
      }
    }

    // ── Admin: toggle in position 3 flips every 6s (on/off alternating) ──
    if (product === 'admin') {
      var rows = card.querySelectorAll('.viz-admin-row');
      if (rows.length >= 3) {
        var toggle = rows[2].querySelector('.viz-toggle');
        if (toggle) {
          handles.push(setInterval(function () {
            toggle.classList.toggle('is-on');
          }, 6000));
        }
      }
    }

    timers.set(card, handles);
  }

  function stopAnimations(card) {
    var handles = timers.get(card);
    if (!handles) return;
    handles.forEach(function (h) {
      if (typeof h === 'number') clearInterval(h);
      else if (h && typeof h.remove === 'function') h.remove();
    });
    timers.delete(card);
  }

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) startAnimations(en.target);
      else                   stopAnimations(en.target);
    });
  }, { threshold: 0.3 });

  cards.forEach(function (card) { obs.observe(card); });
}());


// ══════════════════════════════════════════════════
// GLIMPSE: Tabbed unified frame — Operations / Analytics
// Crossfading screens with auto-rotate every 6s,
// pause on hover/focus, keyboard arrow nav, caption-click sync.
// ══════════════════════════════════════════════════
(function () {
  var frame = document.getElementById('glimpseFrame');
  if (!frame) return;

  var tabs      = Array.prototype.slice.call(frame.querySelectorAll('.glimpse-tab'));
  var screens   = Array.prototype.slice.call(frame.querySelectorAll('.glimpse-screen'));
  var indicator = frame.querySelector('.glimpse-tab-indicator');
  var progress  = frame.querySelector('.glimpse-progress > span');
  var captions  = Array.prototype.slice.call(document.querySelectorAll('.glimpse-caption'));
  if (!tabs.length || !screens.length) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTO_MS   = 6000;
  var timerId   = null;
  var isVisible = false;
  var currentIndex = 0;

  function moveIndicator(tab) {
    if (!indicator || !tab) return;
    indicator.style.setProperty('--x', tab.offsetLeft + 'px');
    indicator.style.setProperty('--w', tab.offsetWidth + 'px');
  }

  function restartProgress() {
    if (!progress) return;
    progress.style.animation = 'none';
    /* eslint-disable-next-line no-unused-expressions */
    progress.offsetWidth;
    progress.style.animation = '';
  }

  function activate(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    tabs.forEach(function (t, i) {
      var active = (i === index);
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.setAttribute('tabindex', active ? '0' : '-1');
    });
    screens.forEach(function (s, i) {
      var active = (i === index);
      s.classList.toggle('is-active', active);
      if (active) s.removeAttribute('hidden');
      else        s.setAttribute('hidden', '');
    });
    captions.forEach(function (c, i) {
      c.classList.toggle('is-active', i === index);
    });
    moveIndicator(tabs[index]);
  }

  function startRotate() {
    if (reducedMotion || !isVisible) return;
    stopRotate();
    frame.classList.add('is-rotating');
    frame.classList.remove('is-paused');
    restartProgress();
    timerId = setInterval(function () {
      activate((currentIndex + 1) % tabs.length);
      restartProgress();
    }, AUTO_MS);
  }
  function pauseRotate() {
    if (!timerId) return;
    frame.classList.add('is-paused');
    clearInterval(timerId);
    timerId = null;
  }
  function stopRotate() {
    frame.classList.remove('is-rotating', 'is-paused');
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      activate(i);
      startRotate();
    });
    tab.addEventListener('keydown', function (e) {
      var nextIdx = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End')  nextIdx = tabs.length - 1;
      else return;
      e.preventDefault();
      activate(nextIdx);
      tabs[nextIdx].focus();
      startRotate();
    });
  });

  captions.forEach(function (cap, i) {
    cap.addEventListener('click', function () {
      activate(i);
      startRotate();
    });
  });

  frame.addEventListener('mouseenter', pauseRotate);
  frame.addEventListener('mouseleave', startRotate);
  frame.addEventListener('focusin',  pauseRotate);
  frame.addEventListener('focusout', function (e) {
    if (!frame.contains(e.relatedTarget)) startRotate();
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      isVisible = en.isIntersecting;
      if (isVisible) {
        moveIndicator(tabs[currentIndex]);
        startRotate();
      } else {
        stopRotate();
      }
    });
  }, { threshold: 0.35 });
  io.observe(frame);

  var resizeRaf = null;
  window.addEventListener('resize', function () {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      moveIndicator(tabs[currentIndex]);
    });
  });

  requestAnimationFrame(function () { moveIndicator(tabs[currentIndex]); });
}());


// ══════════════════════════════════════════════════
// HOW IT WORKS: reveal each itinerary row as it scrolls in
// — triggers the outline→fill wipe on the oversized numeral.
// ══════════════════════════════════════════════════
(function () {
  var rows = document.querySelectorAll('.howit-row');
  if (!rows.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
  rows.forEach(function (row) { io.observe(row); });
}());


// ══════════════════════════════════════════════════
// PMS/POS · How It Works stepper — reveal the connector
// line + circle pulses once the section scrolls into view.
// ══════════════════════════════════════════════════
(function () {
  var el = document.getElementById('pmsHow');
  if (!el || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        el.classList.add('is-visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
  io.observe(el);
}());


// ══════════════════════════════════════════════════
// PMS · Growth Support trend sparklines — draw on reveal
// ══════════════════════════════════════════════════
(function () {
  var el = document.getElementById('pmsTrend');
  if (!el || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        el.classList.add('is-visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  io.observe(el);
}());
