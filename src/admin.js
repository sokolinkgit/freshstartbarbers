/* ════════════════════════════════════════════════════════════
   Fresh Start Admin Mode — Supabase-powered dashboard
   CRUD for services, barbers, gallery images, ads, reviews,
   plus image storage management and the booking inbox.
   ════════════════════════════════════════════════════════════ */
import '@fontsource-variable/inter';
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import './admin.css';

import { supabase, SUPABASE_URL, IMAGE_BUCKET, imageUrl, isMissingSchema, withTimeout } from './lib/supabase.js';
import { CATEGORIES } from './data.js';
import { GALLERY_CAT_LABEL } from './lib/content.js';

/* ═══════════ Helpers ═══════════ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const svg = (id) => `<svg class="ic" aria-hidden="true"><use href="#${id}"></use></svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—';
const fmtDay = (d) => {
  if (!d) return '—';
  const dt = new Date(`${d}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

const state = {
  user: null,
  tab: 'overview',
  loading: false,
  filters: { services: '', barbers: '', gallery: '', ads: '', reviews: '', bookings: '' },
  bookingFilter: 'all',
  data: { services: [], barbers: [], gallery: [], ads: [], reviews: [], bookings: [] },
};

function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'toast--error' : ''}`;
  el.innerHTML = `${svg(type === 'error' ? 'i-alert' : 'i-check')}<span>${esc(message)}</span>`;
  $('#toastStack').appendChild(el);
  setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 450); }, 3600);
}

const VIEWS = ['viewLoading', 'viewLogin', 'viewSetup', 'viewClaim', 'viewDenied', 'viewError', 'app'];
function setView(id) {
  VIEWS.forEach((v) => { const el = document.getElementById(v); if (el) el.hidden = v !== id; });
}

function setBusy(on) {
  state.loading = on;
  $('#connStatus')?.classList.toggle('is-busy', on);
}

const errText = (err) => {
  if (!err) return 'Unknown error';
  if (err.code === '23505') return 'That ID already exists — pick a different one.';
  if (err.code === '42501' || /row-level security|policy/i.test(err.message || '')) return 'Permission denied — your account is not on the admin allow-list.';
  return err.message || String(err);
};

/* Extract the storage path from one of our own public URLs. */
function pathFromUrl(url) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

/* ═══════════ Modal ═══════════ */
function openModal(title, bodyHtml, onMount) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  onMount?.($('#modalBody'));
}
function closeModal() {
  $('#modal').hidden = true;
  $('#modalBody').innerHTML = '';
  document.body.style.overflow = '';
}
$$('[data-modal-close]').forEach((el) => el.addEventListener('click', closeModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function confirmDialog({ title, html, confirmLabel = 'Delete', danger = true, onConfirm }) {
  openModal(title, `
    <p class="confirm-text">${html}</p>
    <div class="form-foot">
      <button class="btn btn--ghost" data-modal-close type="button">Cancel</button>
      <button class="btn ${danger ? 'btn--danger' : 'btn--gold'}" id="confirmBtn" type="button">${svg(danger ? 'i-trash' : 'i-check')} ${esc(confirmLabel)}</button>
    </div>`, (root) => {
    $('[data-modal-close]', root).addEventListener('click', closeModal);
    $('#confirmBtn', root).addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try { await onConfirm(); closeModal(); }
      catch (err) { toast(errText(err), 'error'); btn.disabled = false; }
    });
  });
}

/* ═══════════ Auth flow ═══════════ */
async function boot() {
  setView('viewLoading');
  if (!supabase) {
    $('#errorMessage').textContent = 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
    setView('viewError');
    return;
  }
  let session = null;
  try {
    ({ data: { session } } = await withTimeout(supabase.auth.getSession(), 9000, 'session'));
  } catch (err) {
    $('#errorMessage').textContent = `Could not reach the Supabase backend (${errText(err)}). Check your connection and retry.`;
    setView('viewError');
    return;
  }
  if (!session?.user) { setView('viewLogin'); return; }
  await afterLogin(session.user);
}

async function afterLogin(user) {
  state.user = user;
  setView('viewLoading');
  let admins;
  try {
    const { data, error } = await withTimeout(supabase.from('admin_users').select('user_id, email'), 9000, 'admin check');
    if (error) throw error;
    admins = data || [];
  } catch (err) {
    if (isMissingSchema(err)) { setView('viewSetup'); return; }
    $('#errorMessage').textContent = `Signed in as ${user.email}, but the backend could not be reached: ${errText(err)}`;
    setView('viewError');
    return;
  }
  const me = admins.find((a) => a.user_id === user.id);
  if (me) { await enterApp(); return; }
  if (admins.length === 0) {
    $('#claimEmail').textContent = user.email;
    setView('viewClaim');
    return;
  }
  $('#deniedEmail').textContent = user.email;
  $('#deniedSql').textContent = `insert into public.admin_users (user_id, email)\nselect id, email from auth.users where email = '${user.email}';`;
  setView('viewDenied');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const errEl = $('#loginError');
  const btn = $('#loginBtn');
  errEl.hidden = true;
  if (!email || !password) { errEl.textContent = 'Enter your email and password.'; errEl.hidden = false; return; }
  btn.disabled = true;
  try {
    const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 12000, 'sign in');
    if (error) throw error;
    await afterLogin(data.user);
  } catch (err) {
    errEl.textContent = /invalid login/i.test(err.message || '')
      ? 'Wrong email or password. Accounts are created in Supabase → Authentication → Users.'
      : errText(err);
    errEl.hidden = false;
  } finally { btn.disabled = false; }
});

$('#claimBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const errEl = $('#claimError');
  btn.disabled = true; errEl.hidden = true;
  try {
    const { error } = await supabase.from('admin_users').insert({ user_id: state.user.id, email: state.user.email });
    if (error) throw error;
    toast('Admin access claimed — welcome to the chair');
    await afterLogin(state.user);
  } catch (err) {
    errEl.textContent = errText(err);
    errEl.hidden = false;
    btn.disabled = false;
  }
});

