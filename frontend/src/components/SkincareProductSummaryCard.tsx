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

<<<<<<< HEAD
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
=======
  const productUrl = `/skincare-hub/products/${product.slug}`;

  const cardClassName = clsx(
    "mt-1 flex overflow-hidden rounded-[22px] border-2 border-black bg-white shadow-[4px_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-1",
    "min-h-[280px] flex-col",    // Mobile layout - reduced height
    "sm:h-[420px]",             // Small screen height
    "sm:min-h-[240px] sm:flex-row", // Horizontal layout for small screens and up
    "md:h-[220px]",             // Medium screen height - fixed height
    "lg:min-h-[280px]",         // Large screen height
    className
  );

  const cardContent = (
    <>
      <div
        className={clsx(
          "relative flex-shrink-0 overflow-hidden",
          // MOBILE: full width image
          "w-full",
          // DESKTOP: reduced width, full height
          isHorizontal ? "sm:w-[38%] md:w-[35%] lg:w-[35%] sm:h-full" : "sm:w-full"
>>>>>>> origin/main
        )}
      >
        {hasImage ? (
          <Image
            src={product.imageUrl!}
            alt={`${product.brand} ${product.productName}`}
            width={400}
            height={400}
<<<<<<< HEAD
            className={clsx("w-full object-cover", isHorizontal ? "h-48 sm:h-full" : "h-48")}
=======
            className={clsx("w-full object-cover", isHorizontal ? "h-44 sm:h-full" : "h-40 sm:h-48")}
>>>>>>> origin/main
          />
        ) : (
          <div
            className={clsx(
              "flex items-center justify-center bg-gradient-to-br from-[#e8f4ff] to-[#ffe9f4] text-center text-xs font-semibold text-[#2d4a2b]",
<<<<<<< HEAD
              isHorizontal ? "h-48 w-full sm:h-full" : "h-48 w-full"
=======
              // MOBILE
              "h-40 w-full sm:h-48",
              // DESKTOP: full height for horizontal layout
              isHorizontal ? "sm:h-full sm:w-full" : ""
>>>>>>> origin/main
            )}
          >
            {product.brand}
          </div>
        )}
        {ratingLabel ? (
<<<<<<< HEAD
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-[#2d4a2b] shadow">
=======
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-[#2d4a2b] shadow-md">
>>>>>>> origin/main
            <StarIcon className="h-4 w-4 text-[#f59e0b]" />
            {ratingLabel}
          </div>
        ) : null}
      </div>
<<<<<<< HEAD
      <div
        className={clsx(
          "flex flex-1 flex-col gap-3 p-4",
          isHorizontal ? "sm:gap-4 sm:p-5 lg:p-6" : ""
        )}
      >
        <div>
=======
      
      <div
        className={clsx(
          "flex flex-1 flex-col",
          // MOBILE: entire section with blue background, rounded bottom corners
          "gap-2 rounded-b-[22px] bg-[#e8f4ff] -mx-1 -mb-0 px-4 pt-4 pb-3",
          // DESKTOP: original unchanged
          isHorizontal ? "sm:gap-4 sm:p-5 sm:bg-white sm:rounded-none sm:mx-0 sm:mb-0 md:gap-2 md:p-4 lg:p-6 lg:gap-4" : "sm:gap-3 sm:p-4 sm:bg-white sm:rounded-none sm:mx-0 sm:mb-0"
        )}
      >
        {/* MOBILE: Simplified header | DESKTOP: Original */}
        <div className="sm:hidden">
          <h3 className="text-sm font-extrabold leading-snug text-[#1f2d26] line-clamp-2">
            {product.brand}{" "}
            <span className="font-semibold text-[#1f2d26]/80">{product.productName}</span>
          </h3>
        </div>
        
        {/* DESKTOP ONLY: Original header */}
        <div className="hidden sm:block">
>>>>>>> origin/main
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1f2d26]/60">
            {product.categoryLabel || product.category}
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-[#1f2d26] line-clamp-2">
            {product.brand}{" "}
            <span className="font-semibold text-[#1f2d26]/80">{product.productName}</span>
          </h3>
        </div>
<<<<<<< HEAD
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
=======

        {/* DESKTOP ONLY: Original content sections */}
        <p className="hidden sm:block text-sm text-[#1f2d26]/70 line-clamp-2 leading-snug mb-1 min-h-[2.5rem] md:mb-0.5">
          {product.summary || heroLabel}
        </p>
        <div className="hidden sm:block text-xs font-semibold text-[#1f2d26]/60 mb-2 md:mb-1">{heroLabel}</div>

        {/* MOBILE: Price */}
        <div className="mt-auto flex flex-col gap-0.5 sm:hidden border-t border-[#1f2d26]/20 pt-3">
          {priceLabel ? (
            <div className="text-sm font-bold text-[#1f2d26]">{priceLabel}</div>
          ) : (
            <div className="text-xs text-[#1f2d26]/80">Price varies by retailer</div>
          )}
        </div>

        {/* DESKTOP ONLY: Original footer */}
        <div className="mt-auto hidden sm:flex items-center justify-between gap-4">
          <div className="text-sm text-[#1f2d26]/80">
            {priceLabel ? (
              <span className="font-semibold">{priceLabel}</span>
>>>>>>> origin/main
            ) : (
              "Price varies by retailer"
            )}
            <p className="text-[11px] text-[#1f2d26]/60">{reviewsLabel}</p>
          </div>
          <Link
<<<<<<< HEAD
            href={`/skincare-hub/products/${product.slug}`}
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#f3fce6] px-4 py-2 text-sm font-semibold text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-white"
=======
            href={productUrl}
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#e8f4ff] px-4 py-2 text-sm font-semibold text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-white"
>>>>>>> origin/main
          >
            View
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
<<<<<<< HEAD
    </article>
=======
    </>
  );

  // On mobile: entire card is clickable (no View button)
  // On desktop: card is not clickable, only View button is
  return (
    <>
      {/* Mobile: Link wrapper */}
      <Link href={productUrl} className={clsx(cardClassName, "sm:hidden")}>
        {cardContent}
      </Link>
      {/* Desktop: Article with View button */}
      <article className={clsx(cardClassName, "hidden sm:flex")}>
        {cardContent}
      </article>
    </>
>>>>>>> origin/main
  );
}
