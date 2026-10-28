import '@fontsource-variable/inter';
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import './styles.css';

import {
  BUSINESS,
  CATEGORIES,
  CATEGORY_LABEL,
  SERVICES,
  BARBERS,
  HOURS,
  REFRESHMENTS,
  SOCIALS,
  money,
  durationLabel,
} from './data.js';

/* ══════════════════════════════════════════════════════════
   Tiny helpers
   ══════════════════════════════════════════════════════════ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const svg = (id) => `<svg class="ic" aria-hidden="true"><use href="#${id}"></use></svg>`;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  serviceIds: new Set(),
  barberId: 'any',
  category: 'all',
  query: '',
  sort: 'menu',
  drawerCategory: 'all',
  drawerQuery: '',
  step: 1,
  dateIndex: 0,
  time: null,
  dates: [],
};

const booking = {
  name: '',
  phone: '',
  notes: '',
};

/* ══════════════════════════════════════════════════════════
   1 · Loading screen
   ══════════════════════════════════════════════════════════ */
function runLoader() {
  const loader = $('#loader');
  const starWrap = $('#loaderStars');
  const rated = $('.loader__rated');
  const bar = $('#loaderBar');

  starWrap.innerHTML = Array.from({ length: 5 })
    .map(() => `<svg aria-hidden="true"><use href="#i-star"/></svg>`)
    .join('');
  const stars = $$('svg', starWrap);

  let progress = 0;
  let done = false;

  const tick = () => {
    progress = Math.min(100, progress + Math.random() * 13 + 5);
    bar.style.width = `${progress}%`;
    if (progress < 100) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  let seen = false;
  try {
    seen = sessionStorage.getItem('fs-visited') === '1';
  } catch {
    seen = false;
  }
  try {
    sessionStorage.setItem('fs-visited', '1');
  } catch {
    /* private mode — ignore */
  }
  const minTime = prefersReduced ? 400 : seen ? 850 : 2350;
  const starStep = Math.max(70, Math.min(240, (minTime - 520) / 5));

  stars.forEach((star, i) => {
    setTimeout(
      () => {
        star.classList.add('on');
        if (i === 4) rated.classList.add('on');
      },
      Math.min(380, minTime * 0.16) + i * starStep
    );
  });

  const finish = () => {
    if (done) return;
    done = true;
    bar.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      initReveal();
      setTimeout(() => loader.remove(), 900);
    }, 260);
  };

  const started = performance.now();
  const wait = () => {
    if (performance.now() - started < minTime) {
      setTimeout(wait, 60);
    } else {
      finish();
    }
  };
  if (document.readyState === 'complete') wait();
  else window.addEventListener('load', wait, { once: true });
  // Hard safety net
  setTimeout(finish, 6000);
}

/* ══════════════════════════════════════════════════════════
   2 · Theme
   ══════════════════════════════════════════════════════════ */
const THEME_KEY = 'fs-theme';

