// src/components/Navbar.tsx
"use client"; // means "Run this code in the browser instead of only on the server."

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();

  // same look/size as your Button (flat)
  const pillBase =
    "h-9 px-4 flex items-center justify-center rounded-full font-semibold text-sm transition";

  const activeStyles: Record<string, string> = {
    orange: "bg-[#f4bc78] text-black",
    green:  "bg-[#acdb93] text-black",
    blue:   "bg-[#94c6ef] text-black",
  };
  const inactive = "bg-gray-200 text-black";

  const links = [
    { href: "/",      label: "Home",       color: "orange" as const },
    { href: "/facts", label: "Skin Facts", color: "green"  as const },
    { href: "/about", label: "About Us",   color: "blue"   as const },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // username (if you later set it in localStorage)
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("sm_username");
      if (stored) setUsername(stored);
    } catch {}
  }, []);
  const loginLabel = username && username.trim() !== "" ? username : "Login / Sign Up";

  return (
    <header className="absolute top-0 left-0 w-full flex items-center justify-between px-6 py-4 z-20">
      {/* Logo on the left (unchanged) */}
      <div className="flex items-center space-x-2">
        <Image src="/logo.png" alt="SkinMatch Logo" width={130} height={130} />
      </div>

      {/* Center nav (unchanged) */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 border-2 border-black rounded-full px-3 py-2 bg-white shadow-[2px_3px_0px_rgba(0,0,0,0.3)]">
          {links.map(({ href, label, color }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`${pillBase} ${isActive(href) ? activeStyles[color] : inactive}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* LOGIN BAR — matches your mockup */}
        <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-2 bg-white shadow-[2px_3px_0px_rgba(0,0,0,0.3)]">
          {/* Inner pill that turns purple when on /login */}
          <Link
            href="/login"
            aria-current={isActive("/login") ? "page" : undefined}
            className={`${pillBase} ${
              isActive("/login") ? "bg-[#c7b6ea] text-black" : "bg-gray-200 text-black"
            }`}
          >
            {loginLabel}
          </Link>

          {/* Small avatar INSIDE the bar (right side) */}
          <Image
            src="/default-profile.png"
            alt="Profile"
            width={36}
            height={36}
            className="rounded-full border-2 border-black bg-[#e9e3eb]" /* light-lavender fill like mock */
          />
        </div>
      </div>
    </header>
  );
}