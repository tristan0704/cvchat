import "./globals.css";
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: "CareerPitch",
  description: "Simuliere dein Tech Interview und erhalte Feedback",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="bg-slate-50 text-slate-900 antialiased">

        {/* 👉 Global Layout Wrapper */}
        <div className="min-h-screen flex flex-col">

          {/* OPTIONAL: globale Navbar (nur wenn überall sichtbar) */}
          {/* <Navbar /> */}

          {/* 👉 Page Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* OPTIONAL: Footer */}
          {/* <Footer /> */}

        </div>

        <SpeedInsights />
      </body>
    </html>
  );
}