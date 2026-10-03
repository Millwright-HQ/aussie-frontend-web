import { redirect } from 'next/navigation';

/** Header search icon target: search lives on the shop page (/shop?q=…). */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/shop?q=${encodeURIComponent(q.slice(0, 60))}` : '/shop');
}
