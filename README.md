# eBay Store Integration Example

This project is a minimal Next.js 14 site that fetches products from an eBay UK store.

## Setup

1. Install dependencies

```bash
pnpm install
```

2. Create a `.env.local` file with the following variables:

```
EBAY_APP_ID=your-app-id
EBAY_STORE=your-store-name
CACHE_TTL=900
```

3. Run the development server

```bash
pnpm run dev
```

The site will be available at `http://localhost:3000`.
