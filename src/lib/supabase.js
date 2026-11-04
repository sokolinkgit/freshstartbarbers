/* ────────────────────────────────────────────────────────────
   Supabase client — Fresh Start Grooming Lounge backend
   Project: https://nhvokxemyaymmqruzpcp.supabase.co

   The publishable key below is SAFE to expose in the browser:
   all writes are protected by Row Level Security (see
   supabase/schema.sql). Never put a service_role key here.
   ──────────────────────────────────────────────────────────── */
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://nhvokxemyaymmqruzpcp.supabase.co';

export const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2bemSl2AdJoqeJxc1E2gug_kotWGPTq';

export const IMAGE_BUCKET = 'site-images';

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** Reject a pending request after `ms` so the UI never hangs on a slow backend. */
export function withTimeout(promise, ms = 6000, label = 'request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

/** True when the error means the SQL schema has not been installed yet. */
export function isMissingSchema(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

/** Public URL for a file stored in the site-images bucket. */
export function imageUrl(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
