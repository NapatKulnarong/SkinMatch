"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";

import type { IngredientSearchProduct } from "@/lib/api.ingredients";
import type { ProductDetail } from "@/lib/api.quiz";

type ProductDetailModalProps = {
  product: IngredientSearchProduct;
  detail: ProductDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
};

export default function ProductDetailModal({
  product,
  detail,
  loading,
  error,
  onClose,
  onRetry,
}: ProductDetailModalProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const previous = typeof document !== "undefined" ? document.body.style.overflow : "";
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = previous;
      }
    };
  }, []);

  const imageUrl = detail?.imageUrl ?? product.imageUrl ?? product.image ?? null;
  const brand = detail?.brand ?? product.brand;
  const name = detail?.productName ?? product.productName;
  const categoryLabel = detail?.categoryLabel ?? capitalizeLabel(detail?.category ?? product.category);
  const priceLabel = formatPriceLabel(
    detail?.price ?? product.price,
    detail?.currency ?? product.currency
  );
  const rating =
    typeof (detail?.averageRating ?? product.averageRating) === "number"
      ? detail?.averageRating ?? product.averageRating
      : null;
  const reviewCount = detail?.reviewCount ?? product.reviewCount ?? 0;
  const heroIngredients = useMemo(() => {
    if (detail?.heroIngredients?.length) {
      return detail.heroIngredients;
    }
    if (product.heroIngredients) {
      return product.heroIngredients
        .split(/[,•]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }, [detail?.heroIngredients, product.heroIngredients]);
  const ingredientDetails = detail?.ingredients ?? [];
  const ingredientPreview = ingredientDetails.slice(0, 8);
  const concerns = detail?.concerns ?? [];
  const skinTypes = detail?.skinTypes ?? [];
  const restrictions = detail?.restrictions ?? [];
  const affiliateUrl = detail?.affiliateUrl ?? detail?.productUrl ?? product.productUrl ?? null;
  const summary = detail?.summary ?? product.summary ?? null;
  const description = detail?.description ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${brand} ${name}`}
        className="relative flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border-2 border-black bg-white shadow-[8px_10px_0_rgba(0,0,0,0.25)]"
      >
        <div className="flex-1 overflow-y-auto">
          <div className="grid min-h-full gap-5 px-5 pb-6 pt-8 md:grid-cols-[220px,1fr] md:pt-8">
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.18)] 
                            transition hover:-translate-y-0.5 hover:bg-[#f7f7f7] hover:shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                  aria-label="Close product details"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative overflow-hidden rounded-2xl border-2 border-black/10 bg-[#f7f7f7] pb-[85%]">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={`${brand} ${name}`}
                    fill
                    unoptimized
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 60vw, 220px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-xs font-semibold text-[#7a628c]">
                    Image coming soon
                  </div>
                )}
              </div>

              {affiliateUrl && (
                <a
                  href={affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#B9375D] px-4 py-2 text-sm 
                            font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a72f52] 
                            hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)]"
                >
                  Shop product
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M12.293 2.293a1 1 0 011.414 0l4 4A1 1 0 0117 8h-3v7a1 1 0 11-2 0V7a1 1 0 011-1h2.586L12.293 3.707a1 1 0 010-1.414z" />
                    <path d="M5 4a3 3 0 00-3 3v7a3 3 0 003 3h7a3 3 0 003-3v-1a1 1 0 112 0v1a5 5 0 01-5 5H5a5 5 0 01-5-5V7a5 5 0 015-5h1a1 1 0 110 2H5z" />
                  </svg>
                </a>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B9375D]">{brand}</p>
                <h2 className="text-2xl font-extrabold leading-tight text-[#1f2d26]">{name}</h2>
                <p className="text-sm font-semibold text-[#3C3D37] text-opacity-70">{categoryLabel}</p>
                {(rating || priceLabel) && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#1f2d26]">
                    {rating ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-black/20 bg-[#fff3c4] px-3 py-1 font-semibold">
                        <svg className="h-4 w-4 text-[#f59e0b]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 8.72c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {rating.toFixed(1)}
                        <span className="text-xs text-[#3C3D37] text-opacity-60">({reviewCount ?? 0})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#3C3D37] text-opacity-60">No reviews yet</span>
                    )}
                    {priceLabel && (
                      <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-[#1f2d26]">
                        {priceLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {summary ? (
                <p className="text-sm leading-relaxed text-[#3C3D37] text-opacity-80">{summary}</p>
              ) : null}

              {description ? (
                <div className="rounded-2xl border border-[#d7d7d7] bg-[#fafafa] p-4 text-sm leading-relaxed text-[#3C3D37]">
                  {description}
                </div>
              ) : null}

              {heroIngredients.length ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1f2d26] uppercase tracking-[0.12em]">
                    Hero ingredients
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {heroIngredients.map((ingredient) => (
                      <span
                        key={ingredient}
                        className="inline-flex items-center rounded-full border border-black/10 bg-[#fce8ef] px-3 py-1 text-xs font-semibold text-[#B9375D]"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {ingredientPreview.length ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1f2d26] uppercase tracking-[0.12em]">
                    Ingredient highlights
                  </h3>
                  <ul className="mt-3 grid gap-2 text-sm text-[#3C3D37] text-opacity-80 sm:grid-cols-2">
                    {ingredientPreview.map((ingredient, index) => (
                      <li key={`${ingredient.name}-${ingredient.order ?? index}`} className="flex items-start gap-2">
                        <span
                          className={`mt-1 inline-flex h-2 w-2 rounded-full ${
                            ingredient.highlight ? "bg-[#B9375D]" : "bg-[#3C3D37]/40"
                          }`}
                          aria-hidden
                        />
                        <div>
                          <p className="font-semibold text-[#1f2d26]">{ingredient.name}</p>
                          {ingredient.inciName && (
                            <p className="text-xs uppercase tracking-[0.12em] text-[#3C3D37] text-opacity-50">
                              {ingredient.inciName}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(concerns.length || skinTypes.length || restrictions.length) && (
                <div className="space-y-3">
                  {concerns.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">Targets</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {concerns.map((concern) => (
                          <span
                            key={concern}
                            className="rounded-full border border-black/10 bg-[#e6f5f0] px-3 py-1 font-semibold text-[#1f2d26]"
                          >
                            {concern}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {skinTypes.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">
                        Skin type fit
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {skinTypes.map((skinType) => (
                          <span
                            key={skinType}
                            className="rounded-full border border-black/10 bg-[#fff3c4] px-3 py-1 font-semibold text-[#1f2d26]"
                          >
                            {capitalizeLabel(skinType)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {restrictions.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">
                        Preferences met
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {restrictions.map((restriction) => (
                          <span
                            key={restriction}
                            className="rounded-full border border-black/10 bg-[#e8e5ff] px-3 py-1 font-semibold text-[#33308a]"
                          >
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {error ? (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="shrink-0 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {loading && !detail ? (
                <p className="text-xs font-semibold text-[#3C3D37] text-opacity-60">
                  Fetching product details…
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPriceLabel(price: number | null, currency?: string) {
  if (typeof price !== "number") return null;
  if (!currency || price <= 0) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return null;
  }
}

function capitalizeLabel(text?: string | null) {
  if (!text) return "";
  return text
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
