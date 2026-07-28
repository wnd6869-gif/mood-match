import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mood Match | AI 캐릭터 채팅",
  description:
    "사진 한 장으로 내 분위기를 담은 AI 캐릭터를 만들고, 다른 사람의 캐릭터를 둘러보며 편하게 대화해보세요.",
  openGraph: {
    title: "Mood Match | AI 캐릭터 채팅",
    description:
      "사진 한 장으로 내 분위기를 담은 AI 캐릭터를 만들고, 다른 사람의 캐릭터를 둘러보며 편하게 대화해보세요.",
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
