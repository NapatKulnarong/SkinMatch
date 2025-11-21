import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRightIcon, StarIcon } from "@heroicons/react/24/solid";

import type { SkincareProductSummary } from "@/lib/api.products";

type CardProps = {
  product: SkincareProductSummary;
  variant?: "default" | "horizontal";
  className?: string;
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

export function SkincareProductSummaryCard({
  product,
  variant = "default",
  className,
}: CardProps) {
  const isHorizontal = variant === "horizontal";

  const reviewCount = product.reviewCount ?? 0;
  const hasReviews = reviewCount > 0;
  const ratingLabel =
    hasReviews && typeof product.averageRating === "number"
      ? ratingFormatter.format(product.averageRating)
      : null;
  const reviewsLabel = hasReviews
    ? reviewCount === 1
      ? "1 review"
      : `${reviewCount} reviews`
    : "No reviews yet";
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
      className={clsx(
        "flex h-full flex-col overflow-hidden rounded-[22px] border-2 border-black bg-white shadow-[4px_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-1 sm:items-stretch",
        isHorizontal ? "min-h-[300px] sm:flex-row" : "min-h-[420px]",
        className
      )}
    >
      <div
        className={clsx(
          "relative flex-shrink-0 overflow-hidden",
          isHorizontal ? "w-full sm:w-[45%] lg:w-[40%]" : "w-full"
        )}
      >
        {hasImage ? (
          <Image
            src={product.imageUrl!}
            alt={`${product.brand} ${product.productName}`}
            width={400}
            height={400}
            className={clsx("w-full object-cover", isHorizontal ? "h-48 sm:h-full" : "h-48")}
          />
        ) : (
          <div
            className={clsx(
              "flex items-center justify-center bg-gradient-to-br from-[#e8f4ff] to-[#ffe9f4] text-center text-xs font-semibold text-[#2d4a2b]",
              isHorizontal ? "h-48 w-full sm:h-full" : "h-48 w-full"
            )}
          >
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
      <div
        className={clsx(
          "flex flex-1 flex-col gap-3 p-4",
          isHorizontal ? "sm:gap-4 sm:p-5 lg:p-6" : ""
        )}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1f2d26]/60">
            {product.categoryLabel || product.category}
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-[#1f2d26] line-clamp-2">
            {product.brand}{" "}
            <span className="font-semibold text-[#1f2d26]/80">{product.productName}</span>
          </h3>
        </div>
        <p className="text-sm text-[#1f2d26]/70 line-clamp-3">
          {product.summary || heroLabel}
        </p>
        <div className="text-xs font-semibold text-[#1f2d26]/60">{heroLabel}</div>
        <div className="mt-auto flex items-center justify-between gap-4">
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
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#f3fce6] px-4 py-2 text-sm font-semibold text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-white"
          >
            View
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