function applyTheme(theme, persist = true) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = $('#themeIcon use');
  if (icon) icon.setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
  const btn = $('#themeToggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    btn.title = theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0B0B' : '#F4EEE2');
  if (persist) localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  applyTheme(stored || 'dark', false);
  $('#themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

/* ══════════════════════════════════════════════════════════
   3 · Tabs
   ══════════════════════════════════════════════════════════ */
function switchTab(tab, { scroll = true } = {}) {
  const tabsEl = $('.tabs');
  $$('.tabs__btn').forEach((btn) => {
    const on = btn.dataset.tab === tab;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', String(on));
  });
  tabsEl.dataset.active = tab;
  $$('.tab-panel').forEach((panel) => {
    const on = panel.id === `panel-${tab}`;
    panel.classList.toggle('is-active', on);
    panel.hidden = !on;
  });
  if (scroll) {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  }
  revealInView();
  requestAnimationFrame(updateStatus);
}

function initTabs() {
  $$('.tabs__btn').forEach((btn) =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
  $$('[data-tab-jump]').forEach((el) =>
    el.addEventListener('click', () => switchTab(el.dataset.tabJump))
  );
  document.querySelectorAll('a[href="#menu"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      $('#menu')?.scrollIntoView?.({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    })
  );
}

/* ══════════════════════════════════════════════════════════
   4 · Nairobi time & live opening status
   ══════════════════════════════════════════════════════════ */
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nairobiNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const day = WEEKDAY_INDEX[get('weekday')] ?? new Date().getDay();
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0;
  return {
    day,
    hour,
    minute: parseInt(get('minute'), 10),
    minutes: hour * 60 + parseInt(get('minute'), 10),
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function hoursForDay(day) {
  return HOURS.find((h) => h.day === day) ?? HOURS[0];
}

function openStatus() {
  const now = nairobiNow();
  const today = hoursForDay(now.day);
  if (today.appointment) {
    return {
      open: false,
      label: 'By appointment',
      detail: 'Sunday · appointments only',
      today,
      now,
    };
  }
  if (now.minutes < today.openMin) {
    return {
      open: false,
      label: 'Closed',
      detail: `Opens today at ${today.open}`,
      today,
      now,
    };
  }
  if (now.minutes >= today.closeMin) {
    const tomorrow = hoursForDay((now.day + 1) % 7);
    return {
      open: false,
      label: 'Closed',
      detail: tomorrow.appointment
        ? 'Closed · Sunday by appointment'
        : `Closes 8:00 pm · Opens ${tomorrow.open} tomorrow`,
      today,
      now,
    };
  }
  return { open: true, label: 'Open now', detail: 'Closes 8:00 pm', today, now };
}

function updateStatus() {
  const status = openStatus();
  $$('[data-status-badge]').forEach((badge) => {
    badge.classList.toggle('is-closed', !status.open);
    const txt = $('[data-status-text]', badge);
    if (txt) txt.textContent = status.label;
  });
  $$('[data-status-line]').forEach((line) => {
    line.textContent = `${status.label} · ${status.detail}`;
  });
  $$('[data-today-hours]').forEach((el) => {
    el.textContent = status.today.appointment
      ? 'By appointment only'
      : `${status.today.open} – ${status.today.close}`;
  });
  highlightToday();
}

function highlightToday() {
  const { day } = nairobiNow();
  $$('.hours__row').forEach((row) => {
    row.classList.toggle('is-today', Number(row.dataset.day) === day);
  });
}

function initHours() {
  const wrap = $('#hoursTable');
  wrap.innerHTML = HOURS.map(
    (h) => `
    <div class="hours__row" data-day="${h.day}">
      <span class="hours__day">${h.label}</span>
      ${h.appointment
        ? `<span class="hours__appt">${h.open}</span>`
        : `<span class="hours__time">${h.open} – ${h.close}</span>`}
      <span class="hours__badge" data-today-badge hidden>TODAY</span>
    </div>`
  ).join('');

  const { day } = nairobiNow();
  $$('.hours__row').forEach((row) => {
    const isToday = Number(row.dataset.day) === day;
    row.classList.toggle('is-today', isToday);
    const badge = $('[data-today-badge]', row);
    if (badge && isToday) badge.hidden = false;
    else if (badge) badge.remove();
  });

  updateStatus();
  setInterval(updateStatus, 60_000);
}

/* ══════════════════════════════════════════════════════════
   5 · Render barbers
   ══════════════════════════════════════════════════════════ */
function barberCard(b, i) {
  const media = b.img
    ? `<img src="${b.img}" alt="${b.name}, ${b.role} at Fresh Start Grooming Lounge" loading="lazy" />`
    : `<img src="/logo.png" alt="" aria-hidden="true" />`;
  return `
    <button class="barber ${b.id === 'any' ? 'barber--any' : ''} ${state.barberId === b.id ? 'is-selected' : ''}"
      data-barber="${b.id}" type="button" aria-pressed="${state.barberId === b.id}"
      aria-label="Select ${b.name}">
      <div class="barber__media">
        ${media}
        <span class="barber__check">${svg('i-check')}</span>
        ${b.years ? `<span class="barber__years">${b.years} yrs</span>` : ''}
      </div>
      <div class="barber__body">
        <span class="barber__name">${b.name}</span>
        <span class="barber__role">${b.role}</span>
        <p class="barber__note">${b.note}</p>
        <div class="barber__specs">${b.specialties.map((s) => `<span>${s}</span>`).join('')}</div>
      </div>
    </button>`;
}

function renderBarbers() {
  const grid = $('#barberGrid');
  grid.innerHTML = BARBERS.map(barberCard).join('');
  grid.querySelectorAll('.barber').forEach((card) => {
    card.addEventListener('click', () => selectBarber(card.dataset.barber, { from: 'grid' }));
  });
}

function renderDrawerBarbers() {
  const wrap = $('#drawerBarbers');
  wrap.innerHTML = BARBERS.map(
    (b) => `
    <button class="dbarber ${state.barberId === b.id ? 'is-selected' : ''}" data-barber="${b.id}" type="button" aria-pressed="${state.barberId === b.id}">
      <span class="dbarber__av">${b.img ? `<img src="${b.img}" alt="" loading="lazy" />` : b.initials}</span>
      <span class="dbarber__main">
        <span class="dbarber__name">${b.name}</span>
        <span class="dbarber__role">${b.role}${b.years ? ` · ${b.years} yrs` : ''}</span>
      </span>
      <span class="dbarber__tick">${svg('i-check')}</span>
    </button>`
  ).join('');
  wrap.querySelectorAll('.dbarber').forEach((btn) => {
    btn.addEventListener('click', () => selectBarber(btn.dataset.barber, { from: 'drawer' }));
  });
}

function selectBarber(id, { from } = {}) {
  state.barberId = id;
  const barber = BARBERS.find((b) => b.id === id);
  if (from !== 'drawer') {
    $$('#barberGrid .barber').forEach((card) => {
      const on = card.dataset.barber === id;
      card.classList.toggle('is-selected', on);
      card.setAttribute('aria-pressed', String(on));
    });
  }
  $$('#drawerBarbers .dbarber').forEach((card) => {
    const on = card.dataset.barber === id;
    card.classList.toggle('is-selected', on);
    card.setAttribute('aria-pressed', String(on));
  });
  if (from !== 'grid') toast(`${barber.name} selected`, 'i-scissors');
  renderSummary();
}

/* ══════════════════════════════════════════════════════════
   6 · Menu rendering, search, filter, sort
   ══════════════════════════════════════════════════════════ */
function categoryCounts() {
  const counts = { all: SERVICES.length };
  SERVICES.forEach((s) => {
    counts[s.cat] = (counts[s.cat] || 0) + 1;
  });
  return counts;
}

function renderChips() {
  const counts = categoryCounts();
  const wrap = $('#categoryChips');
  wrap.innerHTML = CATEGORIES.map(
    (c) => `
    <button class="chip ${state.category === c.id ? 'is-active' : ''}" data-cat="${c.id}" type="button" role="tab" aria-selected="${state.category === c.id}">
      ${c.label} <b>${counts[c.id] ?? 0}</b>
    </button>`
  ).join('');
  wrap.querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      state.category = chip.dataset.cat;
      renderChips();
      renderServices();
      const active = $(`.chip[data-cat="${state.category}"]`);
      active?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    })
  );
}

