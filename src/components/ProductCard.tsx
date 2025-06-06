'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { EbayItem } from '../lib/ebay';

interface Props {
  item: EbayItem;
}

export default function ProductCard({ item }: Props) {
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener"
      className="block border rounded p-4 hover:shadow-lg"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative w-full h-48 mb-2">
        <Image
          src={item.img}
          alt={item.title}
          fill
          className="object-cover rounded"
        />
      </div>
      <h3 className="font-semibold text-lg">{item.title}</h3>
      <p className="text-sm text-gray-600">£{item.price}</p>
    </motion.a>
  );
}
