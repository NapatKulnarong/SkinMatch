"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchEnvironmentAlerts,
  type EnvironmentAlert,
  type EnvironmentAlertResponse,
} from "@/lib/api.alerts";

type EnvironmentAlertsContextValue = {
  alerts: EnvironmentAlert[];
  snapshot: EnvironmentAlertResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  locationLabel: string;
  refresh: () => Promise<void>;
};

const DEFAULT_COORDS = {
  latitude: 13.7563,
  longitude: 100.5018,
  label: "Bangkok",
};

const REFRESH_MS = 10 * 60 * 1000; // exactly 10 minutes

const EnvironmentAlertsContext = createContext<EnvironmentAlertsContextValue | null>(null);

export function EnvironmentAlertsProvider({ children }: { children: React.ReactNode }) {
  const coordsRef = useRef(DEFAULT_COORDS);
  const [snapshot, setSnapshot] = useState<EnvironmentAlertResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchEnvironmentAlerts({
        latitude: coordsRef.current.latitude,
        longitude: coordsRef.current.longitude,
      });
      setSnapshot(payload);
      setLastUpdated(new Date(payload.generatedAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch environment alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + geolocation
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      refresh();
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        coordsRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Your location",
        };
        refresh();
      },
      () => {
        if (!cancelled) {
          refresh();
        }
      },
      { timeout: 6000 }
    );

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Auto refresh loop (15-30 minutes, randomized)
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const locationLabel = snapshot?.locationLabel || coordsRef.current.label || DEFAULT_COORDS.label;

  const value = useMemo<EnvironmentAlertsContextValue>(
    () => ({
      alerts: snapshot?.alerts ?? [],
      snapshot,
      loading,
      error,
      lastUpdated,
      locationLabel,
      refresh,
    }),
    [snapshot, loading, error, lastUpdated, locationLabel, refresh]
  );

  return (
    <EnvironmentAlertsContext.Provider value={value}>
      {children}
    </EnvironmentAlertsContext.Provider>
  );
}

export function useEnvironmentAlerts() {
  const context = useContext(EnvironmentAlertsContext);
  if (!context) {
    throw new Error("useEnvironmentAlerts must be used within EnvironmentAlertsProvider");
  }
  return context;
}