function matchesQuery(service, query) {
  if (!query) return true;
  const haystack = `${service.name} ${service.desc} ${service.tags} ${CATEGORY_LABEL[service.cat]}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function visibleServices({ category = state.category, query = state.query, sort = state.sort } = {}) {
  let list = SERVICES.filter(
    (s) => (category === 'all' || s.cat === category) && matchesQuery(s, query.trim())
  );
  if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  if (sort === 'duration-asc') list = [...list].sort((a, b) => a.mins - b.mins);
  return list;
}

function serviceCard(s, index) {
  const selected = state.serviceIds.has(s.id);
  return `
    <article class="svc ${selected ? 'is-selected' : ''} ${s.vip ? 'is-vip' : ''}" data-id="${s.id}" style="animation-delay:${Math.min(index * 24, 320)}ms">
      <span class="svc__check">${svg('i-check')}</span>
      <div class="svc__top">
        <span class="svc__cat"><i></i>${CATEGORY_LABEL[s.cat]}</span>
        <span class="svc__badges">
          ${s.vip ? `<span class="svc__vip">${svg('i-crown')} VIP</span>` : ''}
          ${s.badge ? `<span class="svc__badge">${s.badge}</span>` : ''}
        </span>
      </div>
      <h3 class="svc__name">${s.name}</h3>
      <p class="svc__desc">${s.desc}</p>
      <div class="svc__foot">
        <div class="svc__price">
          <strong>${money(s.price)}</strong>
          <span class="svc__pill">${svg('i-clock')} ${durationLabel(s.mins)}</span>
        </div>
        <button class="svc__add" data-toggle="${s.id}" type="button" aria-pressed="${selected}">
          ${selected ? 'Selected' : '+ Select service'}
        </button>
      </div>
    </article>`;
}

function renderServices() {
  const grid = $('#serviceGrid');
  const list = visibleServices();
  const empty = $('#emptyState');
  grid.innerHTML = list.map(serviceCard).join('');
  empty.hidden = list.length > 0;
  $('#menuTotalCount').textContent = list.length;

  grid.querySelectorAll('.svc').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      if (e.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
    const btn = $('.svc__add', card);
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleService(card.dataset.id);
    });
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      toggleService(card.dataset.id);
    });
  });
}

function initMenuTools() {
  const input = $('#serviceSearch');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.query = input.value;
      renderServices();
    }, 130);
  });
  $('#serviceSort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderServices();
  });
  $('#clearFilters').addEventListener('click', () => {
    state.query = '';
    state.category = 'all';
    input.value = '';
    $('#serviceSort').value = 'menu';
    state.sort = 'menu';
    renderChips();
    renderServices();
  });
}

/* ══════════════════════════════════════════════════════════
   7 · Selection
   ══════════════════════════════════════════════════════════ */
function selectedServices() {
  return SERVICES.filter((s) => state.serviceIds.has(s.id));
}

function totals() {
  const list = selectedServices();
  return {
    count: list.length,
    price: list.reduce((sum, s) => sum + s.price, 0),
    mins: list.reduce((sum, s) => sum + s.mins, 0),
  };
}

function toggleService(id) {
  const service = SERVICES.find((s) => s.id === id);
  if (!service) return;
  if (state.serviceIds.has(id)) {
    state.serviceIds.delete(id);
    toast(`Removed ${service.name}`, 'i-minus');
  } else {
    state.serviceIds.add(id);
    toast(`Added ${service.name}`, 'i-check');
  }
  syncSelectionUI();
}

function syncSelectionUI() {
  const t = totals();

  $$('#serviceGrid .svc').forEach((card) => {
    const on = state.serviceIds.has(card.dataset.id);
    card.classList.toggle('is-selected', on);
    const btn = $('.svc__add', card);
    if (btn) {
      btn.textContent = on ? 'Selected' : '+ Select service';
      btn.setAttribute('aria-pressed', String(on));
    }
  });

  $$('#drawerServices .dsvc').forEach((row) => {
    const on = state.serviceIds.has(row.dataset.id);
    row.classList.toggle('is-selected', on);
    row.setAttribute('aria-pressed', String(on));
  });

  const bar = $('#selectBar');
  if (t.count > 0) {
    bar.hidden = false;
    requestAnimationFrame(() => bar.classList.add('is-visible'));
  } else {
    bar.classList.remove('is-visible');
    setTimeout(() => {
      if (totals().count === 0) bar.hidden = true;
    }, 420);
  }
  $('#selCount').textContent = t.count;
  $('#selTotal').textContent = money(t.price);
  $('#selTime').textContent = durationLabel(t.mins);

  $('#dCount').textContent = `${t.count} service${t.count === 1 ? '' : 's'}`;
  $('#dTime').textContent = durationLabel(t.mins);
  $('#dTotal').textContent = money(t.price);

  renderSummary();
  updateStepNav();
}

function initSelectionBar() {
  $('#selClear').addEventListener('click', () => {
    state.serviceIds.clear();
    syncSelectionUI();
    toast('Selection cleared', 'i-close');
  });
}

/* ══════════════════════════════════════════════════════════
   8 · Refreshments, socials, footer
   ══════════════════════════════════════════════════════════ */
function renderRefreshments() {
  $('#refreshMenu').innerHTML = REFRESHMENTS.map(
    (r) => `
    <li class="r-item">
      <div class="r-item__main">
        <span class="r-item__name">${r.name}</span>
        <span class="r-item__detail">${r.detail}</span>
      </div>
      <span class="r-item__dots" aria-hidden="true"></span>
      <div class="r-item__price">
        <s>${money(r.price)}</s>
        <b>Complimentary</b>
      </div>
    </li>`
  ).join('');
}

function renderSocials() {
  $('#socialGrid').innerHTML = SOCIALS.map(
    (s) => `
    <a class="social-card" href="${s.href}" target="_blank" rel="noopener" aria-label="${s.label} — ${s.handle}">
      <span class="social-card__ic">${svg(s.icon)}</span>
      <strong>${s.label}</strong>
      <span class="social-card__handle">${s.handle}</span>
      <span class="social-card__note">${s.note}</span>
    </a>`
  ).join('');
}

/* ══════════════════════════════════════════════════════════
   9 · Booking drawer
   ══════════════════════════════════════════════════════════ */
let lastFocused = null;

function openDrawer(step = 1) {
  lastFocused = document.activeElement;
  const drawer = $('#bookingDrawer');
  const scrim = $('#drawerScrim');
  scrim.hidden = false;
  drawer.hidden = false;
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => {
    scrim.classList.add('is-open');
    drawer.classList.add('is-open');
  });
  goToStep(step, { silent: true });
  setTimeout(() => $('#drawerClose')?.focus(), 380);
}

function closeDrawer() {
  const drawer = $('#bookingDrawer');
  const scrim = $('#drawerScrim');
  drawer.classList.remove('is-open');
  scrim.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => {
    drawer.hidden = true;
    scrim.hidden = true;
  }, 480);
  lastFocused?.focus?.();
}

function goToStep(step, { silent = false } = {}) {
  if (step === 3 && state.serviceIds.size === 0) {
    toast('Select at least one service first', 'i-bell');
    return;
  }
  state.step = clamp(step, 1, 4);
  $$('.dstep').forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === state.step));
  $$('.drawer__step').forEach((s) => {
    const n = Number(s.dataset.stepDot);
    s.classList.toggle('is-active', n === state.step);
    s.classList.toggle('is-done', n < state.step);
  });
  $('#drawerBody').scrollTop = 0;
  if (state.step === 4) renderSummary();
  updateStepNav();
  if (!silent) updateStepNav();
  if (state.step === 3) renderDates();
}

function updateStepNav() {
  const back = $('#stepBack');
  const next = $('#stepNext');
  back.hidden = state.step === 1;
  if (state.step === 4) {
    next.hidden = true;
    return;
  }
  next.hidden = false;
  next.innerHTML =
    state.step === 3
      ? `Review <svg class="ic"><use href="#i-arrow"></use></svg>`
      : `Continue <svg class="ic"><use href="#i-arrow"></use></svg>`;
  next.disabled = false;
  next.style.opacity = state.step === 1 && state.serviceIds.size === 0 ? '0.55' : '';
}

function nextStep() {
  if (state.step === 1) {
    if (state.serviceIds.size === 0) {
      toast('Pick at least one grooming ritual', 'i-bell');
      return;
    }
    goToStep(2);
    return;
  }
  if (state.step === 2) {
    goToStep(3);
    return;
  }
  if (state.step === 3) {
    if (!state.time) {
      toast('Choose a time slot for your chair', 'i-clock');
      return;
    }
    goToStep(4);
  }
}

/* drawer service list */
function renderDrawerChips() {
  const counts = categoryCounts();
  const wrap = $('#drawerChips');
  wrap.innerHTML = CATEGORIES.map(
    (c) => `<button class="chip ${state.drawerCategory === c.id ? 'is-active' : ''}" data-dcat="${c.id}" type="button">${c.label} <b>${counts[c.id] ?? 0}</b></button>`
  ).join('');
  wrap.querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      state.drawerCategory = chip.dataset.dcat;
      renderDrawerChips();
      renderDrawerServices();
    })
  );
}

function renderDrawerServices() {
  const list = visibleServices({
    category: state.drawerCategory,
    query: state.drawerQuery,
    sort: state.sort,
  });
  const wrap = $('#drawerServices');
  if (!list.length) {
    wrap.innerHTML = `<p class="dempty" style="font-size:.8rem;color:var(--text-3);padding:18px 0">No services match — try another search.</p>`;
    return;
  }
  wrap.innerHTML = list
    .map(
      (s) => `
    <button class="dsvc ${state.serviceIds.has(s.id) ? 'is-selected' : ''}" data-id="${s.id}" type="button" aria-pressed="${state.serviceIds.has(s.id)}">
      <span class="dsvc__box">${svg('i-check')}</span>
      <span class="dsvc__main">
        <span class="dsvc__name">${s.name}</span>
        <span class="dsvc__meta">${CATEGORY_LABEL[s.cat]} · ${durationLabel(s.mins)}</span>
      </span>
      <span class="dsvc__price">${money(s.price)}</span>
    </button>`
    )
    .join('');
  wrap.querySelectorAll('.dsvc').forEach((row) =>
    row.addEventListener('click', () => toggleService(row.dataset.id))
  );
}

function initDrawerServices() {
  let debounce;
  $('#drawerSearch').addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.drawerQuery = e.target.value;
      renderDrawerServices();
    }, 120);
  });
}

/* ── dates & slots ─────────────────────────────────────── */
function buildDates() {
  const now = nairobiNow();
  const [y, m, d] = now.ymd.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const fmtDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const fmtNum = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' });
  const fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const list = [];
  for (let i = 0; i < 21; i++) {
    const date = new Date(base.getTime() + i * 86400000);
    list.push({
      index: i,
      date,
      weekday: date.getUTCDay(),
      dayName: fmtDay.format(date),
      dayNum: fmtNum.format(date),
      month: fmtMonth.format(date),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDay.format(date),
      long: fmtLong.format(date),
      isToday: i === 0,
      isSunday: date.getUTCDay() === 0,
    });
  }
  return list;
}

function renderDates() {
  if (!state.dates.length) state.dates = buildDates();
  const strip = $('#dateStrip');
  strip.innerHTML = state.dates
    .map(
      (d) => `
    <button class="dchip ${state.dateIndex === d.index ? 'is-selected' : ''} ${d.isToday && d.isSunday ? 'is-disabled' : ''}"
      data-date="${d.index}" type="button" aria-pressed="${state.dateIndex === d.index}"
      ${d.isToday && d.isSunday ? 'disabled' : ''}>
      <small>${d.dayName}</small>
      <strong>${d.dayNum}</strong>
      <span>${d.month}${d.isSunday ? ' · appt' : ''}</span>
    </button>`
    )
    .join('');
  strip.querySelectorAll('.dchip').forEach((chip) =>
    chip.addEventListener('click', () => {
      state.dateIndex = Number(chip.dataset.date);
      state.time = null;
      renderDates();
      renderSlots();
      renderSummary();
      updateStepNav();
    })
  );
  renderSlots();
}

function renderSlots() {
  const date = state.dates[state.dateIndex] ?? state.dates[0];
  const grid = $('#slotGrid');
  const now = nairobiNow();

  $('#slotDateLabel').textContent = date.long;
  $('#sundayNotice').hidden = !date.isSunday;
  $('#todayNotice').hidden = !date.isToday || date.isSunday;

  const openMin = date.isSunday ? 600 : HOURS.find((h) => h.day === date.weekday)?.openMin ?? 480;
  const closeMin = date.isSunday ? 1080 : 1200;
  $('#slotMeta').textContent = `${fmtTime(openMin)} – ${fmtTime(closeMin)}${date.isSunday ? ' · by appointment' : ''}`;

  const slots = [];
  for (let t = openMin; t <= closeMin - 30; t += 30) slots.push(t);

  grid.innerHTML = slots
    .map((t) => {
      const isPast = date.isToday && t <= now.minutes + 45;
      return `<button class="slot ${state.time === t ? 'is-selected' : ''}" data-time="${t}" type="button"
        aria-pressed="${state.time === t}" ${isPast ? 'disabled' : ''}>${fmtTime(t)}</button>`;
    })
    .join('');

  grid.querySelectorAll('.slot:not(:disabled)').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.time = Number(btn.dataset.time);
      grid.querySelectorAll('.slot').forEach((b) =>
        b.classList.toggle('is-selected', Number(b.dataset.time) === state.time)
      );
      renderSummary();
      updateStepNav();
    })
  );
}

function fmtTime(mins) {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

function chosenDate() {
  return state.dates[state.dateIndex] ?? state.dates[0];
}

function chosenBarber() {
  return BARBERS.find((b) => b.id === state.barberId) ?? BARBERS[0];
}

function renderSummary() {
  const wrap = $('#bookingSummary');
  if (!wrap) return;
  const list = selectedServices();
  const t = totals();
  const date = state.dates.length ? chosenDate() : null;
  if (!list.length) {
    wrap.innerHTML = `<p style="color:var(--text-3);font-size:.78rem">Your rituals will appear here once selected.</p>`;
    return;
  }
  wrap.innerHTML = `
    ${list
      .map(
        (s) => `<div class="summary__row"><span>${s.name} <em style="font-style:normal;opacity:.55">· ${durationLabel(s.mins)}</em></span><b>${money(s.price)}</b></div>`
      )
      .join('')}
    <div class="summary__div"></div>
    <div class="summary__row"><span>Barber</span><b>${chosenBarber().name}</b></div>
    <div class="summary__row"><span>Day</span><b>${date ? date.long : '—'}</b></div>
    <div class="summary__row"><span>Time</span><b>${state.time ? fmtTime(state.time) : 'Not chosen'}</b></div>
    <div class="summary__row"><span>Chair time</span><b>${durationLabel(t.mins)}</b></div>
    <div class="summary__div"></div>
    <div class="summary__row summary__total"><span>Total</span><b>${money(t.price)}</b></div>
    <div class="summary__row" style="font-size:.68rem;color:var(--text-3);opacity:.8"><span>Includes complimentary refreshments &amp; aftershave massage</span><b></b></div>`;
}

/* ── submit → WhatsApp ─────────────────────────────────── */
function initBookingForm() {
  const form = $('#bookingForm');
  const errorEl = $('#formError');
  const nameEl = $('#bookName');
  const phoneEl = $('#bookPhone');
  const notesEl = $('#bookNotes');

  [nameEl, phoneEl].forEach((el) =>
    el.addEventListener('input', () => el.classList.remove('is-invalid'))
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const digits = phone.replace(/[^\d]/g, '');

    errorEl.hidden = true;
    nameEl.classList.remove('is-invalid');
    phoneEl.classList.remove('is-invalid');

    if (name.length < 2) {
      errorEl.textContent = 'Please tell us your name so the lounge can greet you properly.';
      errorEl.hidden = false;
      nameEl.classList.add('is-invalid');
      nameEl.focus();
      return;
    }
    if (digits.length < 9) {
      errorEl.textContent = 'That phone number looks short — enter a valid WhatsApp number.';
      errorEl.hidden = false;
      phoneEl.classList.add('is-invalid');
      phoneEl.focus();
      return;
    }
    if (!state.time) {
      goToStep(3);
      toast('Pick a time slot first', 'i-clock');
      return;
    }

    booking.name = name;
    booking.phone = phone;
    booking.notes = notesEl.value.trim();

    window.open(buildWhatsAppUrl(), '_blank', 'noopener');
    toast('Opening WhatsApp with your booking…', 'i-whatsapp');
  });
}

function buildWhatsAppUrl() {
  const list = selectedServices();
  const t = totals();
  const date = chosenDate();
  const barber = chosenBarber();

  const lines = [
    'Hello Fresh Start Grooming Lounge! I would like to reserve a chair.',
    '',
    `Name: ${booking.name}`,
    `Phone: ${booking.phone}`,
    `Barber: ${barber.name}`,
    `Day: ${date.long}${date.isSunday ? ' (Sunday appointment)' : ''}`,
    `Time: ${fmtTime(state.time)}`,
    '',
    'Services:',
    ...list.map((s) => `• ${s.name} — ${money(s.price)} (${durationLabel(s.mins)})`),
    '',
    `Total: ${money(t.price)}`,
    `Chair time: ${durationLabel(t.mins)}`,
  ];
  if (booking.notes) lines.push('', `Notes: ${booking.notes}`);
  lines.push('', 'Please confirm my booking. Asante!');

  return `https://wa.me/${BUSINESS.phoneDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function initDrawer() {
  $$('[data-open-booking]').forEach((btn) =>
    btn.addEventListener('click', () => openDrawer(1))
  );
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerScrim').addEventListener('click', closeDrawer);
  $('#stepBack').addEventListener('click', () => goToStep(state.step - 1));
  $('#stepNext').addEventListener('click', nextStep);
  $('#claimOffer').addEventListener('click', () => {
    if (!state.serviceIds.has('freefriend')) state.serviceIds.add('freefriend');
    syncSelectionUI();
    openDrawer(1);
    toast('Offer applied — bring 2 friends, yours is free', 'i-sparkle');
  });
  $$('[data-pick-barber="any"]').forEach((el) =>
    el.addEventListener('click', () => {
      selectBarber('any', { from: 'grid' });
      $('#providers')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    })
  );

  // focus trap + escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#lightbox').hidden) closeLightbox();
      else if (!$('#bookingDrawer').hidden) closeDrawer();
      if (document.activeElement === $('#serviceSearch')) {
        $('#serviceSearch').blur();
      }
    }
    if (e.key === '/' && !isTyping(e.target)) {
      e.preventDefault();
      $('#serviceSearch')?.focus();
    }
    if (e.key === 'Tab' && !$('#bookingDrawer').hidden) {
      const focusables = $$(
        '#bookingDrawer button:not([hidden]):not(:disabled), #bookingDrawer a[href], #bookingDrawer input, #bookingDrawer textarea, #bookingDrawer select',
        $('#bookingDrawer')
      ).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

function isTyping(el) {
  return el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/* ══════════════════════════════════════════════════════════
   10 · Lightbox
   ══════════════════════════════════════════════════════════ */
function initLightbox() {
  const lb = $('#lightbox');
  const img = $('#lightboxImg');
  const cap = $('#lightboxCap');

  $$('#gallery .frame').forEach((frame) =>
    frame.addEventListener('click', () => {
      img.src = frame.dataset.src;
      img.alt = frame.querySelector('img')?.alt ?? '';
      cap.textContent = frame.dataset.caption ?? '';
      lb.hidden = false;
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => lb.classList.add('is-open'));
      $('#lightboxClose').focus();
    })
  );

  const close = closeLightbox;
  $('#lightboxClose').addEventListener('click', close);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });
  function closeLightbox() {
    lb.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => {
      lb.hidden = true;
      img.src = '';
    }, 320);
  }
  window.closeLightbox = closeLightbox;
}

