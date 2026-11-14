import type { Metadata, Viewport } from "next";
import { Gaegu } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const gaegu = Gaegu({
  variable: "--font-gaegu",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flock",
  description: "Apartment hunting with your flock",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#fbf6ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gaegu.variable} antialiased`}>
      <body>
        {/* Grainy edge used by the .rough utility (globals.css). */}
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <div className="relative mx-auto min-h-dvh max-w-[430px] bg-cream pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
