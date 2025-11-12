// src/components/Navbar.tsx
"use client";

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

  const pillBase =
    "h-8 px-3 flex items-center justify-center rounded-full font-semibold text-xs transition-colors duration-200 sm:h-9 sm:px-4 sm:text-sm";

  const activeStyles: Record<string, string> = {
    orange: "bg-[#f4bc78] text-black",
    green:  "bg-[#acdb93] text-black",
    blue:   "bg-[#94c6ef] text-black",
  };

  // Hover styles for each color
  const hoverStyles: Record<string, string> = {
    orange: "hover:bg-[#f4bc78] hover:text-black",
    green:  "hover:bg-[#acdb93] hover:text-black",
    blue:   "hover:bg-[#94c6ef] hover:text-black",
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
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => {
    setAvatarError(false);
  }, [avatarSrc]);
  const loginAriaLabel = profile ? "Open account" : "Log in or sign up";

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 z-30 flex w-full flex-col gap-2 bg-[#F5F5F0] px-4 py-3 pb-5 backdrop-blur sm:absolute sm:left-0 sm:right-0 sm:top-0 sm:z-20 sm:w-full sm:flex-row sm:items-center sm:justify-between sm:rounded-none sm:bg-transparent sm:px-6 sm:py-4"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="SkinMatch Logo"
            width={130}
            height={130}
            className="w-24 sm:w-32"
          />
        </Link>

        <Link
          href={loginHref}
          aria-current={isActive(loginHref) ? "page" : undefined}
          aria-label={loginAriaLabel}
          className="h-12 w-12 flex-shrink-0 sm:hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarError ? "/default-profile.png" : avatarSrc}
            alt="Profile avatar"
            className={`h-full w-full rounded-full border-2 border-black bg-[#e9e3eb] object-cover ${
              isActive(loginHref) ? "shadow-[0_0_0_2px_#c7b6ea]" : ""
            }`}
            onError={() => setAvatarError(true)}
          />
        </Link>
      </div>

      <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <div className="flex w-full items-center justify-between gap-1 rounded-full border-2 border-black bg-white px-2 py-1 shadow-[2px_3px_0px_rgba(0,0,0,0.3)] sm:h-14 sm:w-auto sm:gap-2 sm:px-4 sm:py-3">
          {links.map(({ href, label, color }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`${pillBase} ${
                isActive(href)
                  ? activeStyles[color]
                  : `${inactive} ${hoverStyles[color]}`
              } flex-1 whitespace-nowrap sm:flex-none`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-3 shadow-[2px_3px_0px_rgba(0,0,0,0.3)] sm:flex sm:h-14">
          <Link
            href={loginHref}
            aria-current={isActive(loginHref) ? "page" : undefined}
            className={`${pillBase} hidden whitespace-nowrap sm:flex ${
              isActive(loginHref)
                ? "bg-[#c7b6ea] text-black"
                : "bg-gray-200 text-black hover:bg-[#c7b6ea]"
            }`}
          >
            {loginLabel}
          </Link>

          <Link
            href={loginHref}
            aria-current={isActive(loginHref) ? "page" : undefined}
            aria-label={loginAriaLabel}
            className="hidden h-10 w-10 flex-shrink-0 sm:block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarError ? "/default-profile.png" : avatarSrc}
              alt="Profile avatar"
              className={`h-full w-full rounded-full border-2 border-black bg-[#e9e3eb] object-cover ${
                isActive(loginHref) ? "shadow-[0_0_0_2px_#c7b6ea]" : ""
              }`}
              onError={() => setAvatarError(true)}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
