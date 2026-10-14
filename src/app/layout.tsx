import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Regen — Location Intelligence',
  description: 'Location intelligence for sustainable development, smarter investments, and stronger communities.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
