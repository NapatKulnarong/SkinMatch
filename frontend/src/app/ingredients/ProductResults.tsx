"use client";

import { useCallback, useRef, useState } from "react";

import type { IngredientSearchProduct } from "@/lib/api.ingredients";
import { fetchProductDetail, type ProductDetail } from "@/lib/api.quiz";

import ProductCard from "./ProductCard";
import { MobileProductGrid } from "./MobileProductGrid";
import ProductDetailModal from "./ProductDetailModal";

const DESKTOP_PRODUCT_LIMIT = 30;

type ProductResultsProps = {
  products: IngredientSearchProduct[];
};

export default function ProductResults({ products }: ProductResultsProps) {
  const [activeProduct, setActiveProduct] = useState<IngredientSearchProduct | null>(null);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailCacheRef = useRef<Record<string, ProductDetail>>({});

  const handleShowDetails = useCallback(async (product: IngredientSearchProduct) => {
    if (!product.productId) {
      return;
    }
    setActiveProduct(product);
    setError(null);

    const cached = detailCacheRef.current[product.productId];
    if (cached) {
      setDetail(cached);
      setLoading(false);
      return;
    }

    setDetail(null);
    setLoading(true);
    try {
      const data = await fetchProductDetail(product.productId);
      detailCacheRef.current[product.productId] = data;
      setDetail(data);
    } catch (err) {
      console.error("Failed to load product details", err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load this product's details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCloseDetails = useCallback(() => {
    setActiveProduct(null);
    setDetail(null);
    setError(null);
    setLoading(false);
  }, []);

  const handleRetry = useCallback(() => {
    if (activeProduct) {
      void handleShowDetails(activeProduct);
    }
  }, [activeProduct, handleShowDetails]);

  return (
    <>
      <MobileProductGrid products={products} onShowDetails={handleShowDetails} />
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
        {products.slice(0, DESKTOP_PRODUCT_LIMIT).map((product) => (
          <ProductCard
            key={product.productId}
            product={product}
            onShowDetails={handleShowDetails}
          />
        ))}
      </div>
      {activeProduct ? (
        <ProductDetailModal
          product={activeProduct}
          detail={detail}
          loading={loading}
          error={error}
          onClose={handleCloseDetails}
          onRetry={handleRetry}
        />
      ) : null}
    </>
  );
}
