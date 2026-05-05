import "./globals.css";

export const metadata = {
  title: "CommIT",
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
          <main className="flex-1">{children}</main>

          {/* OPTIONAL: Footer */}
          {/* <Footer /> */}
        </div>
      </body>
    </html>
  );
}
