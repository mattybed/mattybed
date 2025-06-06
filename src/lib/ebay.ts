import NodeCache from 'node-cache';

export interface EbayItem {
  id: string;
  title: string;
  price: string;
  img: string;
  url: string;
}

const cache = new NodeCache({ stdTTL: Number(process.env.CACHE_TTL) || 900 });

export async function getEbayItems(): Promise<EbayItem[]> {
  const cached = cache.get<EbayItem[]>('items');
  if (cached) return cached;

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsIneBayStores',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': process.env.EBAY_APP_ID ?? '',
    'storeName': process.env.EBAY_STORE ?? '',
    'paginationInput.entriesPerPage': '50',
    'outputSelector': 'PictureURLLarge',
    'GLOBAL-ID': 'EBAY-GB',
    'siteid': '3'
  });

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`;
  const res = await fetch(url);
  const data = await res.json();
  const items =
    data.findItemsIneBayStoresResponse?.[0]?.searchResult?.[0]?.item?.map((x: any) => ({
      id: x.itemId?.[0] as string,
      title: x.title?.[0] as string,
      price: x.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ as string,
      img: x.pictureURLLarge?.[0] || x.galleryURL?.[0],
      url: x.viewItemURL?.[0] as string
    })) ?? [];
  cache.set('items', items);
  return items;
}
