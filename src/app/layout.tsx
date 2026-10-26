import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Menu Photo Board | Cafe Operations',
  description: 'Single-screen dish photography tracker for cafe operations across Zomato, Swiggy, and Instagram',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fbf9f6] text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
