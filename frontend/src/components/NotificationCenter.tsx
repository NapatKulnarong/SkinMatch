"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { QUIZ_COMPLETED_EVENT } from "@/app/quiz/_QuizContext";

export type NotificationLink = {
  label: string;
  href: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  type: "personal_picks" | "generic";
  link?: NotificationLink;
};

type NotificationInput = {
  title: string;
  message: string;
  type?: NotificationItem["type"];
  link?: NotificationLink;
};

type NotificationCenterValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (input: NotificationInput) => void;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  dismiss: (id: string) => void;
};

const NotificationCenterContext = createContext<NotificationCenterValue | null>(null);

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `notif_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export function NotificationCenterProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((input: NotificationInput) => {
    setNotifications((prev) => {
      const next: NotificationItem = {
        id: generateId(),
        title: input.title,
        message: input.message,
        createdAt: new Date(),
        read: false,
        link: input.link,
        type: input.type ?? "generic",
      };
      return [next, ...prev].slice(0, 20);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleQuizCompleted = () => {
      addNotification({
        type: "personal_picks",
        title: "Personal Picks refreshed",
        message: "We updated your Personal Picks with new insights from your quiz. Take a look!",
        link: { label: "View", href: "/facts#facts-recommended" },
      });
    };

    window.addEventListener(QUIZ_COMPLETED_EVENT, handleQuizCompleted);
    return () => window.removeEventListener(QUIZ_COMPLETED_EVENT, handleQuizCompleted);
  }, [addNotification]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const value = useMemo<NotificationCenterValue>(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      markAsRead,
      dismiss,
    }),
    [notifications, unreadCount, addNotification, markAllRead, markAsRead, dismiss]
  );

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) {
    throw new Error("useNotificationCenter must be used within a NotificationCenterProvider");
  }
  return ctx;
}
