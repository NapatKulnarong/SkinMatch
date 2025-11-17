"use client";

import Image from "next/image";
import Link from "next/link";
import { StarIcon } from "@heroicons/react/24/solid";

import type { IngredientSearchProduct } from "@/lib/api.ingredients";

const FALLBACK_PRODUCT_MESSAGE = "Preview coming soon";

const toTitleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatPrice = (price: number | null, currency: string) => {
  if (price === null) {
    return null;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(0)}`;
  }
};

export type ProductCardProps = {
  product: IngredientSearchProduct;
  compact?: boolean;
  onShowDetails?: (product: IngredientSearchProduct) => void;
};

export function ProductCard({ product, compact = false, onShowDetails }: ProductCardProps) {
  const imageSrc = product.imageUrl ?? product.image ?? null;
  const priceLabel = formatPrice(product.price, product.currency);
  const ratingLabel =
    product.averageRating !== null ? `${product.averageRating.toFixed(1)} / 5` : null;
  const categoryLabel = toTitleCase(product.category);
  const detailButtonClasses = compact
    ? "inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-2.5 py-1 text-[9px] font-bold text-[#1f2d26] shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#f5f4ff] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
    : "inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-3 py-1.5 text-[10px] font-bold text-[#1f2d26] shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#f5f4ff] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]";
  const shopButtonClasses = compact
    ? "inline-flex items-center justify-center rounded-full border-2 border-black bg-[#f97316] px-2.5 py-1 text-[9px] font-bold text-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ea580c] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
    : "inline-flex items-center justify-center rounded-full border-2 border-black bg-[#f97316] px-3 py-1.5 text-[10px] font-bold text-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ea580c] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]";

  return (
    <article
      className={
        compact
          ? "flex h-full flex-col rounded-2xl border border-black/30 bg-white p-3"
          : "flex h-full min-h-[470px] sm:min-h-0 flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_5px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:shadow-[4px_6px_0_rgba(0,0,0,0.25)]"
      }
    >
      {imageSrc ? (
        <div
          className={`relative w-full overflow-hidden rounded-xl bg-[#f5f5f5] ${
            compact ? "aspect-[4/5]" : "aspect-square"
          }`}
        >
          <Image
            src={imageSrc}
            alt={`${product.brand} ${product.productName}`}
            fill
            unoptimized
            className="object-cover object-center"
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 45vw, 320px"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-[#3f6b3a]/30 bg-[#f5f9ef] px-4 text-center text-[11px] font-semibold text-[#3f6b3a]">
          {FALLBACK_PRODUCT_MESSAGE}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 text-[#1f2d26]">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3f6b3a]">
          {product.brand}
        </p>
        <h3
          className={`font-extrabold leading-tight ${compact ? "text-[13px]" : "text-base"} line-clamp-2 min-h-[44px]`}
        >
          {product.productName}
        </h3>
        <div className="pb-2 sm:pb-0 flex items-center gap-2 text-[11px] font-semibold text-[#1f2d26]/60">
          <span className="truncate">{categoryLabel}</span>
          <span className="ml-auto inline-flex items-center gap-2">
            {product.ingredientHighlight ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#f59e0b]/30 bg-[#fff7e6] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
                Hero ingredient
              </span>
            ) : null}
            {priceLabel ? (
              <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-black/15 bg-[#e9f7e3] px-2 py-0.5 text-[10px] font-semibold text-[#2e4b2c]">
                {priceLabel}
              </span>
            ) : null}
          </span>
        </div>

        {product.heroIngredients ? (
          <div className="hidden sm:block text-[11px] text-[#1f2d26]/70">
            <div className="sm:pb-2 mt-1 flex flex-wrap justify-end gap-2">
              {product.heroIngredients.split(/[,•]/).map((item) => {
                const trimmed = item.replace(/\s+/g, " ").trim();
                if (!trimmed) return null;
                return (
                  <span
                    key={trimmed}
                    className="inline-flex items-center rounded-full border border-[#6fb0d4]/40 bg-[#e5f2fb] px-3 py-0.5 text-[10px] font-semibold text-[#1f2d26]"
                  >
                    {trimmed}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <footer
        className={`mt-auto flex flex-col gap-2 border-t border-dashed border-[#1f2d26]/15 ${
          compact ? "pt-2 text-[10px]" : "pt-3 text-[11px]"
        } text-[#1f2d26]/70`}
      >
        <div className="flex items-center justify-between gap-2">
          {ratingLabel ? (
            <span className="inline-flex items-center gap-1">
              <StarIcon className="h-4 w-4 text-[#fbbf24]" />
              {ratingLabel}
              {product.reviewCount ? (
                <span className="text-[10px] text-[#1f2d26]/50">
                  ({product.reviewCount} reviews)
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-[10px] text-[#1f2d26]/50">Rating coming soon</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          {onShowDetails ? (
            <button
              type="button"
              onClick={() => onShowDetails(product)}
              className={detailButtonClasses}
            >
              Details
            </button>
          ) : (
            <span className="text-[10px] text-[#1f2d26]/40">Details unavailable</span>
          )}
          {product.productUrl ? (
            <Link
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={shopButtonClasses}
            >
              Shopee
            </Link>
          ) : (
            <span className="text-[10px] text-[#1f2d26]/40">No shop link</span>
          )}
        </div>
      </footer>
    </article>
  );
}

export default ProductCard;
