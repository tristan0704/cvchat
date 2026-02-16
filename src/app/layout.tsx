import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const displaySans = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const codeMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerIndex - Interactive Career Profile",
  description:
    "CareerIndex turns a CV into an interactive, structured knowledge base for recruiters.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displaySans.variable} ${codeMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
