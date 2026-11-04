# Fresh Start Grooming Lounge — website

A luxury, dark-and-gold, fully interactive website for **Fresh Start Grooming Lounge**
(logo: *Fresh Start BARBERS*), Superior Center, Kenyatta Avenue, 4th Floor, Suite K-5, Nairobi.

> *Every haircut is a fresh start.*

**Layout cloned from [hicksonsolarsolution.vercel.app](https://hicksonsolarsolution.vercel.app/)** —
same section-by-section structure and flow, but dressed entirely in the Fresh Start
**barber theme** (near-black & gold, Cormorant Italic accents, barber-pole stripes) with all
barber content, plus livelier header/footer and a full **Google Reviews** section.

Built as a hand-crafted static site (Vite + vanilla JS, no framework runtime) with self-hosted
variable fonts, local photography and a WhatsApp reservation flow — now backed by a
**Supabase backend** with a full **Admin Mode** dashboard at `/admin`.

---

## 🗄️ Backend — Supabase + Admin Mode

| Piece | Where |
| --- | --- |
| Supabase project | `https://nhvokxemyaymmqruzpcp.supabase.co` |
| Client (publishable key — browser-safe) | `src/lib/supabase.js` |
| Live content hydration + fallback | `src/lib/content.js` |
| Schema + security + storage | `supabase/schema.sql` |
| Seed content (matches the website) | `supabase/seed.sql` |
| **One-paste installer (schema + seed)** | **`supabase/install.sql`** |
| Admin dashboard | `admin.html` + `src/admin.js` + `src/admin.css` → `/admin` |
| Admin-mode footer on the website | bottom of `index.html` (`#adminBar`) |

### One-time activation (~2 minutes)

1. **Run the installer** — open the [Supabase SQL editor](https://supabase.com/dashboard/project/nhvokxemyaymmqruzpcp/sql/new),
   paste the whole of **`supabase/install.sql`** and click **Run**.
   This creates the tables, row-level security, the public `site-images` storage bucket,
   and seeds the current 25 services, 5 barbers, 9 gallery frames, ticker ads and 9 reviews.
2. **Create your admin login** — Supabase dashboard → **Authentication → Users → Add user**
   (enter email + password, tick **Auto Confirm User**).
3. **Claim admin** — open `/admin` on the website, sign in with that account and click
   **Claim admin access**. The first account to claim becomes the admin; after that only
   allow-listed admins can manage anything.

> Until the installer is run (or if Supabase is unreachable) the website keeps working
> from the built-in content in `src/data.js` — the footer shows
> *“Backend · offline (built-in content)”* and switches to *“Backend · Supabase live”*
> once connected. Empty tables also fall back to built-in content.

### What admins can do (`/admin`)

- **Overview** — live counts, quick actions, latest booking requests, backend info.
- **Services** — full CRUD on the 25-ritual menu: prices, chair time, categories, badges,
  VIP flags, day restrictions (e.g. Mbogi Mon–Wed), search tags, sort order, live/hidden toggle.
- **Barbers** — full CRUD on the crew, with **portrait upload** straight to Supabase Storage.
- **Gallery & Images** — **upload new images** (JPG/PNG/WebP/AVIF ≤ 10 MB), edit captions &
  categories, link frames to bookable services, **delete old ones** (the storage file is
  removed with the frame), plus a **storage browser** listing every uploaded file with
  in-use markers, copy-URL and delete.
- **Ads & Offers** — create/edit/schedule announcements: **ticker** ads rotate in the top
  bar; **banner** ads show as a dismissible gold strip under the header with an optional
  “Book this offer” / link button. Start/end dates supported.
- **Reviews** — manage the Google-style review carousel entries.
- **Bookings** — every website reservation is mirrored into this inbox (customers still
  confirm on WhatsApp). Filter, view details, one-tap WhatsApp the client, and mark
  new → confirmed → completed / cancelled.

### Security model

- The publishable key in the browser is **safe**: every table has Row Level Security.
- Visitors (anon) can only **read active content** and **submit booking requests**.
- Writes require a signed-in user on the `admin_users` allow-list (`public.is_admin()`).
- Storage: public read, admin-only upload/update/delete, image MIME types only, 10 MB cap.
- To add another admin later: create their user in Supabase Auth, then run
  `insert into public.admin_users (user_id, email) select id, email from auth.users where email = 'them@example.com';`
- Recommended: Supabase → Authentication → Providers → Email → turn **off** “Allow new users to sign up”
  (accounts are created by the owner in the dashboard).

### Admin-mode footer

The website footer ends with a slim staff bar: backend connection status
(green = Supabase live, gold = offline/setup pending), an **Admin Mode** link to `/admin`,
and — when an admin is signed in — their email plus a sign-out shortcut.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # preview the built bundle
```

Deploy the `dist/` folder (or the repo root on Vercel — the included `vercel.json` handles it).

---

## Layout — Hickson structure, barber edition

| Hickson Solar section | Fresh Start version |
| --- | --- |
| Hero “Power, Wire & Connect…” + 3 CTAs + trust chips + stats bar | **“Cut. Shave. Refresh. *Every Haircut Is A Fresh Start.*”** — brand manifesto lede (reset & reclaim your confidence), “This is more than a haircut…” creed, *#Where Real Men Like You Belong*, Reserve / Call / WhatsApp CTAs, trust chips, animated stats (25 rituals · 5 barbers · 5.0★ · from KSh 500) and a floating Google-rating badge; the marquee leads with **Confidence · Identity · Dignity · Self-Respect** |
| Who We Power & Connect (swipe cards) | **Who Holds The Clippers** — swipeable barber rail (5 barbers + *Any Available*), selectable into your booking |
| What We Install + “Important: we install only” banner | **Services menu** (25 rituals, search + category chips + sort, multi-select with live totals) + gold “On The House” banner (free massage + coffee/tea/bites) |
| How It Works — 4 steps + 6 features | **Street To Sharp In 4 Steps** + 6 lounge pillars |
| Projects Gallery (filters + lightbox) | **Work Gallery** — filter by craft, tap to zoom, *Book this look* |
| About + checklist + tags + SEO block | **Pure Craftsmanship. Zero Rush.** — checklist, audience tags, photo collage, SEO panel + Refreshments panel |
| Client Reviews (Google, auto-rotating) | **Google Reviews (NEW, expanded)** — see below |
| Get Your Free Quote (WhatsApp form) | **Reserve Your Chair** — name/phone/barber/ritual/visit-type selects, 14-day date strip, 30-min slots, live summary → pre-filled WhatsApp |
| FAQ + sticky Call/WhatsApp bar | Same 6 barber FAQs + sticky mobile Call / WhatsApp / Reserve bar |

### Lively header
- Animated **barber-pole stripe** (gold/black/cream) across the very top and the footer.
- **Top announcement bar**: live **Open now / Closed / By appointment** badge (Africa/Nairobi
  clock), a **rotating offers ticker** (referral Classic Shave, 3-person package, Mbogi Experience, Sunday premium policy…),
  phone, address and socials.
- Sticky glass header that **shrinks + shadows on scroll**, brand logo with ★★★★★ 5.0 mini-rating,
  **sliding gold nav pill** with scroll-spy active states, theme toggle, call button, gold Reserve
  button and an animated mobile menu. Gold scroll-progress hairline up top.

### Google Reviews (new)
- Authentic white Google summary card: multicolour **Google** wordmark, verified chip, big **5.0**,
  stars, animated **rating breakdown bars**, *Review Us On Google* / *Read All On Google* buttons
  (point at the lounge's Google Maps listing).
- **Auto-rotating carousel**: 3 reviews at a time (2 on tablet, 1 on phone), refreshes every
  4 seconds with a gold progress bar, dots, prev/next, `1–3 of 9` counter. **Hover or tap a card
  to pause** — exactly like the reference layout.
- Review cards carry coloured initial avatars, Google “G”, 5 stars + verified tick, service tag
  and time. Edit or swap in live Google reviews any time in `REVIEWS` / `REVIEW_SUMMARY`
  inside **`src/data.js`**.

### Lively footer
- Barber-pole top edge, “Ready for a *fresh start?*” CTA row with live open-status, 4 columns
  (brand + Google 5.0 card + socials with handles, Explore, Popular Rituals that **one-tap book**,
  Visit Us with directions + animated back-to-top), a giant outlined **FRESH START** watermark,
  and a legal bar with the 5.0 Google line.

### Mobile optimisation
Verified in a headless browser at **280 / 320 / 360 / 375 / 390 / 412 / 430 / 768 / 1024px**:
document width equals viewport width at every size — **zero horizontal page scrolling** and no
clipped text. Grid/flex children carry `min-width: 0` (so the booking date-strip scrolls inside
its own box instead of stretching the page), `fr` tracks are `minmax(0, 1fr)`, buttons/labels
wrap instead of forcing width, headings use fluid `clamp()` sizes with balanced wrapping, form
controls are 16px (no iOS focus-zoom), slots become a tidy 3-up grid, and the footer watermark
scales to fit. Internal rails (barbers, date strip) still swipe sideways by design — the page
itself never does.

### Final refinements
- Hero statistics carry their final values in markup (**25, 5, 5.0★, KSh 500 services from**) and
  the count-up glides from 55% of target, so a counter can never display 0 / “KSh 0”.
  No years-of-experience statistics are shown.
- Services are arranged **lowest → highest price within each category** (menu order and booking
  dropdown).
- Reviews reflect a diverse five-star clientele — Nairobi regulars, Somali gentlemen and
  international guests (London, Dubai, Berlin).
- Opening hours are consistent everywhere: **walk-ins welcome Mon–Sat** (Thu from 8:30 am);
  Sunday is listed verbatim as **“By Appointment Only! Premium Rates Apply.”** in the hours
  table, hero, footer, FAQs, date strip (today-Sunday disabled), booking summary and WhatsApp
  handoff — with the premium rate confirmed before a Sunday chair is reserved.
- Offers: **The Mbogi Experience** (3 student haircuts, KSh 2,500, **Mon–Wed only**, student ID
  optional — enforced in booking validation); **3-Person Haircut Package** (KSh 3,000, 90 min);
  **Bring 2 Friends referral** (two Bespoke Haircuts at KSh 1,500 each; the host's Classic Shave
  is complimentary in the same 90-minute visit).

### Kept from the previous barber site
Loading screen (logo, igniting stars, “5 Star Rated”), dark/light themes stored in
`localStorage`, all **25 services**, all **5 barbers**, complimentary refreshments, socials,
past-slot blocking (45-min buffer), `/` search shortcut, toasts, lightbox, sticky selection
bar, JSON-LD `HairSalon`, `prefers-reduced-motion` support.

---

## Editing content

**Day-to-day changes are made in Admin Mode (`/admin`)** — services, barbers, gallery
images, ads, reviews and bookings are served live from Supabase. `src/data.js` remains
the built-in fallback used when the backend is offline or a table is empty, and still
owns the static copy (hours, FAQs, process steps, pillars, refreshments, business info).

All copy, prices, barbers, hours, reviews and gallery data live in **`src/data.js`**:

| Export | Controls |
| --- | --- |
| `BUSINESS` | phone, WhatsApp, address, map link, social URLs, rating |
| `CATEGORIES` / `SERVICES` | 25 services — name, minutes, KSh price, description, VIP flag |
| `BARBERS` | the five barbers + *Any Available Barber* |
| `HOURS` / `SUNDAY_POLICY` | weekly schedule + canonical Sunday premium listing |
| `REFRESHMENTS` | complimentary lounge menu |
| `GALLERY` / `GALLERY_FILTERS` | gallery frames, filters, “book this look” service links |
| `PROCESS` / `PILLARS` | 4 steps + 6 feature cards |
| `REVIEWS` / `REVIEW_SUMMARY` | Google Reviews carousel + 5.0 summary bars |
| `FAQS` / `AUDIENCES` | FAQ accordion + About tag row |
| `SOCIALS` | social channel cards |

Styling tokens (gold, ink, radii) are at the top of **`src/styles.css`** (dark default,
`[data-theme="light"]` parchment overrides). Markup lives in **`index.html`**;
interactions in **`src/main.js`**.

---

## Imagery — `public/img/`

| File | Used for |
| --- | --- |
| `hero.jpg` | Hero background + About + Gallery |
| `vip.jpg` | Gallery/About — hot-towel ritual |
| `fade.jpg`, `beard.jpg` | Gallery (fade, beard) + footer CTA band |
| `facial.jpg`, `massage.jpg`, `hands.jpg` | Gallery — face & body rituals |
| `lounge.jpg` | Refreshments + Gallery |
| `barber-*.jpg` | Barber portraits (including Starkid in Gallery) |

The supplied logo lives at `public/logo.png` (header, loader, favicon, footer).

---

## Contact used on the site

- **Phone / WhatsApp:** 0741578791 (+254 741 578 791)
- **Address:** Superior Center, Kenyatta Avenue, 4th Floor, Suite K-5, Nairobi
- **Plus Code:** PR8F+H4 Nairobi
- **Instagram / Facebook / TikTok:** @fresh_start_barbers / @Freshstartbarbers / @freshstartbarbers
