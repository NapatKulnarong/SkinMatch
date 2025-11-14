// src/components/Navbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNavWidthSetter } from "./NavWidthContext";
import NotificationBell from "./NotificationBell";
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

  const [showDesktopNav, setShowDesktopNav] = useState(true);
  const [showMobileNav, setShowMobileNav] = useState(true);
  const [isPastTop, setIsPastTop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let lastY = window.scrollY;
    let raf: number | null = null;

    const updateBgState = () => {
      const shouldTint = window.scrollY > 4;
      setIsPastTop((prev) => (prev === shouldTint ? prev : shouldTint));
    };

    updateBgState();

    const run = () => {
      raf = null;
      const currentY = window.scrollY;
      const delta = currentY - lastY;
      const isDesktop = window.innerWidth >= 768;
      const threshold = isDesktop ? 10 : 4;

      if (currentY <= 0 || delta < -threshold) {
        if (isDesktop) {
          setShowDesktopNav(true);
        } else {
          setShowMobileNav(true);
        }
      } else if (delta > threshold) {
        if (isDesktop) {
          setShowDesktopNav(false);
        } else {
          setShowMobileNav(false);
        }
      }

      lastY = currentY;
    };

    const handleScroll = () => {
      updateBgState();
      if (raf) return;
      raf = window.requestAnimationFrame(run);
    };

    const handleResize = () => {
      lastY = window.scrollY;
      updateBgState();
      setShowDesktopNav(true);
      setShowMobileNav(true);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 z-50 flex w-full flex-col gap-2 px-4 py-3 pb-5 transition-transform duration-300 ${
        showMobileNav ? "translate-y-0" : "-translate-y-full"
      } ${isPastTop ? "bg-[#FAF7F3]" : "bg-transparent"}
                sm:absolute sm:left-0 sm:right-0 sm:top-0 sm:z-50 sm:w-full sm:flex-row sm:items-center sm:justify-between sm:rounded-none ${
                  isPastTop ? "sm:bg-[#FAF7F3]" : "sm:bg-transparent"
                } sm:px-6 sm:py-4 
                md:fixed md:inset-x-0 md:top-0 md:px-6 md:py-1 ${
                  showDesktopNav ? "md:translate-y-0" : "md:-translate-y-full"
                } ${isPastTop ? "md:bg-[#FAF7F3]" : "md:bg-transparent"}`}
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

        <div className="flex items-center gap-2 sm:hidden">
          <NotificationBell />
          <Link
            href={loginHref}
            aria-current={isActive(loginHref) ? "page" : undefined}
            aria-label={loginAriaLabel}
            className="h-12 w-12 flex-shrink-0"
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

      <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <div className="order-1 flex w-full items-center justify-between gap-1 rounded-full border-2 border-black bg-white px-2 py-1 shadow-[2px_3px_0px_rgba(0,0,0,0.3)] sm:h-14 sm:w-auto sm:gap-2 sm:px-4 sm:py-3">
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

        <div className="order-2 hidden items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-3 shadow-[2px_3px_0px_rgba(0,0,0,0.3)] sm:flex sm:h-14">
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

        <NotificationBell className="order-3 hidden sm:flex" />
      </div>
    </header>
  );
}
