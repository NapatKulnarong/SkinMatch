"use client";

import Image from "next/image";
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
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError("Please upload a PNG, JPG, or WebP image file.");
      return;
    }
    
    // Validate file size (10MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image file is too large. Maximum size is 10MB.");
      return;
    }
    
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
        accent: "text-[#C85A7A]",
        badge: `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
        items: toPairs(result.benefits),
      },
      {
        key: "actives",
        title: "Active Ingredients",
        icon: BeakerIcon,
        accent: "text-[#C85A7A]",
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
        accent: "text-[#C85A7A]",
        items: toPairs(result.concerns),
      },
      {
        key: "notes",
        title: "Notes",
        icon: ClipboardDocumentListIcon,
        accent: "text-[#B85A6A]",
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
    <section className="relative rounded-[24px] sm:rounded-[28px] border-2 border-black bg-gradient-to-br from-[#FFB5C2] via-[#FFA8B8] to-[#FF9DB3] shadow-[4px_6px_0_rgba(0,0,0,0.15)] overflow-visible">
      <div className="hidden lg:block absolute md:-top-42 md:-right-2 z-10 pointer-events-none">
        <Image
          src="/img/mascot/matchy_cam.png"
          alt="Matchy with camera"
          width={300}
          height={300}
          className="h-auto w-[190px] sm:w-[220px] md:w-[275px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
          priority
          unoptimized
        />
      </div>

      <div className="relative px-6 py-5 sm:px-10 sm:py-6 pt-6 sm:pt-10">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 lg:justify-start">
              <CameraIcon className="h-5 w-5 md:h-8 md:w-8 sm:h-6 sm:w-6 text-[#8B3A4A]" />
              <h2 className="text-xl sm:text-2xl font-bold text-[#8B3A4A] text-left">
                Instant Product Scanner
              </h2>  
            </div>
            <p className="text-left text-sm sm:text-base text-[#6B2A3A] mx-auto lg:mx-0">
            Upload a clear photo of the ingredient list. We will identify key active ingredients, 
            flag concerns, and provide a brief overview of the product.
            </p>
         </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2 w-full">
            <label
              htmlFor="scan-upload"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="flex lg:min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-[5px] border-2 border-black bg-white/70 px-6 py-6 
                        text-center shadow-[0_6px_0_rgba(0,0,0,0.2)] cursor-pointer"
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
                <Image
                  src={previewUrl}
                  alt="Uploaded label preview"
                  width={320}
                  height={320}
                  className="max-h-48 rounded-2xl border border-black/10 object-contain w-auto h-auto"
                  unoptimized
                />
              ) : (
                <div className="space-y-2">
                  <SparklesIcon className="mx-auto h-6 lg:h-8 w-7 lg:w-8 text-[#C85A7A]/70 animate-pulse" />
                  <p className="text-sm font-semibold text-[#B85A6A]">Drop a photo or tap to browse</p>
                  <p className="text-xs text-[#B85A6A]/70">PNG / JPG up to 10MB</p>
                </div>
              )}
            </label>

            <div className="rounded-[5px] border-2 border-black  bg-white/70  p-4 text-left shadow-[0_4px_0_rgba(0,0,0,0.15)] flex flex-col">
              <label htmlFor="manual-ingredients" className="block text-sm font-bold text-[#B85A6A] mb-2">
                Or paste the ingredient list directly
              </label>
              <textarea
                id="manual-ingredients"
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                placeholder="Deionized Water, Garcinia Mangostana Peel Extract, Glyceryl Glucoside, ..."
                rows={6}
                className="h-full min-h-[150px] lg:min-h-[200px] w-full border border-dashed border-black/50 bg-white/60 px-3 py-2 text-sm text-[#B85A6A] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFB5C2]/60"
              />
            </div>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-[5px] border-2 border-black bg-[#FFFCFB] px-5 py-2 lg:py-2.5 text-sm font-semibold text-black shadow-[0_4px_0_rgba(0,0,0,0.2)]  hover:bg-white/50  flex-1 min-w-[140px]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleScan}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2 rounded-[5px] border-2 border-black bg-[#FFFCFB] px-6 py-2 lgpy-2.5 text-sm font-semibold text-black shadow-[0_4px_0_rgba(0,0,0,0.2)] hover:bg-white/50 disabled:cursor-not-allowed disabled:opacity-70 flex-1 min-w-[140px]"
            >
              Scan Product
            </button>
            
          </div>
          {error && (
            <div className="rounded-[5px] border-2 border-black bg-[#FFE5E8] px-4 py-3 text-sm font-semibold text-[#C85A7A]">
              {error}
            </div>
          )}
          {isUploading && (
            <div className="flex flex-row items-center justify-center gap-2 rounded-[5px] border-2 border-black bg-[#FFD7DC] px-4 py-3 lg:py-4 text-sm font-semibold text-[#B85A6A]">
              <SparklesIcon className="h-6 w-6 animate-bounce text-[#C85A7A]" />
              <p>Analyzing ingredients… sit tight!</p>
            </div>
          )}

          {result && infoLists && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {infoLists.map(({ key, title, icon: Icon, accent, badge, items }) => (
                <div
                  key={key}
                  className="rounded-[5px] border-2 border-black bg-gradient-to-b from-[#FFE5E8] to-[#FFD7DC] p-4 text-left shadow-[0_5px_0_rgba(0,0,0,0.15)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${accent}`} />
                      <p className={`text-sm font-bold ${accent}`}>{title}</p>
                    </div>
                    {badge && <span className="text-[10px] font-semibold text-[#B85A6A]/70">{badge}</span>}
                  </div>
                  {items.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-[#B85A6A]">
                      {items.map(({ headline, body }, idx) => (
                        <li key={`${key}-${headline}-${idx}`} className=" bg-white/60 px-3 py-2 border border-dashed border-black/50 shadow-inner">
                          <span className="font-semibold text-[#C85A7A]">{headline}</span>
                          {body && <p className="text-xs text-[#B85A6A]/80 mt-0.5">{body}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-[#B85A6A]/60">No insights detected.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="w-full text-center text-xs lg:text-sm font-semibold text-[#B85A6A]/70">
            powered by Gemini AI
          </p>
        </div>
      </div>
    </section>
  );
}
