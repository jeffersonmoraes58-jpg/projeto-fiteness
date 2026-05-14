import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'FitSaaS - Plataforma Fitness Completa',
    template: '%s | FitSaaS',
  },
  description:
    'Plataforma SaaS completa para personal trainers, nutricionistas e academias. Gerencie treinos, dietas e evolução dos seus alunos com IA.',
  keywords: ['fitness', 'personal trainer', 'nutricionista', 'academia', 'treino', 'dieta'],
  authors: [{ name: 'FitSaaS' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://fitsaas.com',
    title: 'FitSaaS - Plataforma Fitness Completa',
    description: 'Gerencie treinos, dietas e evolução com IA',
    siteName: 'FitSaaS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FitSaaS',
    description: 'Plataforma SaaS Fitness com IA',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
