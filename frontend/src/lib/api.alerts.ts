export type EnvironmentAlert = {
  id: string;
  category: "uv" | "air_quality" | string;
  severity: string;
  title: string;
  message: string;
  tips: string[];
  validUntil: string;
};

export type UVSummary = {
  index: number;
  maxIndex: number;
  level: string;
  levelLabel: string;
  message: string;
};

export type AirQualitySummary = {
  pm25: number;
  pm10: number;
  aqi: number;
  level: string;
  levelLabel: string;
  message: string;
};

export type EnvironmentAlertResponse = {
  generatedAt: string;
  latitude: number;
  longitude: number;
  locationLabel?: string | null;
  uv: UVSummary;
  airQuality: AirQualitySummary;
  alerts: EnvironmentAlert[];
  sourceName: string;
  sourceUrl: string;
  refreshMinutes: number;
};

type FetchAlertsParams = {
  latitude?: number;
  longitude?: number;
  signal?: AbortSignal;
};

export async function fetchEnvironmentAlerts(
  params: FetchAlertsParams = {}
): Promise<EnvironmentAlertResponse> {
  const searchParams = new URLSearchParams();
  if (typeof params.latitude === "number") {
    searchParams.set("latitude", params.latitude.toString());
  }
  if (typeof params.longitude === "number") {
    searchParams.set("longitude", params.longitude.toString());
  }

  const query = searchParams.toString();
  const res = await fetch(
    query ? `/api/alerts/environment?${query}` : `/api/alerts/environment`,
    {
      method: "GET",
      cache: "no-store",
      signal: params.signal,
    }
  );

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || "Unable to fetch environment alerts.");
  }

  const payload: AlertApiPayload = await res.json();
  return mapAlertResponse(payload);
}

type AlertApiPayload = {
  generated_at: string;
  latitude: number;
  longitude: number;
  location_label?: string | null;
  uv?: {
    index?: number;
    max_index?: number;
    level?: string;
    level_label?: string;
    message?: string;
  };
  air_quality?: {
    pm25?: number;
    pm10?: number;
    aqi?: number;
    level?: string;
    level_label?: string;
    message?: string;
  };
  alerts?: RawAlert[];
  source_name?: string;
  source_url?: string;
  refresh_minutes?: number;
};

type RawAlert = {
  id: string;
  category?: string;
  severity?: string;
  title?: string;
  message?: string;
  tips?: unknown;
  valid_until?: string;
};

const normalizeTips = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

const mapAlertResponse = (payload: AlertApiPayload): EnvironmentAlertResponse => ({
  generatedAt: payload.generated_at,
  latitude: payload.latitude,
  longitude: payload.longitude,
  locationLabel: payload.location_label ?? null,
  uv: {
    index: payload.uv?.index ?? 0,
    maxIndex: payload.uv?.max_index ?? payload.uv?.index ?? 0,
    level: payload.uv?.level ?? "unknown",
    levelLabel: payload.uv?.level_label ?? "Unknown",
    message: payload.uv?.message ?? "",
  },
  airQuality: {
    pm25: payload.air_quality?.pm25 ?? 0,
    pm10: payload.air_quality?.pm10 ?? 0,
    aqi: payload.air_quality?.aqi ?? 0,
    level: payload.air_quality?.level ?? "unknown",
    levelLabel: payload.air_quality?.level_label ?? "Unknown",
    message: payload.air_quality?.message ?? "",
  },
  alerts: Array.isArray(payload.alerts)
    ? payload.alerts.map((item) => ({
        id: item.id,
        category: item.category ?? "general",
        severity: item.severity ?? "unknown",
        title: item.title ?? "Alert",
        message: item.message ?? "",
        tips: normalizeTips(item.tips),
        validUntil: item.valid_until ?? payload.generated_at,
      }))
    : [],
  sourceName: payload.source_name ?? "Open-Meteo",
  sourceUrl: payload.source_url ?? "https://open-meteo.com/",
  refreshMinutes: payload.refresh_minutes ?? 60,
});
