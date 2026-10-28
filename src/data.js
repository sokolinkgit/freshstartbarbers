/* ────────────────────────────────────────────────────────────
   Fresh Start Grooming Lounge — content model
   ──────────────────────────────────────────────────────────── */

export const BUSINESS = {
  name: 'Fresh Start Grooming Lounge',
  logoName: 'Fresh Start Barbers',
  tagline: 'Every cut is a fresh start',
  heroTagline: 'Your grooming. Your standard.',
  phone: '0741 578791',
  phoneIntl: '+254741578791',
  phoneDigits: '254741578791',
  address:
    'Superior Center, Kenyatta Avenue, 4th Floor, Suite K-5, Nairobi, Kenya',
  shortAddress: 'Superior Center, 4th Floor, K-5 · Nairobi',
  plusCode: 'PR8F+H4 Nairobi',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Superior+Center+Kenyatta+Avenue+Nairobi',
  instagram: 'https://www.instagram.com/fresh_start_barbers/',
  facebook: 'https://www.facebook.com/Freshstartbarbers',
  tiktok: 'https://www.tiktok.com/@freshstartbarbers',
  whatsapp:
    'https://wa.me/254741578791?text=Hello%20Fresh%20Start%20Grooming%20Lounge!%20I%27d%20like%20to%20reserve%20a%20chair.',
  rating: 5.0,
  timezone: 'Africa/Nairobi',
};

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'signature', label: 'Signature Haircuts' },
  { id: 'grooming', label: 'Precision & Beard Grooming' },
  { id: 'colour', label: 'Colour & Hair Artistry' },
  { id: 'face', label: 'Face & Skin Rituals' },
  { id: 'hands', label: 'Hand & Foot Care' },
  { id: 'body', label: 'Body Rituals' },
  { id: 'vip', label: 'Fresh Start VIP Collection' },
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
);

