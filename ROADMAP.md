## 1. Big-Picture Architecture

| Layer        | Tech                             | What It Does                                                                                                                   |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Backend**  | **Node.js + Express**            | Serves a small REST API (`/api/products`) that hits eBay’s Finding API, massages the data, caches it, and feeds the front-end. |
| **Frontend** | **Next.js (React)**              | Server-side-renders for SEO, hydrates on the client, and sprinkles Framer-Motion animations.                                   |
| **Styling**  | **Tailwind CSS**                 | Utility-first, so you ship fast and stay consistent.                                                                           |
| **Caching**  | **Redis (or in-memory for MVP)** | Avoid hammering eBay’s API quota; refresh every X minutes.                                                                     |
| **Hosting**  | **Vercel / Render**              | One-click deploy, free SSL, hobby-tier DB add-ons.                                                                             |

---

## 2. Prerequisites

1. **Get eBay keys:** Sign in to the eBay Developer Program → Create an “Application” → Note **App ID** (aka *Client ID*).
2. **Whitelist your domain** in eBay Dev console (`Auth & Auth > RuNames`) so CORS doesn’t bite you later.
3. **Install tooling:**

   ```bash
   nvm use --lts
   pnpm i -g vercel
   ```

---

## 3. Project Skeleton

```
ebay-woodworks-site/
├─ .env.local          # EBAY_APP_ID, CACHE_TTL, etc.
├─ package.json
├─ next.config.mjs
├─ /pages
│   ├─ index.jsx       # Home: hero + featured products
│   ├─ shop.jsx        # All listings / filters
│   ├─ about.jsx
│   ├─ contact.jsx
│   └─ api/
│       └─ products.js # Serverless function calls eBay
├─ /components
│   ├─ ProductCard.jsx
│   ├─ ProductGrid.jsx
│   └─ Layout.jsx      # Header, Footer, Nav
└─ /lib
    └─ ebay.js         # Finding API helper + cache
```

---

## 4. eBay Integration (Finding API)

```js
// /lib/ebay.js
import fetch from 'node-fetch';
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 900 });

export async function getEbayItems() {
  const cached = cache.get('items');
  if (cached) return cached;

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsIneBayStores',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': process.env.EBAY_APP_ID,
    'storeName': 'YourStoreName',
    'paginationInput.entriesPerPage': 50,
    'outputSelector': 'PictureURLLarge',
    'GLOBAL-ID': 'EBAY-GB',
    'siteid': 3              // UK
  });

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`;
  const { findItemsIneBayStoresResponse } = await fetch(url).then(r => r.json());

  const items = findItemsIneBayStoresResponse[0]
    .searchResult[0].item
    .map(x => ({
      id: x.itemId[0],
      title: x.title[0],
      price: x.sellingStatus[0].currentPrice[0].__value__,
      img:  x.galleryURL[0],
      url:  x.viewItemURL[0]
    }));

  cache.set('items', items);
  return items;
}
```

---

## 5. Smooth Animations & Polish

* **Framer Motion** – fade-in grid, hover lift on cards, page-transition slide.
* **IntersectionObserver** – lazy-load images as they enter viewport.
* **Tailwind `@apply`** – shared styles like `.card` and `.btn` may use wood-tone palette (`rgb(133,94,66)` 🔥).
* **Micro-interactions** – subtle tilt on product images (`transform-gpu hover:rotate-1 hover:scale-105 duration-200`).

---

## 6. Pages & Tabs

| Route                | Purpose                                               | Extras                                          |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| `/`                  | Clean hero (“Hand-crafted wooden vibes”), CTA to Shop | Background hero video loop of workshop (muted). |
| `/shop`              | Grid, filters (Category, Price, Availability)         | Infinite scroll / *Load More*.                  |
| `/about`             | Your story, sustainability creds                      | Timeline scroller with pins.                    |
| `/contact`           | Embedded Google Map, form (EmailJS)                   | Real-time validation, reCAPTCHA.                |
| `/blog` *(optional)* | SEO fuel; showcase builds, tips                       | Render Markdown (MDX) with shiki highlighting.  |

---

## 7. Social & Marketing Hooks

* **Sticky sidebar** with icons → IG, TikTok, Pinterest, Facebook, YouTube.
* **OpenGraph / Twitter Cards** for each product page (auto-pull first image + price).
* **Share buttons** on product modal: “Copy link” + direct share intents.
* **Newsletter pop-up** → Mailerlite; trigger only after 30 s or 40 % scroll.
* **Rich pin feed** (Pinterest API) in `/about` footer (“See our boards”).

---

## 8. Nice-to-Have Innovations

| Idea                                        | Why It Rocks                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| **3-D Viewer** (Model-Viewer web component) | Let shoppers spin an oak serving board like a DJ.                         |
| **AR Preview** (WebXR, iOS Quick Look)      | “Will this planter fit on my patio rail?” – customers find out instantly. |
| **Customiser** (React + fabric.js)          | Users engrave names / logos live → push vector to you.                    |
| **Live Stock Meter**                        | Green/yellow/red bar drives urgency without fake timers.                  |
| **Lighthouse Score Badge**                  | Flex your 95+ performance – trust signal.                                 |

---

## 9. Deployment Steps

1. **GitHub repo** – push → Vercel auto-build.
2. Set **Vercel env vars**: `EBAY_APP_ID`, `CACHE_TTL=900`.
3. **Cron job** (Vercel Scheduler) to hit `/api/products?revalidate=1` nightly, warming the cache.
4. **Domain** – point `CNAME` to `cname.vercel-dns.com`.
5. **Redirect http→https** (Vercel does it by default).

---

## 10. SEO, Analytics & QA

* **robots.txt + sitemap.xml** generated via next-sitemap.
* **Structured data** (`Product`, `BreadcrumbList`).
* **GA4 + Consent mode v2** to keep the ICO off your back.
* **Playwright e2e**: crawl main user flows, prevent shipping bugs.

---

## 11. Timeline (Realistic, No Unicorn Dust)

| Week | Deliverables                                                 |
| ---- | ------------------------------------------------------------ |
| 1    | Repo scaffold, eBay API working locally, `.env` secrets set. |
| 2    | Basic pages (`/`, `/shop`), product grid with real data.     |
| 3    | Styling pass, Tailwind theming, responsive done.             |
| 4    | Add animations (Framer), social sidebar, contact form.       |
| 5    | Optional bells & whistles (AR, 3-D, customiser).             |
| 6    | SEO polish, speed budget hits, deploy to production.         |

---

## 12. Quick Tips to Avoid Face-palms

* **Rate limits:** eBay’s Finding API ≈ 5 k req/day. Cache or you’ll cry.
* **Images:** Some listings’ `galleryURL` is 75×75. Use `pictureURLLarge` selector.
* **Currency:** eBay returns `£` as plain text; always treat price as string for i18n.
* **Testing in Sandbox:** eBay UK Sandbox is *dead slow*—don’t worry, prod is faster.
