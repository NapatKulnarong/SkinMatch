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

type RawUvSummary = {
  index?: number;
  max_index?: number;
  level?: string;
  level_label?: string;
  message?: string;
};

type RawAirQuality = {
  pm25?: number;
  pm10?: number;
  aqi?: number;
  level?: string;
  level_label?: string;
  message?: string;
};

type RawEnvironmentAlertItem = {
  id: string | number;
  category?: string;
  severity?: string;
  title?: string;
  message?: string;
  tips?: unknown;
  valid_until?: string;
};

type RawEnvironmentAlertResponse = {
  generated_at?: string;
  latitude?: number;
  longitude?: number;
  location_label?: string | null;
  uv?: RawUvSummary;
  air_quality?: RawAirQuality;
  alerts?: RawEnvironmentAlertItem[];
  source_name?: string;
  source_url?: string;
  refresh_minutes?: number;
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

  const payload: RawEnvironmentAlertResponse = await res.json();
  return mapAlertResponse(payload);
}

const mapAlertResponse = (payload: RawEnvironmentAlertResponse): EnvironmentAlertResponse => ({
  generatedAt: payload.generated_at ?? new Date().toISOString(),
  latitude: payload.latitude ?? 0,
  longitude: payload.longitude ?? 0,
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
        id: String(item.id),
        category: item.category ?? "general",
        severity: item.severity ?? "info",
        title: item.title ?? "Notice",
        message: item.message ?? "",
        tips: Array.isArray(item.tips)
          ? item.tips.filter((tip): tip is string => typeof tip === "string")
          : [],
        validUntil: item.valid_until ?? "",
      }))
    : [],
  sourceName: payload.source_name ?? "Open-Meteo",
  sourceUrl: payload.source_url ?? "https://open-meteo.com/",
  refreshMinutes: payload.refresh_minutes ?? 60,
});
