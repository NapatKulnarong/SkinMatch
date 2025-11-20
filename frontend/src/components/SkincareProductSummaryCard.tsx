import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, StarIcon } from "@heroicons/react/24/solid";

import type { SkincareProductSummary } from "@/lib/api.products";

type CardProps = {
  product: SkincareProductSummary;
  variant?: "default" | "horizontal";
};

const ratingFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const currencyCache = new Map<string, Intl.NumberFormat>();
const getCurrencyFormatter = (currencyCode: string) => {
  const normalized = currencyCode || "USD";
  if (!currencyCache.has(normalized)) {
    currencyCache.set(
      normalized,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: normalized,
      })
    );
  }
  return currencyCache.get(normalized)!;
};

export function SkincareProductSummaryCard({ product, variant = "default" }: CardProps) {
  const ratingLabel =
    typeof product.averageRating === "number"
      ? ratingFormatter.format(product.averageRating)
      : null;
  const reviewsLabel =
    product.reviewCount === 1 ? "1 review" : `${product.reviewCount} reviews`;
  const heroLabel =
    product.heroIngredients.length > 0
      ? product.heroIngredients.slice(0, 3).join(" • ")
      : product.categoryLabel || product.category;
  const hasImage = Boolean(product.imageUrl);
  const priceLabel =
    typeof product.price === "number"
      ? getCurrencyFormatter(product.currency).format(product.price)
      : null;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[22px] border-2 border-black bg-white shadow-[4px_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-1 ${
        variant === "horizontal" ? "sm:flex-row" : ""
      }`}
    >
      <div
        className={`relative flex-shrink-0 ${
          variant === "horizontal" ? "w-full sm:w-48" : "w-full"
        }`}
      >
        {hasImage ? (
          <Image
            src={product.imageUrl!}
            alt={`${product.brand} ${product.productName}`}
            width={400}
            height={400}
            className="h-48 w-full object-cover sm:h-full"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-[#e8f4ff] to-[#ffe9f4] text-center text-xs font-semibold text-[#2d4a2b] sm:h-full">
            {product.brand}
          </div>
        )}
        {ratingLabel ? (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-[#2d4a2b] shadow">
            <StarIcon className="h-4 w-4 text-[#f59e0b]" />
            {ratingLabel}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1f2d26]/60">
            {product.categoryLabel || product.category}
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-[#1f2d26]">
            {product.brand}{" "}
            <span className="font-semibold text-[#1f2d26]/80">{product.productName}</span>
          </h3>
        </div>
        <p className="text-sm text-[#1f2d26]/70">{product.summary || heroLabel}</p>
        <div className="text-xs font-semibold text-[#1f2d26]/60">
          {heroLabel}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#1f2d26]/80">
            {priceLabel ? (
              <>
                Starting at <span className="font-semibold">{priceLabel}</span>
              </>
            ) : (
              "Price varies by retailer"
            )}
            <p className="text-[11px] text-[#1f2d26]/60">{reviewsLabel}</p>
          </div>
          <Link
            href={`/skincare-hub/products/${product.slug}`}
            className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-[#f3fce6] px-3 py-1 text-xs font-semibold text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-white"
          >
            View details
            <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}
