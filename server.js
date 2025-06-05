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

  // Read sorting and filtering parameters from query
  const { sortBy, minPrice, maxPrice, keywords } = req.query;
  console.log('Received query parameters:', { sortBy, minPrice, maxPrice, keywords });

  let itemFilterIndex = 1; // Start new filters from index 1

  // Apply sorting
  if (sortBy) {
    let sortOrderValue;
    switch (sortBy.toLowerCase()) {
      case 'price_asc':
        sortOrderValue = 'PricePlusShippingLowest';
        break;
      case 'price_desc':
        sortOrderValue = 'PricePlusShippingHighest';
        break;
      // Assuming 'TitleAsc' or similar might be a value, though API support is uncertain
      case 'title':
      case 'title_asc':
        sortOrderValue = 'TitleAsc'; // This is a guess; eBay might use a different value or not support it.
        break;
      default:
        sortOrderValue = 'BestMatch';
    }
    params.append('sortOrder', sortOrderValue);
  } else {
    params.append('sortOrder', 'BestMatch'); // Default sort order
  }

  // Apply filtering
  if (minPrice) {
    params.append(`itemFilter(${itemFilterIndex}).name`, 'MinPrice');
    params.append(`itemFilter(${itemFilterIndex}).value`, minPrice);
    params.append(`itemFilter(${itemFilterIndex}).paramName`, 'Currency'); // Required for price filters
    params.append(`itemFilter(${itemFilterIndex}).paramValue`, 'GBP'); // Assuming GBP, make dynamic if needed
    itemFilterIndex++;
  }

  if (maxPrice) {
    params.append(`itemFilter(${itemFilterIndex}).name`, 'MaxPrice');
    params.append(`itemFilter(${itemFilterIndex}).value`, maxPrice);
    params.append(`itemFilter(${itemFilterIndex}).paramName`, 'Currency'); // Required for price filters
    params.append(`itemFilter(${itemFilterIndex}).paramValue`, 'GBP'); // Assuming GBP, make dynamic if needed
    itemFilterIndex++;
  }

  if (keywords) {
    // Add keywords to the main query parameter for findItemsAdvanced
    // Existing keywords (if any, though not in current base code for findItemsAdvanced) would be here.
    // For findItemsAdvanced, keywords are typically part of the 'keywords' parameter itself, not an itemFilter.
    // However, if filtering by keywords *within* a store search, it might be an itemFilter or appended to a general keywords param.
    // Let's try appending to a general 'keywords' parameter first.
    // If there's an existing 'keywords' param from StoreName search, this might need adjustment.
    // For now, assuming we add it as a top-level parameter.
    // The API usually has a specific 'keywords' parameter for the main search query.
    // Let's assume the base query doesn't have 'keywords' yet and add it.
    // If we intend to filter *within* the store's items, this might need to be an itemFilter.
    // The initial plan was to use itemFilter for keywords. Let's stick to that for now.
    params.append(`itemFilter(${itemFilterIndex}).name`, 'Keywords');
    params.append(`itemFilter(${itemFilterIndex}).value`, keywords);
    itemFilterIndex++;
    // Alternatively, keywords can be added to the main 'keywords' query param:
    // params.append('keywords', keywords); // This would search keywords across eBay, then filter by store.
                                        // If we want to search keywords *only within* the specified store,
                                        // relying on an itemFilter or specific behavior of findItemsAdvanced with StoreName is key.
  }

  const finalEbayUrl = `${endpoint}?${params}`;
  console.log('Constructed eBay API URL:', finalEbayUrl);

  try {
    const response = await fetch(finalEbayUrl);
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

    let processedItems = [...simplified];

    // Apply keyword filtering (server-side)
    if (keywords && typeof keywords === 'string') {
      processedItems = processedItems.filter(item =>
        item.title && item.title.toLowerCase().includes(keywords.toLowerCase())
      );
    }

    // Apply price filtering (server-side)
    if (minPrice) {
      const numericMinPrice = parseFloat(minPrice);
      if (!isNaN(numericMinPrice)) {
        processedItems = processedItems.filter(item =>
          item.price && parseFloat(item.price) >= numericMinPrice
        );
      }
    }

    if (maxPrice) {
      const numericMaxPrice = parseFloat(maxPrice);
      if (!isNaN(numericMaxPrice)) {
        processedItems = processedItems.filter(item =>
          item.price && parseFloat(item.price) <= numericMaxPrice
        );
      }
    }

    // Apply sorting (server-side)
    if (sortBy) {
      switch (sortBy.toLowerCase()) {
        case 'price_asc':
          processedItems.sort((a, b) => {
            const priceA = a.price ? parseFloat(a.price) : Infinity;
            const priceB = b.price ? parseFloat(b.price) : Infinity;
            return priceA - priceB;
          });
          break;
        case 'price_desc':
          processedItems.sort((a, b) => {
            const priceA = a.price ? parseFloat(a.price) : -Infinity;
            const priceB = b.price ? parseFloat(b.price) : -Infinity;
            return priceB - priceA;
          });
          break;
        case 'title': // Alias for title_asc
        case 'title_asc':
          processedItems.sort((a, b) => {
            const titleA = a.title ? a.title.toLowerCase() : '';
            const titleB = b.title ? b.title.toLowerCase() : '';
            if (titleA < titleB) return -1;
            if (titleA > titleB) return 1;
            return 0;
          });
          break;
        // No default server-side sort if sortBy is not recognized or not 'BestMatch'
        // 'BestMatch' is API-side, so we don't replicate it here unless specifically requested.
      }
    }

    res.json({ items: processedItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch from eBay' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
