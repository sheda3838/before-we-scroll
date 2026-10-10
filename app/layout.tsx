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
  metadataBase: new URL("https://before-we-scroll.vercel.app"),
  title: "Before We Scroll",
  description:
    "Turn the moment before another scroll into something worth doing. AI-guided real-world missions tailored to your surroundings.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Before We Scroll",
    description:
      "Turn the moment before another scroll into something worth doing. AI-guided real-world missions tailored to your surroundings.",
    url: "https://before-we-scroll.vercel.app",
    siteName: "Before We Scroll",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Before We Scroll",
    description:
      "Turn the moment before another scroll into something worth doing. AI-guided real-world missions tailored to your surroundings.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
