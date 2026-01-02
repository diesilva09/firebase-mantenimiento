import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseProvider } from '@/firebase/provider';
import { ClientNotificationsProvider } from "@/components/client-notifications-provider";


const FAV_VERSION = "1"

export const metadata: Metadata = {
  title: 'Area de Mantenimiento',
  description: 'Sistema integral para la gestión de mantenimiento',
  icons: {
    icon: `/la-coruna.jpg?v=${FAV_VERSION}`,
    shortcut: `/la-coruna.jpg?v=${FAV_VERSION}`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Favicon (cache-busted). If still cached, open in Incognito or clear browser cache. */}
        <link rel="icon" href={`/la-coruna.jpg?v=${FAV_VERSION}`} />
        <link rel="shortcut icon" href={`/la-coruna.jpg?v=${FAV_VERSION}`} />
        <link rel="icon" type="image/jpeg" sizes="32x32" href={`/la-coruna.jpg?v=${FAV_VERSION}`} />
        <link rel="icon" type="image/jpeg" sizes="16x16" href={`/la-coruna.jpg?v=${FAV_VERSION}`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`/la-coruna.jpg?v=${FAV_VERSION}`} />
        <meta name="msapplication-TileImage" content={`/la-coruna.jpg?v=${FAV_VERSION}`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Source+Code+Pro:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-code antialiased", "min-h-screen bg-background font-sans")}>
        <FirebaseProvider>
          <ClientNotificationsProvider>
            {children}
          </ClientNotificationsProvider>
        </FirebaseProvider>
        <Toaster />
      </body>
    </html>
  );
}