$('#setupRecheck').addEventListener('click', () => afterLogin(state.user));
$('#deniedRecheck').addEventListener('click', () => afterLogin(state.user));
$('#errorRetry').addEventListener('click', boot);
$$('[data-signout]').forEach((b) => b.addEventListener('click', async () => {
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
  window.location.reload();
}));

/* ═══════════ Data loading ═══════════ */
const TABLES = {
  services: 'services',
  barbers: 'barbers',
  gallery: 'gallery_images',
  ads: 'ads',
  reviews: 'reviews',
  bookings: 'bookings',
};

async function loadAll() {
  setBusy(true);
  try {
    const contentQuery = (table) => supabase.from(table).select('*').order('sort', { ascending: true }).order('created_at', { ascending: true });
    const [services, barbers, gallery, ads, reviews, bookings] = await withTimeout(Promise.all([
      contentQuery('services'),
      contentQuery('barbers'),
      contentQuery('gallery_images'),
      contentQuery('ads'),
      contentQuery('reviews'),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(300),
    ]), 15000, 'load');
    const entries = { services, barbers, gallery, ads, reviews, bookings };
    const firstError = Object.values(entries).find((r) => r.error)?.error;
    if (firstError && Object.values(entries).every((r) => r.error)) throw firstError;
    for (const [key, res] of Object.entries(entries)) {
      if (res.error) { toast(`Could not load ${key}: ${errText(res.error)}`, 'error'); continue; }
      state.data[key] = res.data || [];
    }
    renderAll();
  } catch (err) {
    if (isMissingSchema(err)) { setView('viewSetup'); return; }
    toast(`Load failed: ${errText(err)}`, 'error');
  } finally { setBusy(false); }
}

