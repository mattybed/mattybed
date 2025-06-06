import ProductCard from './ProductCard';
import { EbayItem } from '../lib/ebay';

interface Props {
  items: EbayItem[];
}

export default function ProductGrid({ items }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <ProductCard key={item.id} item={item} />
      ))}
    </div>
  );
}
