# Project Roadmap: eBay Woodworks Storefront

This document outlines the development plan for a modern, performant, and engaging e-commerce storefront for an eBay-based woodworking business. It leverages Next.js, Tailwind CSS, and the eBay Finding API to create a compelling user experience.

## 1. Big-Picture Architecture

| Layer        | Tech                                                       | What It Does                                                                                                                               | Notes                                                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | **Next.js Route Handlers (or separate Express API)**       | Serves a small REST API (e.g., `/api/products`) that hits eBay’s Finding API, massages the data, caches it, and feeds the front-end.        | Consider if Next.js Route Handlers are sufficient, potentially simplifying the stack. A separate Express backend offers more flexibility for complex logic or future microservices.                                         |
| **Frontend** | **Next.js (React, App Router)**                            | Server-side rendering (SSR) or Static Site Generation (SSG) for SEO, client-side hydration, and interactive UI components.                 | Utilizes the App Router for colocation of components, pages, and server logic.                                                                                                                                                   |
| **Styling**  | **Tailwind CSS**                                           | Utility-first CSS framework for rapid UI development and consistent styling.                                                               | `tailwind.config.ts` for theme customization.                                                                                                                                                                                   |
| **Caching**  | **Vercel KV, Upstash (Redis), or other serverless cache** | Avoids hammering eBay’s API quota by caching responses; refreshes periodically (e.g., every 15-60 minutes).                               | In-memory caching can be used for local development/MVP. Serverless-friendly options like Vercel KV or Upstash are ideal for Vercel deployments.                                                                         |
| **Hosting**  | **Vercel / Netlify / AWS Amplify**                         | Platform for deployment, CI/CD, SSL, and potentially serverless functions and database add-ons.                                            | Vercel is a strong choice for Next.js projects.                                                                                                                                                                                  |
| **State Mgt.**| **React Context / Zustand / Redux (Future)**             | Manages global UI state if needed (e.g., shopping cart, user preferences).                                                                  | Start simple; introduce a dedicated state management library only if React Context becomes unwieldy.                                                                                                                            |

---

## 2. Prerequisites