async function reload(key) {
  const table = TABLES[key];
  const q = key === 'bookings'
    ? supabase.from(table).select('*').order('created_at', { ascending: false }).limit(300)
    : supabase.from(table).select('*').order('sort', { ascending: true }).order('created_at', { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  state.data[key] = data || [];
  renderAll();
}

async function enterApp() {
  setView('app');
  $('#sideUser').textContent = state.user.email;
  await loadAll();
  switchTab('overview');
}

/* ═══════════ Entity configuration ═══════════ */
const CAT_OPTIONS = CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({ value: c.id, label: c.label }));
const GALLERY_CATS = Object.entries(GALLERY_CAT_LABEL).map(([value, label]) => ({ value, label }));
const serviceOptions = () => state.data.services.map((s) => ({ value: s.id, label: `${s.name} · ${money(s.price)}` }));

const ENTITIES = {
  services: {
    label: 'Service', icon: 'i-scissors', pk: 'id', slugPk: true,
    fields: [
      { key: 'id', label: 'ID (slug)', type: 'text', required: true, lockOnEdit: true, wide: false, help: 'Lowercase with dashes, e.g. “skin-fade”. Powers booking links — don’t change lightly.' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: CAT_OPTIONS },
      { key: 'price', label: 'Price (KSh)', type: 'number', required: true, min: 0 },
      { key: 'mins', label: 'Chair time (minutes)', type: 'number', required: true, min: 5 },
      { key: 'sort', label: 'Sort order', type: 'number', help: 'Lower numbers appear first.' },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'tags', label: 'Search tags', type: 'text', wide: true, help: 'Space-separated keywords customers might search, e.g. “fade skin razor”.' },
      { key: 'badge', label: 'Badge (optional)', type: 'text', placeholder: 'e.g. Mon–Wed · Referral' },
      { key: 'days', label: 'Available days (optional)', type: 'text', placeholder: 'e.g. 1,2,3', help: '0=Sun, 1=Mon … 6=Sat. Leave empty for every day.' },
      { key: 'vip', label: 'VIP Collection ★', type: 'checkbox' },
      { key: 'active', label: 'Live on the website', type: 'checkbox', default: true },
    ],
    toRow(v) {
      const days = String(v.days || '').split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
      return {
        id: slugify(v.id), category: v.category, name: v.name.trim(), description: v.description || '',
        price: Math.round(Number(v.price) || 0), mins: Math.round(Number(v.mins) || 30),
        tags: v.tags || '', badge: v.badge?.trim() || null, vip: !!v.vip,
        days: days.length ? days : null, sort: Math.round(Number(v.sort) || 0), active: !!v.active,
      };
    },
    fromRow(r) { return { ...r, days: Array.isArray(r.days) ? r.days.join(',') : '' }; },
    validate(row) {
      if (!row.id) return 'Give the service an ID (letters, numbers, dashes).';
      if (!row.name) return 'Name is required.';
      if (row.mins <= 0) return 'Chair time must be at least 1 minute.';
      return null;
    },
  },
  barbers: {
    label: 'Barber', icon: 'i-users', pk: 'id', slugPk: true,
    fields: [
      { key: 'id', label: 'ID (slug)', type: 'text', required: true, lockOnEdit: true, help: 'e.g. “starkid”. Use “any” for the Any Available chair.' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role / title', type: 'text', placeholder: 'e.g. Fade Specialist' },
      { key: 'initials', label: 'Initials (no photo)', type: 'text', placeholder: 'e.g. SB' },
      { key: 'img', label: 'Portrait', type: 'image', folder: 'barbers', wide: true },
      { key: 'specialties', label: 'Specialties', type: 'text', wide: true, placeholder: 'Skin fades, Beard sculpt, Kids cuts', help: 'Comma-separated — shown as chips on the card.' },
      { key: 'note', label: 'Card note', type: 'textarea', wide: true },
      { key: 'sort', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Live on the website', type: 'checkbox', default: true },
    ],
    toRow(v) {
      return {
        id: slugify(v.id), name: v.name.trim(), role: v.role?.trim() || 'Barber',
        img: v.img?.trim() || null, initials: v.initials?.trim() || v.name.trim().slice(0, 2).toUpperCase(),
        specialties: String(v.specialties || '').split(',').map((s) => s.trim()).filter(Boolean),
        note: v.note || '', sort: Math.round(Number(v.sort) || 0), active: !!v.active,
      };
    },
    fromRow(r) { return { ...r, specialties: (r.specialties || []).join(', ') }; },
    validate(row) { return row.id && row.name ? null : 'ID and name are required.'; },
  },
  gallery: {
    label: 'Gallery image', icon: 'i-image', pk: 'id',
    fields: [
      { key: 'src', label: 'Image', type: 'image', folder: 'gallery', wide: true, required: true },
      { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { key: 'category', label: 'Category', type: 'select', options: GALLERY_CATS },
      { key: 'service_id', label: '“Book this look” links to', type: 'select', options: serviceOptions, optional: true, placeholder: 'No booking link' },
      { key: 'detail', label: 'Caption / detail', type: 'textarea', wide: true, placeholder: 'Clipper-blended fade · razor line · 40 min' },
      { key: 'sort', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Live on the website', type: 'checkbox', default: true },
    ],
    toRow(v) {
      return {
        title: v.title.trim(), detail: v.detail || '', category: v.category,
        src: v.src?.trim() || '', storage_path: v.storage_path || null,
        service_id: v.service_id || null, sort: Math.round(Number(v.sort) || 0), active: !!v.active,
      };
    },
    fromRow(r) { return { ...r }; },
    validate(row) {
      if (!row.title) return 'Title is required.';
      if (!row.src) return 'Upload an image or paste an image URL.';
      return null;
    },
  },
  ads: {
    label: 'Ad', icon: 'i-megaphone', pk: 'id',
    fields: [
      { key: 'title', label: 'Headline', type: 'text', required: true, wide: true, placeholder: 'e.g. December offer — free beard trim with every VIP ritual' },
      { key: 'body', label: 'Body text (banner ads)', type: 'textarea', wide: true, placeholder: 'Optional supporting line shown on the gold banner.' },
      { key: 'placement', label: 'Placement', type: 'select', options: [
        { value: 'ticker', label: 'Ticker — rotating line in the top bar' },
        { value: 'banner', label: 'Banner — gold strip under the header' },
      ] },
      { key: 'service_id', label: 'Button books this service', type: 'select', options: serviceOptions, optional: true, placeholder: 'No booking button' },
      { key: 'link_url', label: '…or button opens this URL', type: 'url', wide: true, placeholder: 'https://…' },
      { key: 'starts_at', label: 'Starts (optional)', type: 'datetime' },
      { key: 'ends_at', label: 'Ends (optional)', type: 'datetime' },
      { key: 'sort', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Live on the website', type: 'checkbox', default: true },
    ],
    toRow(v) {
      return {
        title: v.title.trim(), body: v.body || '', placement: v.placement,
        service_id: v.service_id || null, link_url: v.link_url?.trim() || null,
        starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null,
        ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
        sort: Math.round(Number(v.sort) || 0), active: !!v.active,
      };
    },
    fromRow(r) {
      const toLocal = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      return { ...r, starts_at: toLocal(r.starts_at), ends_at: toLocal(r.ends_at) };
    },
    validate(row) {
      if (!row.title) return 'Headline is required.';
      if (row.starts_at && row.ends_at && row.ends_at < row.starts_at) return 'End date must be after the start date.';
      return null;
    },
  },
  reviews: {
    label: 'Review', icon: 'i-star', pk: 'id',
    fields: [
      { key: 'name', label: 'Client name', type: 'text', required: true },
      { key: 'area', label: 'Area / origin', type: 'text', placeholder: 'e.g. Westlands, Nairobi' },
      { key: 'stars', label: 'Stars', type: 'select', options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` })) },
      { key: 'when_label', label: 'When (label)', type: 'text', placeholder: 'e.g. 1w ago' },
      { key: 'service', label: 'Service tag', type: 'text', placeholder: 'e.g. Bespoke Haircut' },
      { key: 'hue', label: 'Avatar colour', type: 'color', default: '#c9a24d' },
      { key: 'body', label: 'Review text', type: 'textarea', required: true, wide: true },
      { key: 'initials', label: 'Initials (optional)', type: 'text', placeholder: 'Auto from name' },
      { key: 'sort', label: 'Sort order', type: 'number' },
      { key: 'active', label: 'Live on the website', type: 'checkbox', default: true },
    ],
    toRow(v) {
      return {
        name: v.name.trim(), area: v.area || '', stars: Number(v.stars) || 5,
        when_label: v.when_label || '', service: v.service || '', hue: v.hue || '#c9a24d',
        body: v.body || '', initials: v.initials?.trim() || v.name.trim().slice(0, 2).toUpperCase(),
        sort: Math.round(Number(v.sort) || 0), active: !!v.active,
      };
    },
    fromRow(r) { return { ...r }; },
    validate(row) { return row.name && row.body ? null : 'Client name and review text are required.'; },
  },
};

/* ═══════════ Form building ═══════════ */
function fieldHtml(f, value) {
  const v = value ?? f.default ?? '';
  const wide = f.wide ? ' field--wide' : '';
  const req = f.required ? ' required' : '';
  const help = f.help ? `<small>${esc(f.help)}</small>` : '';
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';

  if (f.type === 'checkbox') {
    return `<label class="field field--check${wide}"><input type="checkbox" data-input="${f.key}" ${v ? 'checked' : ''} /><span>${esc(f.label)}</span></label>`;
  }
  if (f.type === 'textarea') {
    return `<label class="field${wide}"><span>${esc(f.label)}</span><textarea data-input="${f.key}" rows="3"${ph}${req}>${esc(v)}</textarea>${help}</label>`;
  }
  if (f.type === 'select') {
    const opts = typeof f.options === 'function' ? f.options() : f.options;
    const optional = f.optional ? `<option value="">${esc(f.placeholder || 'None')}</option>` : '';
    return `<label class="field${wide}"><span>${esc(f.label)}</span>
      <select data-input="${f.key}">${optional}${opts.map((o) => `<option value="${esc(o.value)}" ${String(v) === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${help}</label>`;
  }
  if (f.type === 'image') {
    return `<div class="field${wide}"><span>${esc(f.label)}</span>
      <div class="img-preview">
        ${v ? `<img data-preview="${f.key}" src="${esc(v)}" alt="Preview" />` : `<span class="img-preview__none" data-preview="${f.key}">${svg('i-image')}</span>`}
        <div style="flex:1; min-width:0; display:grid; gap:8px;">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" data-file="${f.key}" />
          <input type="url" data-input="${f.key}" value="${esc(v)}" placeholder="…or paste an image URL" />
          <small>JPG / PNG / WebP / AVIF, max 10 MB. Uploading stores it in Supabase Storage and uses its public URL.</small>
        </div>
      </div></div>`;
  }
  const type = f.type === 'datetime' ? 'datetime-local' : f.type === 'number' ? 'number' : f.type === 'color' ? 'color' : f.type === 'url' ? 'url' : 'text';
  const min = f.min != null ? ` min="${f.min}"` : '';
  return `<label class="field${wide}"><span>${esc(f.label)}</span><input type="${type}" data-input="${f.key}" value="${esc(v)}"${ph}${req}${min} />${help}</label>`;
}

function collectForm(root) {
  const values = {};
  $$('[data-input]', root).forEach((input) => {
    values[input.dataset.input] = input.type === 'checkbox' ? input.checked : input.value;
  });
  return values;
}

function wireImagePreviews(root) {
  $$('[data-file]', root).forEach((fileInput) => {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const key = fileInput.dataset.file;
      const url = URL.createObjectURL(file);
      const preview = $(`[data-preview="${key}"]`, root);
      if (preview) {
        const img = document.createElement('img');
        img.src = url; img.alt = 'Preview'; img.dataset.preview = key;
        preview.replaceWith(img);
      }
      const urlInput = $(`[data-input="${key}"]`, root);
      if (urlInput) urlInput.value = '';
    });
  });
}

/* ═══════════ Image upload ═══════════ */
async function uploadImage(file, folder) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Image is larger than 10 MB — please resize it first.');
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) throw new Error('Only JPG, PNG, WebP, GIF or AVIF images are allowed.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
  const path = `${folder}/${Date.now()}-${base}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return path;
}

async function removeStoragePaths(paths) {
  const clean = [...new Set(paths.filter(Boolean))];
  if (!clean.length) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(clean);
  if (error) console.warn('Storage cleanup:', error.message);
}

/* ═══════════ CRUD ═══════════ */
function openEntityModal(key, row = null) {
  const ent = ENTITIES[key];
  const values = row ? ent.fromRow(row) : {};
  const title = `${row ? 'Edit' : 'Add'} ${ent.label.toLowerCase()}`;
  const body = `
    <form id="entityForm" class="form-grid" novalidate>
      ${ent.fields.map((f) => fieldHtml(f, values[f.key])).join('')}
      <p class="form-error" id="entityError" hidden></p>
      <div class="form-foot field--wide">
        <button class="btn btn--ghost" data-modal-close type="button">Cancel</button>
        <button class="btn btn--gold" id="entitySave" type="submit">${svg('i-check')} ${row ? 'Save changes' : `Add ${ent.label.toLowerCase()}`}</button>
      </div>
    </form>`;
  openModal(title, body, (root) => {
    $('[data-modal-close]', root).addEventListener('click', closeModal);
    wireImagePreviews(root);
    if (ent.slugPk && !row) {
      const idInput = $('[data-input="id"]', root);
      const nameInput = $('[data-input="name"]', root) || $('[data-input="title"]', root);
      nameInput?.addEventListener('blur', () => { if (!idInput.value) idInput.value = slugify(nameInput.value); });
    }
    if (ent.slugPk && row) { const idInput = $('[data-input="id"]', root); if (idInput) idInput.disabled = true; }

    $('#entityForm', root).addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = $('#entityError', root);
      const btn = $('#entitySave', root);
      errEl.hidden = true;
      btn.disabled = true;
      try {
        const v = collectForm(root);
        if (ent.slugPk && row) v.id = row.id;

        /* Upload any picked image files first. */
        const uploaded = [];
        for (const f of ent.fields.filter((x) => x.type === 'image')) {
          const file = $(`[data-file="${f.key}"]`, root)?.files?.[0];
          if (file) {
            btn.innerHTML = `${svg('i-upload')} Uploading image…`;
            const path = await uploadImage(file, f.folder || 'misc');
            v[f.key] = imageUrl(path);
            if (key === 'gallery') v.storage_path = path;
            uploaded.push({ field: f.key, path, old: row?.[f.key] });
          }
        }

        const payload = ent.toRow(v);
        const invalid = ent.validate?.(payload);
        if (invalid) { await removeStoragePaths(uploaded.map((u) => u.path)); throw new Error(invalid); }

        btn.innerHTML = `${svg('i-check')} Saving…`;
        const table = TABLES[key];
        let error;
        if (row) ({ error } = await supabase.from(table).update(payload).eq(ent.pk, row[ent.pk]));
        else ({ error } = await supabase.from(table).insert(payload));
        if (error) { await removeStoragePaths(uploaded.map((u) => u.path)); throw error; }

        /* Clean up replaced storage files. */
        for (const u of uploaded) {
          const oldPath = key === 'gallery' ? row?.storage_path : pathFromUrl(u.old);
          if (oldPath && oldPath !== u.path) await removeStoragePaths([oldPath]);
        }

        toast(`${ent.label} ${row ? 'updated' : 'added'} — live on the website`);
        closeModal();
        await reload(key);
      } catch (err) {
        errEl.textContent = errText(err);
        errEl.hidden = false;
        btn.disabled = false;
        btn.innerHTML = `${svg('i-check')} ${row ? 'Save changes' : `Add ${ent.label.toLowerCase()}`}`;
      }
    });
  });
}

function deleteEntity(key, row) {
  const ent = ENTITIES[key];
  const name = row.name || row.title || row.id;
  const extra = key === 'gallery' && (row.storage_path || pathFromUrl(row.src))
    ? '<br /><br />The uploaded image file will also be deleted from storage.' : '';
  confirmDialog({
    title: `Delete ${ent.label.toLowerCase()}?`,
    html: `<strong>${esc(name)}</strong> will be permanently removed from the website.${extra}<br />This cannot be undone.`,
    onConfirm: async () => {
      const { error } = await supabase.from(TABLES[key]).delete().eq(ent.pk, row[ent.pk]);
      if (error) throw error;
      if (key === 'gallery') await removeStoragePaths([row.storage_path || pathFromUrl(row.src)]);
      if (key === 'barbers') await removeStoragePaths([pathFromUrl(row.img)]);
      toast(`${ent.label} deleted`);
      await reload(key);
    },
  });
}

async function toggleActive(key, row, on) {
  try {
    const { error } = await supabase.from(TABLES[key]).update({ active: on }).eq(ENTITIES[key].pk, row[ENTITIES[key].pk]);
    if (error) throw error;
    row.active = on;
    toast(`${row.name || row.title} ${on ? 'is now live' : 'hidden from the website'}`);
    renderAll();
  } catch (err) { toast(errText(err), 'error'); renderAll(); }
}

/* ═══════════ Rendering ═══════════ */
const switchHtml = (key, row) => `
  <label class="switch" title="${row.active ? 'Live — click to hide' : 'Hidden — click to publish'}">
    <input type="checkbox" data-toggle="${key}" data-id="${esc(row.id)}" ${row.active ? 'checked' : ''} /><i></i>
  </label>`;

const actionsHtml = (key, row) => `
  <span class="cell-actions">
    <button class="icon-btn" data-edit="${key}" data-id="${esc(row.id)}" type="button" title="Edit" aria-label="Edit">${svg('i-edit')}</button>
    <button class="icon-btn icon-btn--danger" data-delete="${key}" data-id="${esc(row.id)}" type="button" title="Delete" aria-label="Delete">${svg('i-trash')}</button>
  </span>`;

const matches = (key, row) => {
  const q = state.filters[key]?.trim().toLowerCase();
  if (!q) return true;
  return JSON.stringify(row).toLowerCase().includes(q);
};

function emptyHtml(icon, text) {
  return `<div class="empty">${svg(icon)}<span>${esc(text)}</span></div>`;
}

function renderServices() {
  const rows = state.data.services.filter((r) => matches('services', r));
  const wrap = $('#table-services');
  if (!rows.length) { wrap.innerHTML = emptyHtml('i-scissors', 'No services yet — add your first ritual.'); return; }
  wrap.innerHTML = `<table class="adm"><thead><tr>
    <th>Service</th><th>Category</th><th>Price</th><th>Time</th><th>Flags</th><th>Live</th><th></th>
  </tr></thead><tbody>${rows.map((r) => `
    <tr>
      <td><span class="cell-main"><b>${esc(r.name)}</b><small>${esc(r.id)}${r.days?.length ? ` · days ${r.days.join(',')}` : ''}</small></span></td>
      <td>${esc(CAT_OPTIONS.find((c) => c.value === r.category)?.label || r.category)}</td>
      <td><b>${money(r.price)}</b></td>
      <td>${r.mins} min</td>
      <td>${r.vip ? '<span class="pill pill--gold">★ VIP</span>' : ''}${r.badge ? ` <span class="pill">${esc(r.badge)}</span>` : ''}</td>
      <td>${switchHtml('services', r)}</td>
      <td>${actionsHtml('services', r)}</td>
    </tr>`).join('')}</tbody></table>`;
}

function renderBarbers() {
  const rows = state.data.barbers.filter((r) => matches('barbers', r));
  const wrap = $('#table-barbers');
  if (!rows.length) { wrap.innerHTML = emptyHtml('i-users', 'No barbers yet — add the crew.'); return; }
  wrap.innerHTML = `<table class="adm"><thead><tr>
    <th>Barber</th><th>Role</th><th>Specialties</th><th>Live</th><th></th>
  </tr></thead><tbody>${rows.map((r) => `
    <tr>
      <td><span style="display:flex;align-items:center;gap:12px;">
        ${r.img ? `<img class="row-thumb" src="${esc(r.img)}" alt="" loading="lazy" />` : `<span class="row-avatar">${esc(r.initials || r.name.slice(0, 2))}</span>`}
        <span class="cell-main"><b>${esc(r.name)}</b><small>${esc(r.id)}</small></span></span></td>
      <td>${esc(r.role)}</td>
      <td>${(r.specialties || []).map((s) => `<span class="pill">${esc(s)}</span>`).join(' ')}</td>
      <td>${switchHtml('barbers', r)}</td>
      <td>${actionsHtml('barbers', r)}</td>
    </tr>`).join('')}</tbody></table>`;
}

function renderGallery() {
  const rows = state.data.gallery.filter((r) => matches('gallery', r));
  const wrap = $('#galleryAdmin');
  if (!rows.length) { wrap.innerHTML = emptyHtml('i-image', 'No gallery images yet — upload your first shot.'); return; }
  wrap.innerHTML = rows.map((r) => `
    <article class="gcard ${r.active ? '' : 'is-off'}">
      <div class="gcard__img">
        <img src="${esc(r.src)}" alt="${esc(r.title)}" loading="lazy" />
        <span class="gcard__badges">
          <span class="pill pill--gold">${esc(GALLERY_CAT_LABEL[r.category] || r.category)}</span>
          ${r.service_id ? '<span class="pill pill--green">Bookable</span>' : ''}
          ${r.storage_path || pathFromUrl(r.src) ? '<span class="pill pill--blue">Uploaded</span>' : '<span class="pill">Built-in</span>'}
        </span>
      </div>
      <div class="gcard__body">
        <strong>${esc(r.title)}</strong>
        <small>${esc(r.detail || '')}</small>
      </div>
      <div class="gcard__foot">
        ${switchHtml('gallery', r)}
        ${actionsHtml('gallery', r)}
      </div>
    </article>`).join('');
}

function adSchedule(r) {
  const now = Date.now();
  if (r.active && r.starts_at && new Date(r.starts_at).getTime() > now) return '<span class="pill pill--warn">Scheduled</span>';
  if (r.active && r.ends_at && new Date(r.ends_at).getTime() < now) return '<span class="pill pill--red">Expired</span>';
  if (r.active) return '<span class="pill pill--green">Running</span>';
  return '<span class="pill">Paused</span>';
}

function renderAds() {
  const rows = state.data.ads.filter((r) => matches('ads', r));
  const wrap = $('#table-ads');
  if (!rows.length) { wrap.innerHTML = emptyHtml('i-megaphone', 'No ads yet — create an announcement or offer.'); return; }
  wrap.innerHTML = `<table class="adm"><thead><tr>
    <th>Ad</th><th>Placement</th><th>Status</th><th>Schedule</th><th>Live</th><th></th>
  </tr></thead><tbody>${rows.map((r) => `
    <tr>
      <td><span class="cell-main"><b>${esc(r.title)}</b><small>${esc(r.body || (r.service_id ? `Books: ${r.service_id}` : r.link_url || ''))}</small></span></td>
      <td><span class="pill ${r.placement === 'banner' ? 'pill--gold' : 'pill--blue'}">${r.placement === 'banner' ? 'Banner' : 'Ticker'}</span></td>
      <td>${adSchedule(r)}</td>
      <td><small>${r.starts_at ? fmtDate(r.starts_at) : 'now'} → ${r.ends_at ? fmtDate(r.ends_at) : '∞'}</small></td>
      <td>${switchHtml('ads', r)}</td>
      <td>${actionsHtml('ads', r)}</td>
    </tr>`).join('')}</tbody></table>`;
}

function renderReviews() {
  const rows = state.data.reviews.filter((r) => matches('reviews', r));
  const wrap = $('#table-reviews');
  if (!rows.length) { wrap.innerHTML = emptyHtml('i-star', 'No reviews yet — showcase your five-star feedback.'); return; }
  wrap.innerHTML = `<table class="adm"><thead><tr>
    <th>Client</th><th>Stars</th><th>Review</th><th>Service</th><th>Live</th><th></th>
  </tr></thead><tbody>${rows.map((r) => `
    <tr>
      <td><span style="display:flex;align-items:center;gap:12px;">
        <span class="row-avatar" style="background:${esc(r.hue)}22;color:${esc(r.hue)}">${esc(r.initials)}</span>
        <span class="cell-main"><b>${esc(r.name)}</b><small>${esc(r.area)}${r.when_label ? ` · ${esc(r.when_label)}` : ''}</small></span></span></td>
      <td><span class="pill pill--gold">${'★'.repeat(r.stars)}</span></td>
      <td style="max-width:340px;"><small>${esc((r.body || '').slice(0, 110))}${(r.body || '').length > 110 ? '…' : ''}</small></td>
      <td><small>${esc(r.service)}</small></td>
      <td>${switchHtml('reviews', r)}</td>
      <td>${actionsHtml('reviews', r)}</td>
    </tr>`).join('')}</tbody></table>`;
}

const STATUS_LABEL = { new: 'New', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

function renderBookings() {
  let rows = state.data.bookings.filter((r) => matches('bookings', r));
  if (state.bookingFilter !== 'all') rows = rows.filter((r) => r.status === state.bookingFilter);
  const wrap = $('#table-bookings');
  if (!rows.length) { wrap.innerHTML = emptyHtml('i-inbox', 'No booking requests here yet. Website reservations appear in this inbox automatically.'); return; }
  wrap.innerHTML = `<table class="adm"><thead><tr>
    <th>Client</th><th>Visit</th><th>Rituals</th><th>Total</th><th>Received</th><th>Status</th><th></th>
  </tr></thead><tbody>${rows.map((r) => {
    const svcs = Array.isArray(r.services) ? r.services : [];
    return `
    <tr>
      <td><span class="cell-main"><b>${esc(r.name)}</b><small>${esc(r.phone)} · ${esc(r.barber_name || r.barber_id || '')}</small></span></td>
      <td><span class="cell-main"><b>${fmtDay(r.visit_date)}</b><small>${esc(r.visit_time || '')}</small></span></td>
      <td><small>${svcs.length} selected${svcs[0] ? ` · ${esc(svcs[0].name)}${svcs.length > 1 ? ` +${svcs.length - 1}` : ''}` : ''}</small></td>
      <td><b>${money(r.total_price)}</b></td>
      <td><small>${fmtDate(r.created_at)}</small></td>
      <td><select class="booking-status s-${esc(r.status)}" data-booking-status="${esc(r.id)}" aria-label="Booking status">
        ${Object.entries(STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${r.status === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></td>
      <td><span class="cell-actions">
        <button class="icon-btn" data-booking-view="${esc(r.id)}" type="button" title="View details" aria-label="View">${svg('i-eye')}</button>
        <a class="icon-btn" href="https://wa.me/${esc(String(r.phone || '').replace(/\D/g, '').replace(/^0/, '254'))}" target="_blank" rel="noopener" title="WhatsApp client" aria-label="WhatsApp">${svg('i-whatsapp')}</a>
        <button class="icon-btn icon-btn--danger" data-booking-delete="${esc(r.id)}" type="button" title="Delete" aria-label="Delete">${svg('i-trash')}</button>
      </span></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function viewBooking(r) {
  const svcs = Array.isArray(r.services) ? r.services : [];
  openModal(`Booking · ${r.name}`, `
    <div class="booking-detail">
      <dl>
        <dt>Status</dt><dd><span class="pill pill--gold">${esc(STATUS_LABEL[r.status] || r.status)}</span></dd>
        <dt>Phone</dt><dd><a href="tel:${esc(r.phone)}">${esc(r.phone)}</a></dd>
        <dt>Barber</dt><dd>${esc(r.barber_name || r.barber_id || 'Any')}</dd>
        <dt>When</dt><dd>${fmtDay(r.visit_date)} · ${esc(r.visit_time || '—')}</dd>
        <dt>Visit type</dt><dd>${esc(r.visit_type || '—')}</dd>
        <dt>Guest</dt><dd>${esc(r.guest_status || '—')}</dd>
        <dt>Received</dt><dd>${fmtDate(r.created_at)}</dd>
      </dl>
      <div><strong>Rituals</strong>
        <ul>${svcs.map((s) => `<li>${esc(s.name)} — ${money(s.price)} (${s.mins} min)</li>`).join('') || '<li>—</li>'}</ul>
      </div>
      <dl>
        <dt>Total</dt><dd><strong>${money(r.total_price)}</strong> · ${r.total_mins} min chair time</dd>
        ${r.notes ? `<dt>Notes</dt><dd>${esc(r.notes)}</dd>` : ''}
      </dl>
      <div class="form-foot">
        <a class="btn btn--gold" href="https://wa.me/${esc(String(r.phone || '').replace(/\D/g, '').replace(/^0/, '254'))}?text=${encodeURIComponent(`Hello ${r.name}, this is Fresh Start Grooming Lounge confirming your chair on ${fmtDay(r.visit_date)} at ${r.visit_time || 'your chosen time'}.`)}" target="_blank" rel="noopener">${svg('i-whatsapp')} Confirm on WhatsApp</a>
        <button class="btn btn--ghost" data-modal-close type="button">Close</button>
      </div>
    </div>`, (root) => { $('[data-modal-close]', root).addEventListener('click', closeModal); });
}

/* ── Storage browser ── */
async function renderStorage() {
  const wrap = $('#storageList');
  wrap.innerHTML = `<div class="empty"><div class="spinner" style="margin:0;"></div><span>Listing files…</span></div>`;
  try {
    const files = [];
    const { data: root, error } = await supabase.storage.from(IMAGE_BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    for (const entry of root || []) {
      if (entry.id === null) {
        const { data: inner, error: e2 } = await supabase.storage.from(IMAGE_BUCKET).list(entry.name, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
        if (e2) throw e2;
        (inner || []).forEach((f) => { if (f.id !== null) files.push({ ...f, path: `${entry.name}/${f.name}` }); });
      } else files.push({ ...entry, path: entry.name });
    }
    if (!files.length) { wrap.innerHTML = emptyHtml('i-image', 'No uploaded files yet. Images you upload appear here.'); return; }
    const used = new Set();
    state.data.gallery.forEach((g) => { const p = g.storage_path || pathFromUrl(g.src); if (p) used.add(p); });
    state.data.barbers.forEach((b) => { const p = pathFromUrl(b.img); if (p) used.add(p); });
    files.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    wrap.innerHTML = files.map((f) => `
      <div class="storage-file">
        <img src="${esc(imageUrl(f.path))}" alt="" loading="lazy" />
        <span class="storage-file__meta">
          <b>${esc(f.path)}</b>
          <small>${f.metadata?.size ? fmtBytes(f.metadata.size) : ''} ${f.created_at ? `· ${fmtDate(f.created_at)}` : ''}</small>
        </span>
        ${used.has(f.path) ? '<span class="pill pill--green">In use</span>' : '<span class="pill">Unused</span>'}
        <button class="icon-btn" data-copy-url="${esc(f.path)}" type="button" title="Copy public URL" aria-label="Copy URL">${svg('i-copy')}</button>
        <button class="icon-btn icon-btn--danger" data-storage-delete="${esc(f.path)}" data-in-use="${used.has(f.path) ? '1' : ''}" type="button" title="Delete file" aria-label="Delete file">${svg('i-trash')}</button>
      </div>`).join('');
  } catch (err) {
    wrap.innerHTML = emptyHtml('i-alert', `Could not list storage: ${errText(err)}`);
  }
}

/* ── Overview ── */
function renderOverview() {
  const d = state.data;
  const active = (rows) => rows.filter((r) => r.active).length;
  const newBookings = d.bookings.filter((b) => b.status === 'new').length;
  const stats = [
    { tab: 'services', icon: 'i-scissors', value: d.services.length, label: 'Services', sub: `${active(d.services)} live` },
    { tab: 'barbers', icon: 'i-users', value: d.barbers.length, label: 'Barbers', sub: `${active(d.barbers)} live` },
    { tab: 'gallery', icon: 'i-image', value: d.gallery.length, label: 'Gallery images', sub: `${active(d.gallery)} live` },
    { tab: 'ads', icon: 'i-megaphone', value: active(d.ads), label: 'Active ads', sub: `${d.ads.length} total` },
    { tab: 'reviews', icon: 'i-star', value: d.reviews.length, label: 'Reviews', sub: `${active(d.reviews)} live` },
    { tab: 'bookings', icon: 'i-inbox', value: newBookings, label: 'New bookings', sub: `${d.bookings.length} total` },
  ];
  $('#statGrid').innerHTML = stats.map((s) => `
    <button class="stat" data-goto-tab="${s.tab}" type="button">
      <span class="stat__ic">${svg(s.icon)}</span>
      <strong>${s.value}</strong><span>${s.label}</span><small>${s.sub}</small>
    </button>`).join('');

  const recent = d.bookings.slice(0, 5);
  $('#recentBookings').innerHTML = recent.length ? recent.map((r) => `
    <div class="recent-booking">
      <span class="row-avatar">${esc((r.name || '?').slice(0, 2).toUpperCase())}</span>
      <span class="recent-booking__meta"><b>${esc(r.name)}</b><small>${fmtDay(r.visit_date)} · ${esc(r.visit_time || '')} · ${money(r.total_price)}</small></span>
      <span class="pill ${r.status === 'new' ? 'pill--gold' : r.status === 'confirmed' ? 'pill--green' : r.status === 'cancelled' ? 'pill--red' : 'pill--blue'}">${esc(STATUS_LABEL[r.status] || r.status)}</span>
      <button class="icon-btn" data-booking-view="${esc(r.id)}" type="button" aria-label="View booking">${svg('i-eye')}</button>
    </div>`).join('') : emptyHtml('i-inbox', 'No booking requests yet — they land here the moment a client reserves on the website.');

  $('#backendInfo').innerHTML = `
    <div><b>Project</b><span><a href="https://supabase.com/dashboard/project/nhvokxemyaymmqruzpcp" target="_blank" rel="noopener">${esc(SUPABASE_URL)}</a></span></div>
    <div><b>Image bucket</b><span><code>${IMAGE_BUCKET}</code> · public read · admin write · 10 MB per file</span></div>
    <div><b>Signed in as</b><span>${esc(state.user?.email || '')}</span></div>
    <div><b>Security</b><span>Row Level Security — visitors read live content only; writes require an allow-listed admin.</span></div>
    <div><b>Source code</b><span><a href="https://github.com/sokolinkgit/freshstartbarbers" target="_blank" rel="noopener">github.com/sokolinkgit/freshstartbarbers</a> · schema in <code>supabase/install.sql</code></span></div>`;
}

function renderCounts() {
  const d = state.data;
  const counts = {
    services: d.services.length, barbers: d.barbers.length, gallery: d.gallery.length,
    ads: d.ads.length, reviews: d.reviews.length,
    bookings: d.bookings.filter((b) => b.status === 'new').length || '',
  };
  $$('[data-count]').forEach((el) => { el.textContent = counts[el.dataset.count] ?? ''; });
}

function renderAll() {
  renderCounts();
  renderOverview();
  renderServices();
  renderBarbers();
  renderGallery();
  renderAds();
  renderReviews();
  renderBookings();
}

/* ═══════════ Tabs & global events ═══════════ */
const TAB_TITLES = {
  overview: 'Overview', services: 'Services & Prices', barbers: 'The Barbers',
  gallery: 'Gallery & Images', ads: 'Ads & Offers', reviews: 'Client Reviews', bookings: 'Booking Inbox',
};

function switchTab(tab) {
  state.tab = tab;
  $$('.side__link').forEach((l) => l.classList.toggle('is-active', l.dataset.tab === tab));
  $$('.tab').forEach((s) => { s.hidden = s.id !== `tab-${tab}`; });
  $('#tabTitle').textContent = TAB_TITLES[tab] || tab;
  $('#sidebar').classList.remove('is-open');
  if (tab === 'gallery') renderStorage();
  window.scrollTo({ top: 0 });
}

$$('.side__link').forEach((l) => l.addEventListener('click', () => switchTab(l.dataset.tab)));
$('#sideToggle').addEventListener('click', () => $('#sidebar').classList.toggle('is-open'));
$('#refreshBtn').addEventListener('click', async () => { await loadAll(); if (state.tab === 'gallery') renderStorage(); toast('Refreshed from Supabase'); });
$('#storageRefresh').addEventListener('click', renderStorage);
$('#bookingFilter').addEventListener('change', (e) => { state.bookingFilter = e.target.value; renderBookings(); });

$$('[data-search]').forEach((input) => input.addEventListener('input', () => {
  state.filters[input.dataset.search] = input.value;
  ({ services: renderServices, barbers: renderBarbers, gallery: renderGallery, ads: renderAds, reviews: renderReviews, bookings: renderBookings })[input.dataset.search]();
}));

$$('[data-add]').forEach((b) => b.addEventListener('click', () => openEntityModal(b.dataset.add)));
$$('[data-quick]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.quick;
  switchTab(key);
  if (key !== 'bookings') openEntityModal(key);
}));

/* Delegated clicks for dynamically rendered controls. */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-edit],[data-delete],[data-goto-tab],[data-booking-view],[data-booking-delete],[data-copy-url],[data-storage-delete]');
  if (!t) return;
  const find = (key, id) => state.data[key].find((r) => String(r.id) === String(id));

  if (t.dataset.edit) { const row = find(t.dataset.edit, t.dataset.id); if (row) openEntityModal(t.dataset.edit, row); }
  else if (t.dataset.delete) { const row = find(t.dataset.delete, t.dataset.id); if (row) deleteEntity(t.dataset.delete, row); }
  else if (t.dataset.gotoTab) switchTab(t.dataset.gotoTab);
  else if (t.dataset.bookingView) { const row = find('bookings', t.dataset.bookingView); if (row) viewBooking(row); }
  else if (t.dataset.bookingDelete) {
    const row = find('bookings', t.dataset.bookingDelete);
    if (row) confirmDialog({
      title: 'Delete booking request?',
      html: `The request from <strong>${esc(row.name)}</strong> (${fmtDay(row.visit_date)}) will be permanently removed.`,
      onConfirm: async () => {
        const { error } = await supabase.from('bookings').delete().eq('id', row.id);
        if (error) throw error;
        toast('Booking deleted');
        await reload('bookings');
      },
    });
  }
  else if (t.dataset.copyUrl) {
    const url = imageUrl(t.dataset.copyUrl);
    navigator.clipboard?.writeText(url).then(() => toast('Public URL copied')).catch(() => window.prompt('Copy this URL:', url));
  }
  else if (t.dataset.storageDelete) {
    const path = t.dataset.storageDelete;
    const inUse = t.dataset.inUse === '1';
    confirmDialog({
      title: 'Delete image file?',
      html: `<strong>${esc(path)}</strong> will be removed from storage.${inUse ? '<br /><br /><strong>Warning:</strong> this file is still used by a gallery frame or barber portrait — deleting it will break that image on the website.' : ''}`,
      onConfirm: async () => {
        await removeStoragePaths([path]);
        toast('File deleted from storage');
        renderStorage();
      },
    });
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.toggle) {
    const row = state.data[t.dataset.toggle].find((r) => String(r.id) === String(t.dataset.id));
    if (row) await toggleActive(t.dataset.toggle, row, t.checked);
  } else if (t.dataset.bookingStatus) {
    const row = state.data.bookings.find((r) => String(r.id) === String(t.dataset.bookingStatus));
    if (!row) return;
    try {
      const { error } = await supabase.from('bookings').update({ status: t.value }).eq('id', row.id);
      if (error) throw error;
      row.status = t.value;
      toast(`Booking marked ${STATUS_LABEL[t.value].toLowerCase()}`);
      renderAll();
    } catch (err) { toast(errText(err), 'error'); renderBookings(); }
  }
});

/* ═══════════ Go ═══════════ */
boot();
