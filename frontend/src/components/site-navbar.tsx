"use client";

import { Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "Architecture" },
  { href: "/demo", label: "SOC Console" },
  { href: "/simulator", label: "Attack Simulator" },
  { href: "/ledger", label: "Evidence Ledger" },
  { href: "/mobile-demo", label: "Mobile QR" },
  { href: "/#comparison", label: "Defense vs Binary" },
];

export default function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-vn-border bg-vn-navy/85 backdrop-blur-xl shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="vn-container flex items-center justify-between gap-4 py-3">
        <a href="#top" className="flex items-center gap-2" aria-label="VAANISHIELD home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-vn-cyan to-vn-indigo text-vn-navy shadow-lg shadow-vn-cyan/20">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-mono text-base font-bold tracking-wide text-vn-text">
            VAANISHIELD
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-vn-muted transition-colors hover:text-vn-text hover:bg-white/5"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-vn-muted transition-colors hover:text-vn-text hover:bg-white/5"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="hidden rounded-xl bg-gradient-to-r from-vn-cyan to-vn-indigo px-4 py-2 text-sm font-bold text-white shadow-lg shadow-vn-cyan/20 transition-all hover:shadow-vn-cyan/40 hover:brightness-110 sm:inline-flex"
          >
            Try Live Demo
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-vn-border bg-white/5 p-2 text-vn-text md:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          className="border-t border-vn-border bg-vn-navy/95 px-4 py-3 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-vn-muted transition-colors hover:text-vn-text hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/demo"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-vn-cyan to-vn-indigo px-4 py-2.5 text-sm font-bold text-white"
            >
              Try Live Demo
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}