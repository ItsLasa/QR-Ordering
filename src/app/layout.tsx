import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BistroQR - Instant Contactless Ordering',
  description: 'Fast, smooth QR code menu browsing and kitchen ordering.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
