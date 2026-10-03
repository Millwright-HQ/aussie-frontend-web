import type { Metadata } from 'next';
import { readTheme } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

const envName = process.env.NEXT_PUBLIC_ENV_NAME ?? 'local';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Dark by default (staff spend long hours here); each person can switch and it is remembered.
  const mode = await readTheme('admin', 'dark');
  return (
    <div data-theme-root="admin" data-theme={mode} className="min-h-dvh bg-bg text-text">
      {envName !== 'prod' && (
        <p className="bg-[#F2A93B] px-4 py-1 text-center text-xs font-semibold tracking-wide text-[#1F1A17] uppercase">
          {envName} environment
        </p>
      )}
      {children}
    </div>
  );
}
