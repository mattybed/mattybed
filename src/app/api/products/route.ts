import { NextResponse } from 'next/server';
import { getEbayItems } from '../../../lib/ebay';

export async function GET() {
  try {
    const items = await getEbayItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
