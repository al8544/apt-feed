import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Gaegu } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import MotionProvider from "@/components/MotionProvider";
import "./globals.css";

const gaegu = Gaegu({
  variable: "--font-gaegu",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "aptHunt",
  description: "Apartment hunting with your flock",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f1e7d6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gaegu.variable} antialiased`}>
      <body>
        {/* Shared filter for .rough fills (see globals.css). */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id="rough" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="2.5" />
          </filter>
        </svg>
        <div className="group/app relative mx-auto min-h-dvh max-w-[430px] bg-surface pb-[calc(64px+env(safe-area-inset-bottom))]">
          <MotionProvider>{children}</MotionProvider>
          {/* usePathname is runtime data on dynamic routes like /map/[id]. */}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