/* id, category, name, duration (min), price (KSh), description */
export const SERVICES = [
  // ── Signature Haircuts (8)
  { id: 'bespoke', cat: 'signature', name: 'Bespoke Haircut', mins: 40, price: 1500, desc: 'Precision tailored haircut, scalp wash, hot towel finish & custom styling.', tags: 'cut fade haircut wash style signature' },
  { id: 'caucasian', cat: 'signature', name: 'Caucasian Haircut', mins: 45, price: 2500, desc: 'Specialized scissor-work, fine hair taper, texturing & refined styling.', tags: 'scissor cut fine hair taper texture caucasian' },
  { id: 'group3', cat: 'signature', name: 'Bespoke Haircut Group of 3', mins: 90, price: 3000, desc: 'Triple bespoke grooming session tailored for groups, brothers, or friends.', tags: 'group three friends brothers cut' },
  { id: 'gentleman', cat: 'signature', name: "Gentleman's Cut (Normal Shave)", mins: 30, price: 1000, desc: 'Classic gentleman haircut with clean razor perimeter shave.', tags: 'gentleman classic shave razor normal' },
  { id: 'junior', cat: 'signature', name: "Young Gentleman's Cut Under 10", mins: 30, price: 1000, desc: 'Gentle, patient haircut crafted for junior gentlemen under 10 years.', tags: 'kids children junior boy under 10' },
  { id: 'grey', cat: 'signature', name: 'Haircut + Grey Reduction/Dye', mins: 60, price: 2500, desc: 'Precision cut with subtle natural grey blending or full dye coverage.', tags: 'grey dye colour color blend reduction' },
  { id: 'student', cat: 'signature', name: 'Student Group “Shave Na Mbogi”', mins: 90, price: 2000, desc: 'Special student package for three gentlemen with valid student ID.', tags: 'student shave na mbogi group offer campus' },
  { id: 'freefriend', cat: 'signature', name: 'Bring 2 friends and your haircut is FREE!', mins: 90, price: 3000, desc: 'Bespoke grooming for 3: bring 2 friends, pay for 2 haircuts, and yours is completely FREE!', tags: 'offer free friends group three promo', badge: 'Offer' },

  // ── Precision & Beard Grooming (3)
  { id: 'hairline', cat: 'grooming', name: 'Hairline Shape Up', mins: 20, price: 500, desc: 'Crisp razor contouring, temple line definition & neck cleanup.', tags: 'line up shape hairline edge neck razor' },
  { id: 'beard', cat: 'grooming', name: 'Beard Trim', mins: 20, price: 500, desc: 'Detailed beard sculpture, edge line up, conditioning oil & soothing balm.', tags: 'beard sculpt trim oil balm edge' },
  { id: 'enhancement', cat: 'grooming', name: 'Enhancement/Dye Without Shave', mins: 20, price: 1000, desc: 'Semi-permanent hairline or beard fiber dye enhancement without a haircut.', tags: 'dye enhancement fiber beard hairline colour' },

  // ── Colour & Hair Artistry (3)
  { id: 'halfcolour', cat: 'colour', name: 'Half Color + Shave', mins: 60, price: 3500, desc: 'Creative partial tone dye or bleach artistry paired with a full shave.', tags: 'colour color bleach dye shave half' },
  { id: 'fullcolour', cat: 'colour', name: 'Full Color + Shave', mins: 90, price: 5000, desc: 'Complete head color transformation paired with bespoke shave & finish.', tags: 'colour color dye bleach full shave transformation' },
  { id: 'texture', cat: 'colour', name: 'Texturing + Shave', mins: 50, price: 2500, desc: 'Curl definition, wave texturing, or relaxing paired with signature shave.', tags: 'texture waves curls relax perm shave' },

  // ── Face & Skin Rituals (3)
  { id: 'scrub', cat: 'face', name: 'Face Scrub', mins: 20, price: 1000, desc: 'Deep exfoliating scrub to unclog pores, remove dead cells & refresh skin.', tags: 'scrub exfoliate skin face pores' },
  { id: 'halffacial', cat: 'face', name: 'Half Facial', mins: 30, price: 2000, desc: 'Targeted express cleansing, warm ozone steam & hydration mask.', tags: 'facial steam mask hydration express ozone' },
  { id: 'fullfacial', cat: 'face', name: 'Full Facial', mins: 45, price: 3000, desc: 'Comprehensive facial ritual with deep extraction, botanical mask & moisturizer.', tags: 'facial extraction botanical mask moisturizer' },

  // ── Hand & Foot Care (2)
  { id: 'pedicure', cat: 'hands', name: 'Pedicure', mins: 40, price: 2000, desc: 'Relaxing foot soak, scrub, callus treatment, nail shaping & cuticle care.', tags: 'pedicure feet nails callus soak' },
  { id: 'manicure', cat: 'hands', name: 'Manicure', mins: 25, price: 1000, desc: 'Gentle hand exfoliation, nail trimming, cuticle grooming & buffing.', tags: 'manicure hands nails cuticle buff' },

  // ── Body Rituals (2)
  { id: 'halfmassage', cat: 'body', name: 'Half Massage', mins: 30, price: 2500, desc: 'Focused tension release for neck, shoulders, and upper back.', tags: 'massage neck shoulders back tension' },
  { id: 'fullmassage', cat: 'body', name: 'Full Body Massage', mins: 60, price: 4000, desc: 'Full therapeutic relaxation massage with warm essential botanical oils.', tags: 'massage full body oils relaxation therapy' },

  // ── VIP Collection (4)
  { id: 'vip1', cat: 'vip', name: 'VIP Experience I: The Executive Grooming Ritual', mins: 90, price: 7000, vip: true, desc: 'Bespoke Shave + Pedicure + Manicure + Full Facial.', tags: 'vip executive shave pedicure manicure facial' },
  { id: 'vip2', cat: 'vip', name: 'VIP Experience II: The Complete Gentleman', mins: 120, price: 10500, vip: true, desc: 'Bespoke Shave + Pedicure + Manicure + Full Facial + Full Body Massage.', tags: 'vip complete gentleman massage facial shave' },
  { id: 'vip3', cat: 'vip', name: 'VIP Experience III: The Renewal Ritual', mins: 120, price: 10000, vip: true, desc: 'Bespoke Shave + Manicure + Pedicure + Full Facial + Half Massage.', tags: 'vip renewal ritual facial massage shave' },
  { id: 'vip4', cat: 'vip', name: 'VIP Experience IV: The Ultimate Fresh Start', mins: 150, price: 13000, vip: true, desc: 'Bespoke Shave + Pedicure + Manicure + Full Facial + Half Massage + Full Body Massage.', tags: 'vip ultimate fresh start massage facial shave' },
];

