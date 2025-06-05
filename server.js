const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/api/products', async (req, res) => {
  const EBAY_APP_ID = process.env.EBAY_APP_ID;
  const EBAY_STORE = process.env.EBAY_STORE;
  if (!EBAY_APP_ID || !EBAY_STORE) {
    return res.status(500).json({ error: 'EBAY_APP_ID and EBAY_STORE env vars required' });
  }

  const endpoint = 'https://svcs.ebay.com/services/search/FindingService/v1';
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsAdvanced',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': EBAY_APP_ID,
    'GLOBAL-ID': 'EBAY-GB',
    'RESPONSE-DATA-FORMAT': 'JSON',
    'paginationInput.entriesPerPage': '12',
    'itemFilter(0).name': 'StoreName',
    'itemFilter(0).value': EBAY_STORE,
  });

  try {
    const response = await fetch(`${endpoint}?${params}`);
    const data = await response.json();
    const items = data.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];
    const simplified = items.map((item) => ({
      id: item.itemId?.[0],
      title: item.title?.[0],
      price: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__,
      currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'],
      viewItemURL: item.viewItemURL?.[0],
      galleryURL: item.galleryURL?.[0],
    }));
    res.json({ items: simplified });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch from eBay' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
