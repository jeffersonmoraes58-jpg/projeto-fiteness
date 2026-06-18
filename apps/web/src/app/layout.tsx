import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'react-hot-toast';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7c3aed',
};

export const metadata: Metadata = {
  title: {
    default: 'Fitlynutri - Plataforma Fitness Completa',
    template: '%s | Fitlynutri',
  },
  description:
    'Plataforma SaaS completa para personal trainers, nutricionistas e academias. Gerencie treinos, dietas e evolução dos seus alunos com IA.',
  keywords: ['fitness', 'personal trainer', 'nutricionista', 'academia', 'treino', 'dieta'],
  authors: [{ name: 'Fitlynutri' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fitlynutri',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://fitlynutri.com.br',
    title: 'Fitlynutri - Plataforma Fitness Completa',
    description: 'Gerencie treinos, dietas e evolução com IA',
    siteName: 'Fitlynutri',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fitlynutri',
    description: 'Plataforma SaaS Fitness com IA',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
