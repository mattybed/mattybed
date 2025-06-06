import ProductGrid from '../../components/ProductGrid';
import { getEbayItems } from '../../lib/ebay';

export const revalidate = 60;

export default async function Shop() {
  const items = await getEbayItems();
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Shop</h1>
      <ProductGrid items={items} />
    </main>
  );
}
