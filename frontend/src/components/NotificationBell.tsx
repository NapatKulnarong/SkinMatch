"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellAlertIcon } from "@heroicons/react/24/outline";

import { useNotificationCenter } from "./NotificationCenter";

type NotificationBellProps = {
  className?: string;
};

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { notifications, unreadCount, markAllRead, markAsRead, dismiss } = useNotificationCenter();

  const buttonClasses =
    "relative group flex h-12 w-12 sm:h-[3.5rem] sm:w-[3.5rem] items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_3px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 hover:shadow-[3px_4px_0_rgba(0,0,0,0.25)]";

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
    <span className="relative flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
      <span aria-hidden className="absolute inset-0 rounded-full bg-[#E5E7EB]" />
      <BellAlertIcon className="relative h-5 w-5 text-black" />
    </span>
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
        <span
          className="absolute -top-1 -right-1 flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-[#B9375D] px-1 text-[10px] font-bold text-white shadow"
        >
          {unreadCount}
        </span>
      </button>

      {isOpen && (
        <div className={panelClasses}>
          {notifications.length === 0 ? (
            <div className="text-sm text-[#1f2d26]/70">
              You&apos;re all caught up. Finish a quiz to see Personal Picks notifications here.
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {notifications.map((notification) => {
                  const tone =
                    notification.type === "personal_picks"
                      ? "from-[#FFF1CA] via-[#F9D689] to-[#FFF1CA]"
                      : "from-white via-white to-white";
                  return (
                    <li
                      key={notification.id}
                      className={`relative rounded-[18px] border-2 border-black bg-gradient-to-br ${tone} p-3 shadow-[3px_4px_0_rgba(0,0,0,0.2)] ${
                        notification.read ? "opacity-80" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1f2d26]">{notification.title}</p>
                          <p className="text-xs text-[#1f2d26]/70">{notification.message}</p>
                        </div>
                        {!notification.read && (
                          <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-[#B9375D]" />
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[11px] text-[#1f2d26]/60">
                        <span className="text-[#1f2d26]/70">
                          {notification.createdAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
                          {notification.link ? (
                            <Link
                              href={notification.link.href}
                              className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-semibold text-[#1f2d26] whitespace-nowrap shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5"
                              onClick={() => markAsRead(notification.id)}
                            >
                              {notification.type === "personal_picks"
                                ? "View"
                                : notification.link.label}
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => dismiss(notification.id)}
                            aria-label="Dismiss notification"
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-sm font-semibold text-[#1f2d26] shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={markAllRead}
                className="w-full rounded-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold text-[#1f2d26] shadow-[2px_3px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
