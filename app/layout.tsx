import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const body = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });

// Bright: the brand typeface by Dharmas Studio. Used only for big moments.
const display = localFont({
  src: [
    { path: "./fonts/Bright.otf", weight: "400", style: "normal" },
    { path: "./fonts/Bright-Italic.otf", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Àbáké Olófì", template: "%s · Àbáké Olófì" },
  description: "Orders, weavers and clients for Àbáké Olófì aso-oke.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

// Applies the saved theme (light / dark / system) before the page paints.
// Light unless she picks Dark (or "Match my device") in Settings.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
