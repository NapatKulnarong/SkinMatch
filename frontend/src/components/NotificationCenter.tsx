"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { QUIZ_COMPLETED_EVENT } from "@/app/quiz/_QuizContext";
import { PROFILE_EVENT, getAuthToken, getStoredProfile } from "@/lib/auth-storage";

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

type StoredNotification = Omit<NotificationItem, "createdAt"> & {
  createdAt: string;
};

const NOTIFICATION_STORAGE_PREFIX = "sm_notifications";

const getNotificationStorageKey = (userId: string) =>
  `${NOTIFICATION_STORAGE_PREFIX}_${userId}`;

const loadNotificationsForUser = (userId: string): NotificationItem[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(getNotificationStorageKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredNotification[];
    return parsed
      .map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }))
      .filter((item) => !Number.isNaN(item.createdAt.getTime()));
  } catch (error) {
    console.warn("Failed to load notifications", error);
    return [];
  }
};

const persistNotificationsForUser = (userId: string, notifications: NotificationItem[]) => {
  if (typeof window === "undefined") {
    return;
  }
  const payload: StoredNotification[] = notifications.map(({ createdAt, ...rest }) => ({
    ...rest,
    createdAt: createdAt.toISOString(),
  }));
  localStorage.setItem(getNotificationStorageKey(userId), JSON.stringify(payload));
};

export function NotificationCenterProvider({ children }: PropsWithChildren) {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const lastPersistedUserRef = useRef<string | null>(null);

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
    const syncUserFromProfile = () => {
      const profile = getStoredProfile();
      setUserId(profile?.u_id ?? null);
    };
    syncUserFromProfile();
    window.addEventListener(PROFILE_EVENT, syncUserFromProfile);
    return () => window.removeEventListener(PROFILE_EVENT, syncUserFromProfile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!userId) {
      setNotifications([]);
      return;
    }
    setNotifications(loadNotificationsForUser(userId));
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!userId) {
      lastPersistedUserRef.current = null;
      return;
    }
    if (lastPersistedUserRef.current !== userId) {
      lastPersistedUserRef.current = userId;
      return;
    }
    persistNotificationsForUser(userId, notifications);
  }, [notifications, userId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleQuizCompleted = () => {
      const token = getAuthToken();
      if (!token) {
        return;
      }

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
