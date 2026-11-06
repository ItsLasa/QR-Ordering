import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BistroQR - Contactless Dining & Kitchen Management',
  description: 'Premium QR code dining, table ordering, and real-time kitchen operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#FAFAF8] text-stone-900 antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
