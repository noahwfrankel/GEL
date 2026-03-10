"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/saved", label: "Saved", icon: "heart" },
  { href: "/profile", label: "Profile", icon: "user" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-[60px] bg-[#0a0a0a] border-t border-[rgba(255,255,255,0.08)] flex items-center justify-around"
      aria-label="Bottom navigation"
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 py-2 min-w-[64px] transition-colors duration-200"
            aria-current={active ? "page" : undefined}
          >
            {icon === "home" && (
              <svg
                className={`h-6 w-6 ${active ? "text-[#22c55e]" : "text-[#52525b]"}`}
                fill={active ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            )}
            {icon === "heart" && (
              <svg
                className={`h-6 w-6 ${active ? "text-[#22c55e]" : "text-[#52525b]"}`}
                fill={active ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
            {icon === "user" && (
              <svg
                className={`h-6 w-6 ${active ? "text-[#22c55e]" : "text-[#52525b]"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            <span className={`text-[11px] font-medium ${active ? "text-[#22c55e]" : "text-[#52525b]"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
