import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SERVICE_CORE_MESSAGE } from "@/lib/service-copy";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mood Match | AI 캐릭터 채팅",
  description: SERVICE_CORE_MESSAGE,
  openGraph: {
    title: "Mood Match | AI 캐릭터 채팅",
    description: SERVICE_CORE_MESSAGE,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#fafafa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
