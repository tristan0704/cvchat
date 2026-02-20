// DATEIUEBERSICHT: Root-Layout der App mit globalen Styles und Metadaten.
import type { Metadata } from "next";
import "./globals.css";

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
    // Globale HTML-Huelle fuer alle App-Routen.
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

