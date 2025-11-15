"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CameraIcon,
  SparklesIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/solid";
import { scanProductLabel, scanIngredientsText, type ScanLabelResult } from "@/lib/api.scan";
import { getFriendlyErrorMessage } from "@/lib/errors";

type Status = "idle" | "uploading" | "success" | "error";

export function ProductScanner() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanLabelResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedFile]);

  const handleFileChange = useCallback((file?: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setError(null);
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFileChange(file ?? null);
  }, [handleFileChange]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    handleFileChange(file ?? null);
  }, [handleFileChange]);

  const handleScan = useCallback(async () => {
    if (!selectedFile && !manualText.trim()) {
      setError("Upload a photo or paste an ingredient list first.");
      return;
    }
    setStatus("uploading");
    setError(null);
    try {
      let payload: ScanLabelResult;
      if (manualText.trim()) {
        payload = await scanIngredientsText(manualText.trim());
      } else {
        payload = await scanProductLabel(selectedFile as File);
      }
      setResult(payload);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "We couldn't scan that. Please try again.";
      setError(getFriendlyErrorMessage(message));
      setStatus("error");
    }
  }, [selectedFile, manualText]);

  const infoLists = useMemo(() => {
    if (!result) return null;
    const toPairs = (items: string[]) =>
      (items || []).map((item) => {
        const [headline, ...rest] = item.split(":");
        const body = rest.join(":").trim();
        return {
          headline: headline.trim(),
          body,
        };
      });

    return [
      {
        key: "benefits",
        title: "Benefits",
        icon: SparklesIcon,
        accent: "text-[#6b3e3e]",
        badge: `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
        items: toPairs(result.benefits),
      },
      {
        key: "actives",
        title: "Active Ingredients",
        icon: BeakerIcon,
        accent: "text-[#5a2e2e]",
        badge: "What each active does",
        items: toPairs(result.actives).map((item) => ({
          headline: item.headline,
          body: item.body || "Supports overall formula balance.",
        })),
      },
      {
        key: "concerns",
        title: "Watch Outs",
        icon: ExclamationTriangleIcon,
        accent: "text-[#7b2b2b]",
        items: toPairs(result.concerns),
      },
      {
        key: "notes",
        title: "Notes",
        icon: ClipboardDocumentListIcon,
        accent: "text-[#5a4230]",
        items: toPairs(result.notes),
      },
    ];
  }, [result]);

  const isUploading = status === "uploading";

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setManualText("");
    setResult(null);
    setError(null);
    setStatus("idle");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  return (
    <section className="relative rounded-[24px] sm:rounded-[28px] border-2 border-black bg-gradient-to-br from-[#ffcdc3] via-[#ff9d94] to-[#cb3642]  shadow-[4px_6px_0_rgba(0,0,0,0.15)] overflow-visible">
      <div className="hidden md:block absolute -top-4 right-4 sm:-top-6 sm:right-8 md:-top-48 md:-right-8 z-10 pointer-events-none">
        <img
          src="/img/mascot/matchy_scan.png"
          alt="Matchy with camera"
          className="h-auto w-[190px] sm:w-[220px] md:w-[280px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
        />
      </div>

      <div className="relative px-6 py-8 sm:px-10 sm:py-6 pt-6 sm:pt-10">
        <div className="mx-auto w-full max-w-7xl lg:text-center space-y-4">
          <div className="space-y-2">
            <div className="flex items-center lg:justify-center gap-2 lg:gap-3">
              <CameraIcon className="h-7 w-7 md:h-10 md:w-10 sm:h-10 sm:w-10 text-[#8C1007]" />
              <h2 className="text-xl sm:text-2xl font-bold text-[#8C1007]">
                Instant Product Scanner
              </h2>  
            </div>
            <p className="text-sm sm:text-base text-[#6b3e3e]/90 max-w-2xl mx-auto">
            Upload a clear photo of the ingredient list. We will read the label, identify key active ingredients, 
            flag concerns, and provide a brief overview of the product’s use.
            </p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2 w-full">
            <label
              htmlFor="scan-upload"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="flex lg:min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-[5px] lg:rounded-[24px] border-2 border-black bg-white/80 px-6 py-6 text-center shadow-[0_6px_0_rgba(0,0,0,0.2)] cursor-pointer"
            >
              <input
                ref={inputRef}
                id="scan-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInputChange}
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded label preview"
                  className="max-h-48 rounded-2xl border border-black/10 object-contain"
                />
              ) : (
                <div className="space-y-2">
                  <SparklesIcon className="mx-auto h-6 lg:h-8 w-7 lg:w-8 text-[#a85b5b]/70 animate-pulse" />
                  <p className="text-sm font-semibold text-[#5a4230]">Drop a photo or tap to browse</p>
                  <p className="text-xs text-[#5a4230]/70">PNG / JPG up to 10MB</p>
                </div>
              )}
            </label>

            <div className="rounded-[5px] lg:rounded-[24px] border-2 border-black bg-white/90 p-4 text-left shadow-[0_4px_0_rgba(0,0,0,0.15)] flex flex-col">
              <label htmlFor="manual-ingredients" className="block text-sm font-bold text-[#6b3e3e] mb-2">
                Or paste the ingredient list directly
              </label>
              <textarea
                id="manual-ingredients"
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                placeholder="Deionized Water, Garcinia Mangostana Peel Extract, Glyceryl Glucoside, ..."
                rows={6}
                className="h-full min-h-[150px] lg:min-h-[240px] w-full lg:rounded-2xl border-2 border-black/50 bg-white px-3 py-2 text-sm text-[#5a4230] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f2c9b5]/60"
              />
            </div>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-[5px] lg:rounded-full border-2 border-black bg-[#ffbd95] px-5 py-2 lg:py-2.5 text-sm font-semibold text-black shadow-[0_4px_0_rgba(0,0,0,0.2)] flex-1 min-w-[140px]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleScan}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2 rounded-[5px] lg:rounded-full border-2 border-black bg-[#FFFCFB] px-6 py-2 lgpy-2.5 text-sm font-semibold text-black shadow-[0_4px_0_rgba(0,0,0,0.2)] disabled:cursor-not-allowed disabled:opacity-70 flex-1 min-w-[140px]"
            >
              Scan Product
            </button>
            
          </div>
          {error && (
            <div className="rounded-2xl border-2 border-black bg-[#fff4f2] px-4 py-3 text-sm font-semibold text-[#7c2b2b]">
              {error}
            </div>
          )}
          {isUploading && (
            <div className="flex flex-row items-center justify-center gap-2 rounded-[5px] lg:rounded-2xl border-2 border-black bg-white/80 px-4 py-3 lg:py-4 text-sm font-semibold text-[#5a4230]">
              <SparklesIcon className="h-6 w-6 animate-bounce text-[#a85b5b]" />
              <p>Analyzing ingredients… sit tight!</p>
            </div>
          )}

          {result && infoLists && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {infoLists.map(({ key, title, icon: Icon, accent, badge, items }) => (
                <div
                  key={key}
                  className="rounded-[5px] lg:rounded-2xl border-2 border-black bg-gradient-to-b from-[#fff6f4] to-[#ffe7e2] p-4 text-left shadow-[0_5px_0_rgba(0,0,0,0.15)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${accent}`} />
                      <p className={`text-sm font-bold ${accent}`}>{title}</p>
                    </div>
                    {badge && <span className="text-[10px] font-semibold text-[#5a4230]/70">{badge}</span>}
                  </div>
                  {items.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-[#46342b]">
                      {items.map(({ headline, body }, idx) => (
                        <li key={`${key}-${headline}-${idx}`} className="lg:rounded-xl bg-white/60 px-3 py-2 border border-[#f4d5d0] shadow-inner">
                          <span className="font-semibold text-[#4a2b2b]">{headline}</span>
                          {body && <p className="text-xs text-[#6b4c43] mt-0.5">{body}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-[#5a4230]/60">No insights detected.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="w-full text-center text-xs lg:text-sm font-semibold text-[#6b3e3e]/70">
            powered by Gemini AI
          </p>
        </div>
      </div>
    </section>
  );
}
