import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brand Brain Studio",
  description: "AI-Powered Brand Strategy & Content Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('bb_boot_done') !== '1') {
                  document.documentElement.dataset.booting = '1';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-neutral-800 selection:text-white">
        {/* Server-side #boot-root: solid #05050A, fully opaque, with small centered pulsing dot so first paint is black */}
        <div
          id="boot-root"
          className="fixed inset-0 z-[9999] bg-[#05050A] flex items-center justify-center pointer-events-auto"
        >
          <div className="boot-pulse-dot h-2 w-2 rounded-full bg-indigo-500 animate-ping opacity-75" />
        </div>
        {children}
      </body>
    </html>
  );
}
