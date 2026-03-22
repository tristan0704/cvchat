import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
    title: "CareerPitch",
    description: "Ein einfacher Hiring-Flow als MVP.",
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode
}>) {
    return (
        <html lang="de">
            <body className="antialiased">{children}</body>
        </html>
    )
}
