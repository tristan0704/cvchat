import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
    title: "CareerPitch",
    description: "Ein einfacher Hiring-Flow als MVP.",
}

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="de">
            <body className="antialiased">{children}</body>
        </html>
    )
}