1.  **Get eBay API Keys:**
    *   Sign in to the [eBay Developer Program](https://developer.ebay.com/).
    *   Create a new "Application" to obtain your **App ID** (Client ID) and **Cert ID** (Client Secret) for OAuth, or stick to App ID for simpler public data APIs if applicable.
    *   Note your **Dev ID** if required by specific API calls.
2.  **Configure eBay Application Settings:**
    *   If using OAuth, whitelist your redirect URIs.
    *   For older APIs or specific setups, you might need to configure `RuNames` (eBay Redirect URL Names) in the eBay Developer console to handle redirects after authentication or for other API interactions. Ensure your domain is whitelisted if making client-side calls that could be affected by CORS (though backend calls are preferred).
3.  **Install Development Tooling:**
    *   **Node Version Manager (nvm):**
        *   Install `nvm` by following the instructions at [nvm-sh/nvm](https://github.com/nvm-sh/nvm).
        *   Use it to install and manage Node.js versions:
            ```bash
            nvm install --lts # Installs the latest Long-Term Support version
            nvm use --lts
            ```
    *   **pnpm (Performant npm):**
        *   Install `pnpm` globally (after installing Node.js):
            ```bash
            npm install -g pnpm
            ```
        *   Learn more at [pnpm.io](https://pnpm.io/).
    *   **(Optional) Vercel CLI:** If deploying to Vercel.
        ```bash
        pnpm install -g vercel
        ```
4.  **Environment Variables:**
    *   Create a `.env.local` file in your project root for storing sensitive keys and configuration. **Never commit this file to Git.**
    *   Use `.env.example` as a template for required environment variables.
        ```
        # .env.example
        EBAY_APP_ID="YOUR_EBAY_APP_ID"
        EBAY_STORE_NAME="YourEbayStoreName"
        EBAY_GLOBAL_ID="EBAY-US" # Example: EBAY-US, EBAY-GB, EBAY-DE
        EBAY_SITE_ID="0"         # Example: 0 for US, 3 for UK, 77 for Germany
        CACHE_TTL_SECONDS=900    # Cache Time-To-Live in seconds (e.g., 900 = 15 minutes)
        ```

---

## 3. Project Skeleton (Next.js App Router with TypeScript)

```
ebay-woodworks-site/
├─ .env.local                # Local environment variables (Gitignored)
├─ .env.example              # Template for environment variables
├─ package.json
├─ tsconfig.json             # TypeScript configuration
├─ next.config.mjs           # Next.js configuration (ES Module syntax)
├─ tailwind.config.ts        # Tailwind CSS configuration
├─ postcss.config.js         # PostCSS configuration (for Tailwind)
├─ /public
│   ├─ images/
│   └─ robots.txt            # Can also be generated
├─ /src
│   ├─ app/
│   │   ├─ (pages)/            # Route groups for organization (optional)
│   │   │   ├─ page.tsx        # Home page (/)
│   │   │   ├─ shop/
│   │   │   │   └─ page.tsx    # Shop page (/shop)
│   │   │   ├─ about/
│   │   │   │   └─ page.tsx    # About page (/about)
│   │   │   └─ contact/
│   │   │       └─ page.tsx    # Contact page (/contact)
│   │   ├─ layout.tsx          # Root layout
│   │   ├─ globals.css         # Global styles (imported in layout.tsx)
│   │   └─ api/                # API Route Handlers
│   │       └─ products/
│   │           └─ route.ts    # e.g., GET /api/products
│   ├─ components/
│   │   ├─ ui/                 # General UI components (buttons, cards, etc.)
│   │   │  ├─ ProductCard.tsx
│   │   │  └─ ...
│   │   └─ layout/             # Layout components (Header, Footer, Navbar)
│   │      ├─ Header.tsx
│   │      └─ Footer.tsx
│   ├─ lib/
│   │   └─ ebay.ts             # eBay API integration logic, types
│   └─ styles/
│       └─ globals.css         # Alternative location for global styles
└─ README.md
```

---

## 4. eBay Integration (Finding API)

The core of the application involves fetching product data from your eBay store using the Finding API.

File: `src/lib/ebay.ts`

```typescript
// src/lib/ebay.ts
import fetch from 'node-fetch'; // Ensure 'node-fetch' is in dependencies, or use global fetch in Node 18+
import NodeCache from 'node-cache';

// Initialize cache: stdTTL is Standard-Time-To-Live in seconds
const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS || '900', 10); // Default to 15 minutes
const cache = new NodeCache({ stdTTL: cacheTTL });

// Type definitions for eBay items
export interface EbayItem {
  id: string;
  title: string;
  price: string; // Prices are often returned as strings with currency symbols
  imageUrl?: string; // Use PictureURLLarge if available, otherwise galleryURL
  ebayUrl: string;
  // Add other fields as needed, e.g., categoryName, conditionDisplayName
}

interface EbayApiResponseItem {
  itemId: string[];
  title: string[];
  sellingStatus: { currentPrice: { __value__: string }[] }[];
  galleryURL?: string[]; // Smaller image, often a thumbnail
  pictureURLLarge?: string[]; // Larger image, preferred
  viewItemURL: string[];
  // Add other raw fields you might need from the API
}

interface FindItemsResponse {
  findItemsIneBayStoresResponse?: {
    ack: string[];
    searchResult?: { item?: EbayApiResponseItem[] }[];
    errorMessage?: { error: { message: string[] }[] }[];
    // Other response fields
  }[];
}

export async function getEbayItems(): Promise<EbayItem[]> {
  const cacheKey = 'ebayItems';
  const cachedItems = cache.get<EbayItem[]>(cacheKey);
  if (cachedItems) {
    console.log('Returning cached eBay items.');
    return cachedItems;
  }

  console.log('Fetching fresh eBay items...');
  const EBAY_APP_ID = process.env.EBAY_APP_ID;
  const STORE_NAME = process.env.EBAY_STORE_NAME;
  const GLOBAL_ID = process.env.EBAY_GLOBAL_ID || 'EBAY-US'; // Default to US
  const SITE_ID = process.env.EBAY_SITE_ID || '0';           // Default to US site

  if (!EBAY_APP_ID || !STORE_NAME) {
    throw new Error('eBay App ID or Store Name is not configured in environment variables.');
  }

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsIneBayStores',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': EBAY_APP_ID,
    'storeName': STORE_NAME,
    'paginationInput.entriesPerPage': '50', // Fetch up to 50 items
    'outputSelector': 'PictureURLLarge,GalleryURL', // Request both, prioritize PictureURLLarge
    'GLOBAL-ID': GLOBAL_ID,
    'siteid': SITE_ID,
    // Add other parameters like 'sortOrder' if needed
  });

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Log more detailed error from eBay if possible
      const errorBody = await response.text();
      console.error(`eBay API request failed with status ${response.status}: ${errorBody}`);
      throw new Error(`eBay API request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as FindItemsResponse;

    const responseData = data.findItemsIneBayStoresResponse?.[0];
    if (responseData?.ack?.[0] !== 'Success') {
      const errorMessage = responseData?.errorMessage?.[0]?.error?.[0]?.message?.[0] || 'eBay API call was not successful.';
      console.error('eBay API Error:', errorMessage);
      throw new Error(errorMessage);
    }

    const itemsRaw = responseData?.searchResult?.[0]?.item || [];

    const items: EbayItem[] = itemsRaw.map((item: EbayApiResponseItem) => ({
      id: item.itemId?.[0],
      title: item.title?.[0],
      price: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__,
      // Prioritize PictureURLLarge, fall back to galleryURL, then undefined
      imageUrl: item.pictureURLLarge?.[0] || item.galleryURL?.[0],
      ebayUrl: item.viewItemURL?.[0],
    })).filter(item => item.id && item.title && item.price && item.ebayUrl); // Basic validation

    if (items.length > 0) {
      cache.set(cacheKey, items);
      console.log(`Fetched and cached ${items.length} eBay items.`);
    } else {
      console.warn('No items fetched from eBay or all items failed validation.');
    }

    return items;

  } catch (error) {
    console.error('Error fetching or processing eBay items:', error);
    // Depending on your error strategy, you might return an empty array or re-throw
    return []; // Or throw error;
  }
}
```
**Notes:**
*   Ensure `EBAY_APP_ID`, `EBAY_STORE_NAME`, `EBAY_GLOBAL_ID`, and `EBAY_SITE_ID` are set in your `.env.local` file.
*   The `outputSelector` requests both `PictureURLLarge` and `GalleryURL`. The code then prioritizes `PictureURLLarge` as it's generally higher resolution. `galleryURL` can be a small thumbnail.
*   Error handling is more robust with `try/catch`, checking `response.ok`, and looking at eBay's `ack` status.
*   Optional chaining (`?.`) is used to safely access nested properties in the API response.
*   Basic type definitions (`EbayItem`, `EbayApiResponseItem`, `FindItemsResponse`) are included for better developer experience and code safety.

---

## 5. Smooth Animations & Polish

*   **Framer Motion:** For sophisticated animations like page transitions, complex staggers (e.g., fade-in grid), and interactive hover effects (e.g., lift on cards). [Framer Motion Documentation](https://www.framer.com/motion/).
*   **Native Image Lazy Loading:** Use `<img loading="lazy">` for simple, browser-handled lazy loading of offscreen images. This is a good default.
*   **IntersectionObserver API:** For more complex lazy-loading scenarios or triggering animations when elements scroll into view. [MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
*   **Tailwind CSS `@apply`:** Use `@apply` judiciously for component-like utilities (e.g., `.btn-primary`, `.card-base`). Avoid overusing it, as it can lead to CSS bloat if not managed. Prefer utility classes directly in HTML where possible.
*   **Micro-interactions:** Subtle hover effects (e.g., `transform hover:scale-105 transition-transform duration-200`), focus states, and loading indicators.
*   **Accessibility:**
    *   Respect `prefers-reduced-motion` media query to disable or reduce animations for users who prefer it.
        ```css
        /* Example in globals.css */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        ```
*   **Utility Libraries:**
    *   `clsx` or `tailwind-merge`: For conditionally applying CSS classes, especially useful with Tailwind CSS to manage conflicting utility classes. ([clsx on npm](https://www.npmjs.com/package/clsx), [tailwind-merge on npm](https://www.npmjs.com/package/tailwind-merge)).

---

## 6. Pages & Route Structure (App Router)

Leverage the Next.js App Router for defining pages and layouts. Product links on this site will direct users to the eBay listing page for purchase (no local product detail pages for MVP to simplify scope).

| Route Path (in `src/app`) | Component (`page.tsx`) | Purpose                                                                 | Key Features / Notes                                                                                                                                  |
| ------------------------- | ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | `app/page.tsx`         | Home page: Engaging hero section, featured products, call to action.    | Could use a background video/image of the workshop (muted, optimized).                                                                                |
| `/shop`                   | `app/shop/page.tsx`    | Main product listings page.                                             | Grid layout, potential for future filters (Category, Price Range - data permitting from API). Infinite scroll or "Load More" for pagination.         |
| `/about`                  | `app/about/page.tsx`   | "Our Story," brand values, perhaps sustainability efforts.              | Consider a timeline component, images of the maker/workshop.                                                                                          |
| `/contact`                | `app/contact/page.tsx` | Contact form, map (optional), other contact details.                    | Use a serverless function for form submission (e.g., Resend, EmailJS via Route Handler) to avoid exposing email addresses. reCAPTCHA for spam. |
| `/blog` *(optional)*      | `app/blog/page.tsx`    | Articles, tips, project showcases for SEO and engagement.               | Render Markdown/MDX using a library like `next-mdx-remote`.                                                                                           |
| `/legal/privacy-policy`   | `app/legal/privacy-policy/page.tsx` | Privacy Policy page.                                   | Important for compliance. Use a template and customize.                                                                                               |
| `/legal/terms-of-service` | `app/legal/terms-of-service/page.tsx` | Terms of Service page.                               | Important for setting expectations. Use a template and customize.                                                                                     |

**Layouts:**
*   `app/layout.tsx`: Root layout, includes `<html>`, `<body>`, global styles, header, footer, and navigation.
*   Nested layouts can be created for specific sections (e.g., `app/shop/layout.tsx` if the shop section needs a unique sidebar).

---

## 7. Social & Marketing Hooks

*   **Social Media Links:** Prominent links (e.g., in header/footer) to Instagram, TikTok, Pinterest, Facebook, YouTube. Consider a sticky sidebar for desktop if it fits the design.
*   **OpenGraph & Twitter Cards:** Implement using Next.js Metadata API (e.g., in `layout.tsx` or `page.tsx`) for rich previews when sharing links on social media. Dynamically generate tags for product pages using product image, title, and price. [Next.js Metadata API Docs](https://nextjs.org/docs/app/building-your-application/optimizing/metadata).
*   **Share Buttons:**
    *   On product "pages" (which link to eBay): "Copy Link" button.
    *   **Web Share API:** For mobile devices, use the Web Share API for native sharing capabilities. [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API).
*   **Newsletter Pop-up/Section:**
    *   Integrate with a service like Mailchimp or ConvertKit.
    *   Clearly state what users are signing up for (e.g., new product alerts, special offers).
    *   **Obtain explicit consent.** Trigger pop-up based on user behavior (e.g., after 30 seconds, 40% scroll, or exit intent), but ensure it's not intrusive.
*   **Pinterest Integration:**
    *   If relevant, enable Rich Pins for your products.
    *   Consider embedding a Pinterest board or feed in the `/about` or a dedicated gallery page.

---

## 8. Nice-to-Have Innovations & Future Ideas

| Idea                                              | Why It Rocks                                                                  | Feasibility / Notes                                                                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3-D Model Viewer** (`<model-viewer>`)           | Shoppers can interactively rotate and inspect products.                       | Moderate. Requires 3D models (e.g., `.glb` files) of products. `<model-viewer>` is a web component, easy to integrate. [Google <model-viewer> Docs](https://modelviewer.dev/) |
| **Augmented Reality (AR) Preview**                | "View in your space" feature using WebXR or platform-specific AR Quick Look.  | High effort. Requires 3D models and AR-specific development.                                                                                                                     |
| **Product Customizer** (e.g., engraving preview)  | Users personalize products (e.g., text engraving) with a live preview.        | High effort. Involves complex UI, state management, and potentially image generation or 3D updates. Libraries like Fabric.js or Konva.js could be used.                            |
| **Live Stock Meter / Low Stock Indicator**        | Drives urgency by showing limited availability (e.g., "Only 2 left!").        | Moderate. Data source would be eBay item quantity. Requires careful API polling or webhook integration if eBay supports it for quantity changes. Avoid fake scarcity.             |
| **Lighthouse/Performance Score Badge**            | Showcases commitment to quality and speed.                                    | Low effort. Can manually add if scores are consistently high, or explore dynamic badges if available.                                                                            |
| **Customer Showcase / "Meet the Maker" Section**  | Builds community and trust by featuring customer photos or maker's story.   | Low-Moderate effort. Content generation is key. Could be a simple gallery or blog-style posts.                                                                                   |
| **Advanced Search/Filtering**                     | Allow users to filter by wood type, finish, size, etc. (if applicable).       | Moderate-High effort. Depends on the richness of data available from eBay and how it's structured.                                                                               |

---

## 9. Deployment & Hosting (Vercel Example)

1.  **Version Control:**
    *   Initialize a Git repository and push to GitHub/GitLab/Bitbucket.
2.  **Vercel Setup:**
    *   Connect your Git repository to a new Vercel project. Vercel will typically auto-detect Next.js and configure build settings.
3.  **Environment Variables on Vercel:**
    *   In Vercel project settings, add all necessary environment variables from your `.env.example` (and any other operational variables):
        *   `EBAY_APP_ID`
        *   `EBAY_STORE_NAME`
        *   `EBAY_GLOBAL_ID`
        *   `EBAY_SITE_ID`
        *   `CACHE_TTL_SECONDS`
        *   `NEXT_PUBLIC_BASE_URL` (e.g., `https://yourdomain.com` - for absolute URLs in metadata)
        *   Any other API keys for analytics, email services, etc.
4.  **Cache Warming / Data Refresh:**
    *   **Vercel Cron Jobs:** Schedule a cron job to periodically hit an API route that refreshes the eBay product cache. This ensures data stays reasonably fresh. Configure in `vercel.json` or the Vercel dashboard.
        *   Example `vercel.json` for a daily cron job:
            ```json
            {
              "crons": [
                {
                  "path": "/api/refresh-ebay-cache?secret=YOUR_CRON_SECRET",
                  "schedule": "0 0 * * *" // Runs daily at midnight UTC
                }
              ]
            }
            ```
        *   **Security:** The cache refresh endpoint (`/api/refresh-ebay-cache`) should be secured (e.g., require a secret token passed as a query parameter or header) to prevent abuse. The Route Handler would then call `getEbayItems()` or a similar function to repopulate the cache.
5.  **Custom Domain:**
    *   Add your custom domain in Vercel project settings and update DNS records with your domain registrar (e.g., point `CNAME` or `A` records to Vercel).
6.  **HTTPS:**
    *   Vercel automatically provisions and renews SSL certificates for custom domains.
7.  **Monitoring & Logs:**
    *   Utilize Vercel's analytics and runtime logs to monitor application health and troubleshoot issues.

---

## 10. SEO, Analytics & Quality Assurance

*   **SEO Basics:**
    *   `robots.txt`: Configure in `public/robots.txt` or generate dynamically.
    *   `sitemap.xml`: Generate dynamically using a Next.js API route or a build script (e.g., `next-sitemap` package if compatible with App Router, or custom solution). [next-sitemap](https://www.npmjs.com/package/next-sitemap).
*   **Structured Data (JSON-LD):** Crucial for rich search results.
    *   **`WebSite`:** Basic site information.
    *   **`Organization`:** Information about the business.
    *   **`Product`:** For items displayed from eBay. Since these are links to eBay, the structured data should accurately reflect this.
        *   Use `Product` schema, but the `offers` or `seller` should clearly point to eBay.
        *   Example for an item linked to eBay:
            ```json
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Handcrafted Oak Serving Board",
              "image": "https://example.com/images/oak-board.jpg", // Your cached image
              "description": "Beautifully handcrafted oak serving board, perfect for your home.",
              // Link to the eBay listing for purchase details
              "url": "https://www.ebay.com/itm/YOUR_ITEM_ID",
              "offers": {
                "@type": "Offer",
                "url": "https://www.ebay.com/itm/YOUR_ITEM_ID", // Direct link to eBay listing
                "priceCurrency": "USD", // Or GBP, etc., based on EBAY_GLOBAL_ID
                "price": "75.00",       // Price from eBay API
                "availability": "https://schema.org/InStock", // Or OutOfStock, PreOrder
                "seller": {
                  "@type": "Organization",
                  "name": "Your eBay Store Name" // As it appears on eBay
                }
              }
              // Potentially add brand, SKU (if you use them consistently)
            }
            ```
    *   **`BreadcrumbList`:** For navigation paths.
    *   **`Article`:** For blog posts, if applicable.
    *   Implement via `<script type="application/ld+json">` in relevant `page.tsx` or `layout.tsx` components, potentially using a helper function.
*   **Analytics:**
    *   **Google Analytics 4 (GA4):** Integrate using a library like `next-third-parties` (for Google Analytics) or by manually adding the gtag.js script.
    *   **Consent Management:** Implement a cookie consent banner (e.g., using `cookie-banner` package or a custom solution) and integrate with GA4's Consent Mode v2 to respect user privacy choices and comply with regulations from privacy regulators (e.g., GDPR, CCPA).
*   **Quality Assurance (QA):**
    *   **Cross-Browser/Device Testing:** Manually test on major browsers (Chrome, Firefox, Safari, Edge) and various device sizes (desktop, tablet, mobile). Use browser developer tools for emulation.
    *   **Performance Monitoring:**
        *   Use Next.js Analytics (Vercel Speed Insights) or third-party tools like Google PageSpeed Insights, GTmetrix.
        *   Aim for high Lighthouse scores (Performance, Accessibility, Best Practices, SEO).
    *   **Accessibility Testing:**
        *   Use tools like Axe DevTools browser extension, Lighthouse accessibility audit.
        *   Ensure keyboard navigability, sufficient color contrast, ARIA attributes where necessary.
    *   **End-to-End (E2E) Testing:** Consider Playwright or Cypress for automated tests covering key user flows (e.g., navigating to shop, viewing product info - though purchase is offsite).
    *   **Link Checking:** Regularly check for broken links, especially outbound links to eBay.

---

## 11. Timeline & Milestones (Example)

This is a flexible timeline and can be adjusted based on developer experience, design complexity, and feature scope.

| Phase         | Weeks | Key Deliverables                                                                                                | Notes                                                                                                                                                                                                                                                          |
| ------------- | ----- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Foundation**| 1-2   | Project setup (Next.js, TS, Tailwind), Git repo, core directory structure, `.env` setup, basic eBay API connection. | Confirm eBay API access and understand data structure early.                                                                                                                                                                                                   |
| **Core Build**| 2-3   | Homepage, Shop page (product grid with real data from eBay), About/Contact pages. Basic responsive styling.       | Focus on functionality over aesthetics initially. Product links go directly to eBay.                                                                                                                                                                           |
| **Styling & UX**| 1-2   | Detailed styling, Tailwind theming, navigation, header/footer. Implement animations and micro-interactions.      | Refine user experience. Ensure responsive design is polished.                                                                                                                                                                                                  |
| **Features**  | 1-2   | Social media integration, newsletter signup, SEO structured data (basic), contact form functionality.             |                                                                                                                                                                                                                                                                |
| **Testing/QA**| 1     | Thorough cross-browser/device testing, accessibility checks, performance optimization, fix bugs.                  | This phase is crucial. Don't skimp on testing.                                                                                                                                                                                                                 |
| **Deployment**| 0.5   | Vercel deployment, domain setup, environment variables configuration, cron job for cache refresh.                 |                                                                                                                                                                                                                                                                |
| **Post-Launch**| Ongoing| Monitor analytics, gather feedback, iterate on features, ongoing content creation (if blog exists).               |                                                                                                                                                                                                                                                                |

**Caveats:**
*   **Developer Experience:** Assumes familiarity with the tech stack. Learning curves can extend timelines.
*   **Design Clarity:** Having clear designs/wireframes beforehand speeds up development.
*   **Content Creation:** Text, images, and any blog content should be prepared, ideally in parallel.
*   **eBay API Limitations:** Be mindful of API rate limits and data availability.

---

## 12. Quick Tips & Best Practices

*   **eBay API Versioning:** Keep an eye on the [eBay Developer Program](https://developer.ebay.com/) for API updates or deprecations. The `SERVICE-VERSION` parameter in API calls is important.
*   **Understand eBay Error Messages:** eBay API errors can sometimes be cryptic. Log them thoroughly. Refer to eBay's documentation for error codes.
*   **Test Edge Cases:** What if the eBay store has no items? What if an item has missing data (e.g., no `PictureURLLarge`)? Build defensively.
*   **Environment Variable Management:**
    *   Use `.env.local` for local development (and add to `.gitignore`).
    *   Use `.env.example` to list all required variables for other developers or deployment environments.
    *   Securely manage production environment variables in your hosting provider (e.g., Vercel).
*   **Data Consistency:** If caching eBay data, ensure your cache-warming strategy is effective to avoid showing stale information (especially price or stock).
*   **Image Optimization:** Use Next.js Image component (`next/image`) for automatic optimization of images served from your domain. For eBay images, ensure you're requesting appropriate sizes.
*   **eBay Development Resources:**
    *   [eBay Finding API Documentation](https://developer.ebay.com/docs/finding)
    *   [eBay Developer Help](https://developer.ebay.com/help)
*   **Regularly Review Dependencies:** Keep your `npm` packages updated (e.g., `pnpm up --latest`) to patch security vulnerabilities and get new features, but test thoroughly after updates.
*   **Incremental Development:** Build and test features incrementally rather than all at once.
