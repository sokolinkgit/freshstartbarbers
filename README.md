# Fresh Start Grooming Lounge — website

A luxury, dark-and-gold, fully interactive website for **Fresh Start Grooming Lounge**
(logo: *Fresh Start BARBERS*), Superior Center, Kenyatta Avenue, 4th Floor, Suite K-5, Nairobi.

> *Every cut is a fresh start.*

Built as a hand-crafted static site (Vite + vanilla JS, no framework runtime) with self-hosted
variable fonts, generated editorial photography and a real multi-step reservation flow that
hands off to the lounge's WhatsApp line.

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

## What's inside

### Experience
- **Loading screen** — logo, five stars igniting one by one, “5 Star Rated”, address pill and a
  gold progress bar. Repeat visits in the same session get a shorter version.
- **Sticky header** — logo, `Overview | Info` tab switcher with a sliding gold pill,
  light/dark theme toggle (sun ↔ moon) and a gold **Reserve** button.
- **Dark / light themes** — warm parchment light mode, near-black gold-flecked dark mode.
  Choice persists in `localStorage`.
- **Overview tab** — cinematic hero, “Select Service Provider” barber cards (defaults to
  *Any Available Barber*), the Fresh Start standard pillars, the 25-service menu with live
  search + category counts + sorting, the group-of-three offer ticket, Lounge Hospitality
  refreshments, an inside-the-lounge gallery with lightbox, and quick links.
- **Info tab** — Hours & Location directory, full weekly hours with a live **Open now /
  closes 8:00 pm** badge and a highlighted *TODAY* row, Sunday policy box, map card +
  Plus Code, official social channels, “Getting to the Chair” steps, FAQ and a booking CTA.
- **Reservation drawer** — 4 steps (Services → Barber → Day & time → Confirm) with running
  total, total chair time, 30-minute slots, past-slot blocking, Sunday appointment rules,
  validation, and a pre-filled WhatsApp message including every service and price.
- **Sticky selection bar** — appears as soon as services are multi-selected.

### Details that matter
- Live Nairobi (`Africa/Nairobi`) clock logic — works for visitors in any timezone.
- 21-day date strip; today’s Sunday is not bookable, Sundays are labelled *appt*.
- Multi-select syncs between the menu, the drawer and the summary.
- `prefers-reduced-motion` respected; keyboard support (`/` search, `Esc` closes overlays,
  focus trap in the drawer); ARIA tabs/dialogs; JSON-LD `HairSalon` structured data.
- Mobile-first: bottom-sheet booking drawer, scroll-snap barber rail, safe-area padding.
- Zero third-party runtime requests — fonts are bundled, images are local.

---

## Editing content

All copy, prices, barbers, hours, socials and refreshment data live in **`src/data.js`**:

| Export         | Controls                                                     |
| -------------- | ------------------------------------------------------------ |
| `BUSINESS`     | phone, WhatsApp, address, map link, social URLs, rating       |
| `CATEGORIES`   | menu categories and filter chips                              |
| `SERVICES`     | 25 services — name, minutes, KSh price, description, VIP flag |
| `BARBERS`      | the five barbers + *Any Available Barber*                     |
| `HOURS`        | weekly schedule + Sunday appointment flag                     |
| `REFRESHMENTS` | the complimentary lounge menu                                 |
| `SOCIALS`      | social channel cards                                          |

Styling tokens (gold, ink, radii, type scale) are at the top of **`src/styles.css`**.
Markup and static sections live in **`index.html`**; interactions in **`src/main.js`**.

---

## Imagery

Photography in `public/img/` is AI-generated to match the lounge's dark-gold aesthetic:
`hero.jpg`, `lounge.jpg`, `vip.jpg`, `fade.jpg`, `beard.jpg` and five barber portraits.
The supplied logo lives at `public/logo.png` and is used in the header, loader, favicon,
footer, and the *Any Available Barber* card. Swap in real photography any time — the file
names are referenced from `index.html` and `src/data.js`.

---

## Contact used on the site

- **Phone / WhatsApp:** 0741 578791 (+254 741 578 791)
- **Address:** Superior Center, Kenyatta Avenue, 4th Floor, Suite K-5, Nairobi
- **Plus Code:** PR8F+H4 Nairobi
- **Instagram / Facebook / TikTok:** @fresh_start_barbers / @Freshstartbarbers / @freshstartbarbers
