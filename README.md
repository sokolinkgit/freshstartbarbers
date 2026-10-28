# Fresh Start Grooming Lounge — website

A luxury, dark-and-gold, fully interactive website for **Fresh Start Grooming Lounge**
(logo: *Fresh Start BARBERS*), Superior Center, Kenyatta Avenue, 4th Floor, Suite K-5, Nairobi.

> *Every cut is a fresh start.*

**Layout cloned from [hicksonsolarsolution.vercel.app](https://hicksonsolarsolution.vercel.app/)** —
same section-by-section structure and flow, but dressed entirely in the Fresh Start
**barber theme** (near-black & gold, Cormorant Italic accents, barber-pole stripes) with all
barber content, plus livelier header/footer and a full **Google Reviews** section.

Built as a hand-crafted static site (Vite + vanilla JS, no framework runtime) with self-hosted
variable fonts, local photography and a WhatsApp reservation flow.

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
| Hero “Power, Wire & Connect…” + 3 CTAs + trust chips + stats bar | **“Cut. Shave. Refresh. *Every Cut Is A Fresh Start.*”** — Reserve / Call / WhatsApp CTAs, trust chips, animated stats (25 rituals · 5 barbers · 5.0★ · from KSh 500) and a floating Google-rating badge |
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
  clock), a **rotating offers ticker** (FREE group cut, Shave Na Mbogi, Sunday policy…),
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

### Kept from the previous barber site
Loading screen (logo, igniting stars, “5 Star Rated”), dark/light themes stored in
`localStorage`, all **25 services & prices**, all **5 barbers**, hours (Thu opens 8:30 am,
Sunday strictly by appointment booked a day ahead — today-Sunday is disabled in the date
strip), group-of-three offer ticket, complimentary refreshments, socials, FAQ copy,
past-slot blocking (45-min buffer), `/` search shortcut, toasts, lightbox, sticky selection
bar, JSON-LD `HairSalon`, `prefers-reduced-motion` support.

---

## Editing content

All copy, prices, barbers, hours, reviews and gallery data live in **`src/data.js`**:

| Export | Controls |
| --- | --- |
| `BUSINESS` | phone, WhatsApp, address, map link, social URLs, rating |
| `CATEGORIES` / `SERVICES` | 25 services — name, minutes, KSh price, description, VIP flag |
| `BARBERS` | the five barbers + *Any Available Barber* |
| `HOURS` | weekly schedule + Sunday appointment flag |
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
| `barber-*.jpg` | Five barber portraits (+`barber-dan.jpg` in Gallery) |

The supplied logo lives at `public/logo.png` (header, loader, favicon, footer).

---

## Contact used on the site

- **Phone / WhatsApp:** 0741578791 (+254 741 578 791)
- **Address:** Superior Center, Kenyatta Avenue, 4th Floor, Suite K-5, Nairobi
- **Plus Code:** PR8F+H4 Nairobi
- **Instagram / Facebook / TikTok:** @fresh_start_barbers / @Freshstartbarbers / @freshstartbarbers
