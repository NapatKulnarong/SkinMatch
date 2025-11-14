"use client";

import { useEffect, useRef, useState } from "react";
import { BellAlertIcon } from "@heroicons/react/24/outline";

type NotificationBellProps = {
  className?: string;
};

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const badgeCount = 0;

  const buttonClasses =
    "relative flex items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_3px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 hover:shadow-[3px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 sm:px-5 sm:py-3 min-h-[3rem] sm:min-h-[3.5rem]";

  const panelClasses =
    "absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border-2 border-black bg-white p-4 text-sm shadow-[5px_6px_0_rgba(0,0,0,0.3)] z-50";

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const icon = (
    <BellAlertIcon
      className={`h-5 w-5 ${badgeCount ? "text-[#B9375D]" : "text-black"}`}
    />
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Concern forecast alerts"
        className={buttonClasses}
      >
        {icon}
        <span className="ml-2 hidden text-sm font-semibold sm:inline">Alerts</span>
      </button>

      {isOpen && (
        <div className={panelClasses}>
          <div className="text-sm text-[#1f2d26]/70">
            Future multi-feature notifications will appear here.
          </div>
        </div>
      )}
    </div>
  );
}
