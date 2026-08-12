import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Random Quote Image — KangWiFi",
  description:
    "Setiap request mengembalikan gambar PNG berisi random quote dari api.kangwifi.eu.org. Mirip konsep ipleak.nixel.dev/image/ip, tapi isinya quote.",
  keywords: ["quote", "random quote", "image api", "kangwifi", "nextjs"],
  authors: [{ name: "KangWiFi" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Random Quote Image",
    description: "Gambar PNG berisi random quote dari api.kangwifi.eu.org",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Random Quote Image",
    description: "Gambar PNG berisi random quote dari api.kangwifi.eu.org",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
