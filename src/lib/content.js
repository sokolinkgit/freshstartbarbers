/* ────────────────────────────────────────────────────────────
   Live content — hydrates the public site from Supabase.

   The site always renders instantly from src/data.js. This module
   then fetches the live backend content in the background and
   swaps it in. If Supabase is unreachable, not set up yet, or a
   table is empty, the built-in content stays — the site never
   breaks.
   ──────────────────────────────────────────────────────────── */
import { supabase, SUPABASE_CONFIGURED, withTimeout, isMissingSchema } from './supabase.js';
import { SERVICES, BARBERS, GALLERY, REVIEWS } from '../data.js';

export const GALLERY_CAT_LABEL = {
  cuts: 'Cuts & Fades',
  beard: 'Beard & Shave',
  face: 'Face & Skin',
  body: 'Body & Hands',
  lounge: 'The Lounge',
};

/* Live ads + backend status, consumed by main.js */
export const LIVE = {
  connected: false,
  schemaMissing: false,
  ticker: [],       /* active ticker ad titles */
  banner: null,     /* active banner ad row */
  error: '',
};

const replace = (target, rows) => { target.splice(0, target.length, ...rows); };

const mapService = (r) => ({
  id: r.id,
  cat: r.category,
  name: r.name,
  mins: r.mins,
  price: r.price,
  desc: r.description || '',
  tags: r.tags || '',
  ...(r.badge ? { badge: r.badge } : {}),
  ...(r.vip ? { vip: true } : {}),
  ...(Array.isArray(r.days) && r.days.length ? { days: r.days } : {}),
});

const mapBarber = (r) => ({
  id: r.id,
  name: r.name,
  role: r.role || 'Barber',
  img: r.img || null,
  initials: r.initials || r.name.slice(0, 2).toUpperCase(),
  specialties: Array.isArray(r.specialties) ? r.specialties : [],
  note: r.note || '',
});

const mapGallery = (r) => ({
  src: r.src,
  cat: r.category,
  catLabel: GALLERY_CAT_LABEL[r.category] || r.category,
  title: r.title,
  detail: r.detail || '',
  serviceId: r.service_id || null,
});

const mapReview = (r) => ({
  name: r.name,
  area: r.area || '',
  initials: r.initials || r.name.slice(0, 2).toUpperCase(),
  hue: r.hue || '#c9a24d',
  stars: r.stars || 5,
  when: r.when_label || '',
  service: r.service || '',
  text: r.body || '',
});

const adLiveNow = (ad) => {
  const now = Date.now();
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return false;
  if (ad.ends_at && new Date(ad.ends_at).getTime() < now) return false;
  return true;
};

/**
 * Fetch live content. Returns { connected, schemaMissing, changed } —
 * `changed` lists the sections whose data was swapped so main.js can
 * re-render only what moved.
 */
export async function hydrateContent() {
  const changed = [];
  if (!SUPABASE_CONFIGURED || !supabase) {
    LIVE.error = 'Supabase is not configured';
    return { connected: false, schemaMissing: false, changed };
  }

  const query = (table, order = 'sort') =>
    supabase.from(table).select('*').eq('active', true).order(order, { ascending: true });

  let results;
  try {
    results = await withTimeout(
      Promise.all([
        query('services'),
        query('barbers'),
        query('gallery_images'),
        query('ads'),
        query('reviews'),
      ]),
      7000,
      'content fetch'
    );
  } catch (err) {
    LIVE.error = err?.message || 'Network error';
    return { connected: false, schemaMissing: false, changed };
  }

  const [services, barbers, gallery, ads, reviews] = results;
  const all = [services, barbers, gallery, ads, reviews];

  if (all.every((r) => r.error)) {
    LIVE.schemaMissing = all.some((r) => isMissingSchema(r.error));
    LIVE.error = all[0].error?.message || 'Backend error';
    return { connected: false, schemaMissing: LIVE.schemaMissing, changed };
  }

  LIVE.connected = true;
  LIVE.schemaMissing = all.some((r) => isMissingSchema(r.error));

  if (!services.error && services.data?.length) { replace(SERVICES, services.data.map(mapService)); changed.push('services'); }
  if (!barbers.error && barbers.data?.length) { replace(BARBERS, barbers.data.map(mapBarber)); changed.push('barbers'); }
  if (!gallery.error && gallery.data?.length) { replace(GALLERY, gallery.data.map(mapGallery)); changed.push('gallery'); }
  if (!reviews.error && reviews.data?.length) { replace(REVIEWS, reviews.data.map(mapReview)); changed.push('reviews'); }

  if (!ads.error && ads.data?.length) {
    const live = ads.data.filter(adLiveNow);
    LIVE.ticker = live.filter((a) => a.placement === 'ticker').map((a) => a.title);
    LIVE.banner = live.find((a) => a.placement === 'banner') || null;
    changed.push('ads');
  }

  return { connected: true, schemaMissing: LIVE.schemaMissing, changed };
}

/** Save a booking request to the backend (fire-and-forget — never blocks WhatsApp). */
export async function saveBooking(payload) {
  if (!supabase) return { ok: false };
  try {
    const { error } = await withTimeout(supabase.from('bookings').insert(payload), 8000, 'booking save');
    return { ok: !error, error };
  } catch (err) {
    return { ok: false, error: err };
  }
}
