import type { Metadata, Viewport } from "next";
import "@fontsource/gabarito/700.css";
import "@fontsource/gabarito/800.css";
import "@fontsource/gabarito/900.css";
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/600.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "KasKelas",
  description: "Buku kas kelas yang dicap.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/kaskelas-icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#F3F6FB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
