"use client";

import { useState } from "react";

import type { IngredientSearchProduct } from "@/lib/api.ingredients";
import ProductCard from "./ProductCard";

const MOBILE_LIMIT = 12;

type MobileProductGridProps = {
  products: IngredientSearchProduct[];
};

export function MobileProductGrid({ products }: MobileProductGridProps) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = products.length > MOBILE_LIMIT;
  const visibleProducts = showAll || !hasMore ? products : products.slice(0, MOBILE_LIMIT);

  return (
    <div className="sm:hidden">
      <div className="grid grid-cols-2 gap-3">
        {visibleProducts.map((product) => (
          <ProductCard key={product.productId} product={product} compact />
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-4 w-full rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_0_rgba(0,0,0,0.25)]"
        >
          {showAll ? "Show less" : `Show more (${products.length - MOBILE_LIMIT} more)`}
        </button>
      ) : null}
    </div>
  );
}
