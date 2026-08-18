import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Without an explicit viewport export, mobile browsers (Chrome on Android,
// Safari on iOS) fall back to a virtual desktop-width layout (~980px) and
// shrink the whole page to fit the screen instead of rendering it at native
// width — this is why the app looked "not full" / zoomed-out on phones and
// tablets. `width=device-width, initial-scale=1` makes the layout use the
// device's real CSS pixel width, and `viewport-fit=cover` lets the app's
// safe-area-aware elements (header/footer) extend correctly under notches.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#2D8C7A",
};

export const metadata: Metadata = {
  title: "CareLivia - Telepalliative Care Platform",
  description: "Platform telepalliative care yang berfokus pada peningkatan kualitas hidup pasien, penghormatan terhadap martabat manusia, dukungan keluarga, serta perawatan yang berkelanjutan. Caring for Life, Preserving Human Dignity.",
  keywords: ["telepalliative", "paliatif", "perawatan lansia", "dukungan keluarga", "home care", "telehealth", "kesehatan", "Indonesia"],
  authors: [{ name: "CareLivia Team" }],
  icons: {
    icon: "/carelivia-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
