"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Dashboard" },
  { href: "/interviews", label: "Interviews" },
  { href: "/learn", label: "Lernen" },
];

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, pathname, onClick }) {
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-gray-950/50 text-white"
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Navbar({ initialProfile }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Die Shell bekommt Basisdaten direkt vom Server und spart so einen Extra-Request.
  const [profile] = useState(
    initialProfile ?? {
      username: "",
      email: "",
      avatarUrl: null,
    }
  );
  const pathname = usePathname();

  const avatarFallback = useMemo(() => {
    return (
      profile.username.trim().charAt(0).toUpperCase() ||
      profile.email.trim().charAt(0).toUpperCase() ||
      "C"
    );
  }, [profile.email, profile.username]);

  return (
    <nav className="relative bg-gray-800/50 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((currentValue) => !currentValue)}
              className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500"
              aria-label={mobileOpen ? "Navigation schließen" : "Navigation öffnen"}
            >
              {!mobileOpen ? (
                <svg
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 18 18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <Link href="/home" className="flex shrink-0 items-center gap-3">
              <span className="flex h-10 w-20 items-center justify-center rounded-md text-sm font-semibold text-white">
                <img
                  src="/commit_logo.png"
                  alt="Commit Logo"
                  className="h-full w-full object-contain"
                />
              </span>
            </Link>

            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    pathname={pathname}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <div className="hidden pr-3 text-right sm:block">
              <p className="text-sm font-medium text-white">
                {profile.username || "Profil"}
              </p>
              <p className="text-xs text-gray-400">
                {profile.email || "commit"}
              </p>
            </div>

            <div className="relative ml-3">
              <button
                type="button"
                onClick={() => setProfileOpen((currentValue) => !currentValue)}
                className="relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                aria-label="Profilmenü öffnen"
              >
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    className="size-8 rounded-full bg-gray-800 object-cover outline -outline-offset-1 outline-white/10"
                    alt={profile.username || "Profilbild"}
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white outline -outline-offset-1 outline-white/10">
                    {avatarFallback}
                  </span>
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-gray-800 py-1 outline outline-white/10">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                  >
                    Profil
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                  >
                    Einstellungen
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
                    >
                      Abmelden
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="block border-t border-white/10 sm:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                pathname={pathname}
                onClick={() => setMobileOpen(false)}
              />
            ))}
            <NavLink
              href="/profile"
              label="Profil"
              pathname={pathname}
              onClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
