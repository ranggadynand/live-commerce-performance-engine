import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Commerce Performance Engine",
  description: "TikTok & Shopee Live performance diagnosis"
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}