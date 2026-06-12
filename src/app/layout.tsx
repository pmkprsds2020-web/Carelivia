import type { Metadata } from "next";
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
