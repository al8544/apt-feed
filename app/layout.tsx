import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "aptHunt",
  description: "Apartment hunting with your crew",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body>
        <div className="relative mx-auto min-h-dvh max-w-[430px] bg-white pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
