
import type { Metadata } from "next";
import localFont from "next/font/local";
import ToastHost from "./components/ToastHost";
import "./globals.css";

const capsFont = localFont({
  src: "../public/Fonts/caps.woff2",
  variable: "--font-caps",
});

export const metadata: Metadata = {
  title: "ფრჩხილის სტუდია",
  description: "მანიკური, პედიკიური და ფრჩხილის მოვლა თბილისში.",
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