/* ══════════════════════════════════════════════════════════
   11 · Toasts
   ══════════════════════════════════════════════════════════ */
function toast(message, icon = 'i-sparkle') {
  const stack = $('#toastStack');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast__ic">${svg(icon)}</span><span>${message}</span>`;
  stack.appendChild(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 400);
  }, 2900);
}

/* ══════════════════════════════════════════════════════════
   12 · Scroll: header, progress, reveal, counters, top
   ══════════════════════════════════════════════════════════ */
function initScrollEffects() {
  const header = $('#siteHeader');
  const bar = $('#scrollBar');
  const toTop = $('#toTop');

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-stuck', y > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${max > 0 ? clamp((y / max) * 100, 0, 100) : 0}%`;
    toTop.classList.toggle('is-visible', y > 640);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
  );

  // staggered delays
  $$('[data-delay]').forEach((el) => el.style.setProperty('--d', `${el.dataset.delay}ms`));
}

let revealObserver;

function initReveal() {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
  );
  revealInView();
}

function revealInView() {
  $$('.reveal:not(.is-in)').forEach((el) => {
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add('is-in');
  });
}

function initCounters() {
  const els = $$('[data-count]');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        const target = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimal || 0);
        if (prefersReduced) {
          el.textContent = target.toFixed(decimals);
          return;
        }
        const start = performance.now();
        const dur = 1300;
        const step = (now) => {
          const p = clamp((now - start) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target.toFixed(decimals);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 }
  );
  els.forEach((el) => observer.observe(el));
}

/* ══════════════════════════════════════════════════════════
   13 · Boot
   ══════════════════════════════════════════════════════════ */
function init() {
  $('#year').textContent = String(new Date().getFullYear() === 2026 ? 2026 : new Date().getFullYear());

  initTheme();
  initTabs();
  initHours();
  renderBarbers();
  renderChips();
  renderServices();
  initMenuTools();
  renderRefreshments();
  renderSocials();
  renderDates();
  renderDrawerBarbers();
  renderDrawerChips();
  renderDrawerServices();
  initDrawerServices();
  initDrawer();
  initBookingForm();
  initSelectionBar();
  initLightbox();
  initScrollEffects();
  initCounters();
  syncSelectionUI();

  // keep date strip truthful if the tab is left open past midnight
  setInterval(() => {
    state.dates = buildDates();
    if (state.dateIndex >= state.dates.length) state.dateIndex = 0;
    renderDates();
  }, 5 * 60 * 1000);

  runLoader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
