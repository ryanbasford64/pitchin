import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'PitchIn',
  description:
    'A neighborhood readiness board: needs decomposed into tasks, matched to what neighbors actually have, and closed with an after-action report.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-5 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-5 py-10 text-xs text-stone-500">
          PitchIn — the woodpile was the drill.
        </footer>
      </body>
    </html>
  );
}
