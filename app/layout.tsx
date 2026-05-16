import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ConsumerBottomNav } from '@/components/ConsumerBottomNav';
import { PilotBanner } from '@/components/PilotBanner';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ChopNow — Mange sans attendre',
  description: 'De la rue à ta porte. Livraison de nourriture à Douala.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ChopNow',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/icons/icon-180.png', sizes: '180x180' },
    shortcut: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#E11D2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={jakarta.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PilotBanner />
          {/* pb-20 = 80px reserve for bottom nav (64px + safe-area-inset). */}
          {/* ConsumerBottomNav hides itself on admin/livreur/vendor routes. */}
          <div className="min-h-dvh pb-20 lg:pb-0">{children}</div>
          <ConsumerBottomNav />
        </NextIntlClientProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
