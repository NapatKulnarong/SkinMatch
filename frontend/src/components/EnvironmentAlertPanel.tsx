"use client";

import { ArrowPathIcon, MapPinIcon, SunIcon, ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

import { useEnvironmentAlerts } from "./EnvironmentAlertsProvider";

type EnvironmentAlertPanelProps = {
  className?: string;
};

const UV_SCALE = [
  { value: 1, label: "1", color: "#2e9c4c", risk: "Low" },
  { value: 2, label: "2", color: "#6cd34b", risk: "Low" },
  { value: 3, label: "3", color: "#f1e050", risk: "Moderate" },
  { value: 4, label: "4", color: "#ffd449", risk: "Moderate" },
  { value: 5, label: "5", color: "#ffbd3b", risk: "High" },
  { value: 6, label: "6", color: "#ff8e2a", risk: "High" },
  { value: 7, label: "7", color: "#ff6b21", risk: "High" },
  { value: 8, label: "8", color: "#ff3b2f", risk: "Very High" },
  { value: 9, label: "9", color: "#f7317a", risk: "Very High" },
  { value: 10, label: "10", color: "#c835b9", risk: "Extreme" },
  { value: 11, label: "11+", color: "#7e3dcf", risk: "Extreme" },
];

const MAX_UV = 11;

export function EnvironmentAlertPanel({ className = "" }: EnvironmentAlertPanelProps) {
  const { alerts, loading, error, locationLabel, lastUpdated, refresh, snapshot } = useEnvironmentAlerts();
  const uvSummary = snapshot?.uv;
  const uvValue = Math.min(Math.max(uvSummary?.index ?? 0, 0), MAX_UV);
  const uvPointerPercent = (uvValue / MAX_UV) * 100;

  const hasAlerts = alerts.length > 0;
  const primaryAlert = hasAlerts ? alerts[0] : null;
  const colorForRisk = (() => {
    if (uvValue >= 11) return "#7e3dcf";
    const match = UV_SCALE.find((segment) => segment.value === Math.ceil(uvValue));
    return match?.color ?? "#2e9c4c";
  })();

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  const uvRisk = (() => {
    if (!uvSummary) return "Unknown";
    if (uvValue >= 11) return "Extreme";
    const match = UV_SCALE.find((segment) => segment.value === Math.ceil(uvValue));
    return match?.risk ?? "Unknown";
  })();

  return (
    <section
      className={`rounded-[24px] sm:rounded-[32px] border-2 border-black bg-gradient-to-br from-[#d5ecff] via-[#c4e4ff] to-[#e6f4ff] p-5 sm:p-6 shadow-[4px_4px_0_rgba(0,0,0,0.3)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.22)] ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#134472] uppercase tracking-wide">
            <ShieldCheckIcon className="h-6 w-6" />
            <span>Sunscreen UV Alert</span>
          </div>
          <p className="text-xs sm:text-sm text-[#134472]/80">
            Daily UV intelligence so you know when to reapply SPF and add extra protection.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#1f2d26] shadow-[2px_3px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[3px_4px_0_rgba(0,0,0,0.25)] disabled:opacity-70"
          disabled={loading}
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mt-5 rounded-[22px] border-2 border-black bg-white/95 p-4 shadow-[3px_4px_0_rgba(0,0,0,0.2)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-[#1f2d26] flex items-center gap-2">
            <MapPinIcon className="h-4 w-4" />
            <span>{locationLabel}</span>
          </div>
          <div className="text-sm font-semibold text-[#1f2d26]">
            UV Index:{" "}
            <span className="text-xl sm:text-2xl font-black text-[#0d3064]">
              {uvSummary ? uvSummary.index.toFixed(1) : "--"}
            </span>{" "}
            <span className="text-xs uppercase tracking-wide text-[#0d3064]/70">{uvRisk}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative overflow-hidden rounded-full border-2 border-black bg-gradient-to-r from-[#2e9c4c] via-[#ffd449] via-[#ff6b21] via-[#f7317a] to-[#7e3dcf] h-5">
            <div
              className="absolute -top-1 h-7 w-[2px] bg-black shadow-[0_0_0_2px_#fff]"
              style={{ left: `calc(${uvPointerPercent}% - 1px)` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-11 text-center text-[10px] font-semibold text-[#0d3064]/70">
            {UV_SCALE.map((segment) => (
              <span key={segment.value}>{segment.label}</span>
            ))}
          </div>
        </div>

        <div
          className="mt-4 rounded-[18px] border-2 border-dashed border-black p-4"
          style={{ backgroundColor: `${colorForRisk}1A` }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#1f2d26]">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span>Checking local UV & air quality…</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border-2 border-[#B9375D] bg-[#fdecec] p-3 text-sm text-[#7b1c32]">
              {error}
            </div>
          ) : primaryAlert ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1f2d26]">
                {primaryAlert.category === "uv" ? (
                  <SunIcon className="h-5 w-5 text-[#f59e0b]" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-[#b45309]" />
                )}
                <span>{primaryAlert.title}</span>
              </div>
              <p className="text-sm text-[#1f2d26]/80">{primaryAlert.message}</p>
              {primaryAlert.tips.length > 0 && (
                <div className="mt-3 rounded-2xl border border-[#1f2d26]/10 bg-white px-4 py-3">
                  <ul className="list-disc space-y-2 text-xs sm:text-sm text-[#1f2d26]/80 pl-4">
                    {primaryAlert.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-black bg-[#e0f7ff] p-3 text-sm text-[#1f2d26]">
              <p className="font-semibold">You&apos;re all clear</p>
              <p className="text-xs text-[#1f2d26]/70">
                We&apos;ll ping you when UV or air quality needs extra care.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 text-[11px] text-[#1f2d26]/60 sm:flex-row sm:items-center sm:justify-between">
        <span>Last updated {formattedTime}</span>
        <span>Auto-refreshes every 10 minutes</span>
      </div>
    </section>
  );
}
