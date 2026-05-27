import type { Metadata } from "next";
import localFont from "next/font/local";
import { absoluteUrl, siteConfig } from "@/lib/seo";
import ToastHost from "./components/ToastHost";
import "./globals.css";

const capsFont = localFont({
  src: "../public/Fonts/caps.woff2",
  variable: "--font-caps",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} | მანიკური და პედიკური თბილისში`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "ფრჩხილის სტუდია",
    "მანიკური თბილისი",
    "პედიკური თბილისი",
    "შილაკი",
    "ფრჩხილის დაგრძელება",
    "ფრჩხილის მოვლა",
    "ონლაინ დაჯავშნა",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: `${siteConfig.name} | მანიკური და პედიკური თბილისში`,
    description: siteConfig.description,
    images: [
      {
        url: absoluteUrl("/icon.png"),
        width: 512,
        height: 512,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | მანიკური და პედიკური თბილისში`,
    description: siteConfig.description,
    images: [absoluteUrl("/icon.png")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" className={capsFont.variable}>
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
