import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Career Pipeline',
  description: 'AI Job Search Pipeline Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-[100dvh] bg-[#0f0f13] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}