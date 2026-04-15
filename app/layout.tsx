import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';

const inter = Inter({subsets: ['latin'], variable: '--font-sans'});

export const metadata: Metadata = {
  title: 'DevNexus - Importar Projeto',
  description: 'Importar Projeto GitHub',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900" suppressHydrationWarning>{children}</body>
    </html>
  );
}
