import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">Hand-crafted wooden vibes</h1>
      <Link
        href="/shop"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Shop now
      </Link>
    </main>
  );
}
