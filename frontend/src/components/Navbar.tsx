// src/components/Navbar.tsx
"use client"; // means "Run this code in the browser instead of only on the server."

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNavWidthSetter } from "./NavWidthContext";
import {
  getStoredProfile,
  PROFILE_EVENT,
  type StoredProfile,
} from "@/lib/auth-storage";

export default function Navbar() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  const setNavWidth = useNavWidthSetter();

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

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  useEffect(() => {
    const updateProfile = (next?: StoredProfile | null) => {
      setProfile(next ?? getStoredProfile());
    };

    updateProfile();

    const profileListener = (event: Event) => {
      if ("detail" in event) {
        const custom = event as CustomEvent<StoredProfile | null>;
        updateProfile(custom.detail ?? null);
        return;
      }
      updateProfile();
    };

    const storageListener = (event: StorageEvent) => {
      if (event.key === "sm_profile" || event.key === "sm_token") {
        updateProfile();
      }
    };

    window.addEventListener(PROFILE_EVENT, profileListener);
    window.addEventListener("storage", storageListener);
    return () => {
      window.removeEventListener(PROFILE_EVENT, profileListener);
      window.removeEventListener("storage", storageListener);
    };
  }, []);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const updateWidth = () => {
      const width = node.getBoundingClientRect().width;
      setNavWidth(Math.round(width));
    };

    updateWidth();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(node);
      return () => {
        observer.disconnect();
        setNavWidth(null);
      };
    }

    const handleResize = () => updateWidth();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      setNavWidth(null);
    };
  }, [setNavWidth]);
  const loginLabel = (() => {
    if (!profile) return "Login / Sign Up";
    const parts = [profile.first_name, profile.last_name].filter(
      (part): part is string => Boolean(part && part.trim())
    );
    if (parts.length) return parts.join(" ");
    return profile.username || "My Account";
  })();
  const loginHref = profile ? "/account" : "/login";
  const avatarSrc = profile?.avatar_url || "/default-profile.png";

  return (
    <header
      ref={headerRef}
      className="absolute top-0 left-0 w-full flex items-center justify-between px-6 py-4 z-20"
    >
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
            href={loginHref}
            aria-current={isActive(loginHref) ? "page" : undefined}
            className={`${pillBase} ${
              isActive(loginHref) ? "bg-[#c7b6ea] text-black" : "bg-gray-200 text-black"
            }`}
          >
            {loginLabel}
          </Link>

          {/* Small avatar INSIDE the bar (right side) */}
          <Image
            src={avatarSrc}
            alt="Profile avatar"
            width={36}
            height={36}
            className="rounded-full border-2 border-black bg-[#e9e3eb]" /* light-lavender fill like mock */
          />
        </div>
      </div>
    </header>
  );
}