export const BARBERS = [
  {
    id: 'any',
    name: 'Any Available Barber',
    role: 'Next open chair',
    img: null,
    initials: 'FS',
    years: null,
    specialties: ['Fastest seat', 'All services', 'Walk-in friendly'],
    note: 'Let the lounge match you to the next available craftsman.',
  },
  {
    id: 'starkid',
    name: 'Starkid Bright',
    role: 'Master Barber',
    img: '/img/barber-starkid.jpg',
    initials: 'SB',
    years: 7,
    specialties: ['Bespoke cuts', 'Line-ups', 'Beard sculpt'],
    note: 'Sharp, architectural fades finished with a razor line-up.',
  },
  {
    id: 'cossy',
    name: 'Cossy Romeo',
    role: 'Grooming Specialist',
    img: '/img/barber-cossy.jpg',
    initials: 'CR',
    years: 6,
    specialties: ['Textured afro', 'Hot towel shave', 'Styling'],
    note: 'Texture, movement and a shave that smells like the lounge.',
  },
  {
    id: 'alphie',
    name: 'Alphie The Barber',
    role: 'Razor & Shave Artisan',
    img: '/img/barber-alphie.jpg',
    initials: 'AB',
    years: 8,
    specialties: ['Straight razor', 'Clean shave', 'Skin fades'],
    note: 'The straight razor is the instrument. Patience is the method.',
  },
  {
    id: 'mike',
    name: 'Mike will fade it',
    role: 'Fade Specialist',
    img: '/img/barber-mike.jpg',
    initials: 'MF',
    years: 5,
    specialties: ['Skin fades', 'Curl sponge', 'Kids cuts'],
    note: 'If it can be blended, it can be faded. Bring a reference.',
  },
  {
    id: 'dan',
    name: 'Dan Cuts',
    role: 'Senior Barber',
    img: '/img/barber-dan.jpg',
    initials: 'DC',
    years: 12,
    specialties: ['Executive cuts', 'Grey blending', 'VIP rituals'],
    note: 'Twelve years behind the chair. Calm hands, exact finish.',
  },
];

export const OFFERS = [
  {
    title: 'Bring 2 friends and your haircut is FREE!',
    serviceId: 'freefriend',
  },
  {
    title:
      'Complimentary Aftershave Hand & Shoulder Massage included with every service.',
  },
];

export const REFRESHMENTS = [
  {
    name: 'Coffee',
    detail: 'Regular / Americano',
    price: 250,
    note: 'Freshly brewed, poured the moment you sit.',
  },
  {
    name: 'Tea',
    detail: 'Black / Green',
    price: 200,
    note: 'Black or green, served in the lounge.',
  },
  {
    name: 'Light Bites',
    detail: 'Lounge Snacks',
    price: 350,
    note: 'A small plate while the clippers cool.',
  },
];

/* 0 = Sunday … 6 = Saturday */
export const HOURS = [
  { day: 1, label: 'Monday', open: '8:00 am', close: '8:00 pm', openMin: 480, closeMin: 1200 },
  { day: 2, label: 'Tuesday', open: '8:00 am', close: '8:00 pm', openMin: 480, closeMin: 1200 },
  { day: 3, label: 'Wednesday', open: '8:00 am', close: '8:00 pm', openMin: 480, closeMin: 1200 },
  { day: 4, label: 'Thursday', open: '8:30 am', close: '8:00 pm', openMin: 510, closeMin: 1200 },
  { day: 5, label: 'Friday', open: '8:00 am', close: '8:00 pm', openMin: 480, closeMin: 1200 },
  { day: 6, label: 'Saturday', open: '8:00 am', close: '8:00 pm', openMin: 480, closeMin: 1200 },
  { day: 0, label: 'Sunday', open: 'By appointment only', close: '', appointment: true },
];

export const SOCIALS = [
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@fresh_start_barbers',
    href: 'https://www.instagram.com/fresh_start_barbers/',
    note: 'Latest cuts, styles & chair moments',
    icon: 'i-instagram',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    handle: '@Freshstartbarbers',
    href: 'https://www.facebook.com/Freshstartbarbers',
    note: 'Official page · grooming updates',
    icon: 'i-facebook',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    handle: '@freshstartbarbers',
    href: 'https://www.tiktok.com/@freshstartbarbers',
    note: 'Transformations, fades & behind the chair',
    icon: 'i-tiktok',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handle: '+254 741 578 791',
    href: 'https://wa.me/254741578791',
    note: 'Direct inquiries & chair reservations',
    icon: 'i-whatsapp',
  },
];

export const money = (n) => `KSh ${Number(n).toLocaleString('en-KE')}`;

export const durationLabel = (mins) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};
