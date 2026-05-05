"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LANDING_LINKS = [
  { href: "#product", label: "Produkt" },
  { href: "#features", label: "Funktionen" },
  { href: "#how-it-works", label: "Wie es funktioniert" },
  { href: "/about", label: "Über uns" },
];

export default function LandingPageNavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const resolveHref = (href) => {
    if (!href.startsWith("#")) {
      return href;
    }

    return pathname === "/" ? href : `/${href}`;
  };

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="flex items-center justify-between p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 flex items-center gap-3 p-1.5">
            <span className="flex h-10 w-20 items-center justify-center rounded-md text-sm font-semibold text-white">
              <Image
                src="/commit_logo.png"
                alt="Commit Logo"
                width={80}
                height={40}
                className="h-full w-full object-contain"
              />
            </span>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-gray-200"
            aria-label="Menü öffnen"
          >
            <Image
              src="/icons/bars-solid-full.svg"
              width={20}
              height={20}
              className="h-5 w-5 brightness-0 invert"
              alt=""
            />
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-12">
          {LANDING_LINKS.map((item) => (
            <Link
              key={item.href}
              href={resolveHref(item.href)}
              className="text-sm font-semibold text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Link href="/auth/login" className="text-sm font-semibold text-white">
            Anmelden
          </Link>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 bg-gray-900 p-6 lg:hidden">
          <div className="flex justify-between">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => setOpen(false)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500 text-sm font-semibold text-white">
                CP
              </span>
              <span className="text-sm font-semibold text-white">CommIT</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menü schließen"
            >
              <Image
                src="/icons/xmark-solid-full.svg"
                width={20}
                height={20}
                className="h-5 w-5 brightness-0 invert"
                alt=""
              />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {LANDING_LINKS.map((item) => (
              <Link
                key={item.href}
                href={resolveHref(item.href)}
                onClick={() => setOpen(false)}
                className="block text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="block text-white"
            >
              Anmelden
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
