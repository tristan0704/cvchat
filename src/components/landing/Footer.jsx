import Link from "next/link";

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-gray-900 py-8 text-sm text-gray-400">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center lg:flex-row lg:px-8 lg:text-left">
                <p>2026 commit</p>
                <div className="flex flex-wrap items-center justify-center gap-6">
                    <Link href="/impressum" className="transition hover:text-white">
                        Impressum
                    </Link>
                    <Link href="/datenschutz" className="transition hover:text-white">
                        DSGVO
                    </Link>
                </div>
            </div>
        </footer>
    );
}
