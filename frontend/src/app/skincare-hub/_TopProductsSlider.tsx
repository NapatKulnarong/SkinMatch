"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SkincareProductSummaryCard } from "@/components/SkincareProductSummaryCard";
import type { SkincareProductSummary } from "@/lib/api.products";

type TopProductsSliderProps = {
  products: SkincareProductSummary[];
};

const AUTO_SCROLL_INTERVAL = 4500;
const RESET_DELAY = 450;

export function TopProductsSlider({ products }: TopProductsSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isJumping, setIsJumping] = useState(false);

  const loopedProducts = useMemo(() => {
    if (!products.length) return [];
    if (products.length === 1) return products;
    return [...products, ...products];
  }, [products]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [products]);

  useEffect(() => {
    if (products.length <= 1) return;

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotionQuery.matches) return;

    const id = window.setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, AUTO_SCROLL_INTERVAL);

    return () => window.clearInterval(id);
  }, [products.length]);

  useEffect(() => {
    if (!loopedProducts.length) return;
    const container = trackRef.current;
    if (!container) return;
    const children = container.children;
    if (!children.length) return;

    const index = currentIndex % children.length;
    const behavior: ScrollBehavior = isJumping ? "auto" : "smooth";
    const target = children[index] as HTMLElement | null;
    
    if (target) {
      // Use scrollTo on the container instead of scrollIntoView to prevent page scrolling
      // Calculate scroll position relative to container's current scroll position
      const containerScrollLeft = container.scrollLeft;
      const targetOffsetLeft = target.offsetLeft;
      
      container.scrollTo({
        left: targetOffsetLeft,
        behavior,
      });
    }

    let timeoutId: number | null = null;
    let rafId: number | null = null;

    if (!isJumping && products.length > 1 && currentIndex >= products.length) {
      timeoutId = window.setTimeout(() => {
        setIsJumping(true);
        setCurrentIndex((prev) => prev % products.length);
      }, RESET_DELAY);
    } else if (isJumping) {
      rafId = window.requestAnimationFrame(() => setIsJumping(false));
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [currentIndex, isJumping, loopedProducts.length, products.length]);

  if (!loopedProducts.length) {
    return null;
  }

  return (
    <div
      ref={trackRef}
      className="flex snap-x snap-mandatory sm:snap-none items-stretch gap-4 lg:gap-6 overflow-x-auto pb-4 lg:pb-6 ps-1 pe-4 sm:pe-6"
    >
      {loopedProducts.map((product, index) => {
        const isClone = products.length > 1 && index >= products.length;
        return (
          <div
            key={`${product.productId}-${index}`}
            className="flex-none w-[280px] sm:w-[420px] lg:w-[480px] snap-start h-full"
            aria-hidden={isClone ? true : undefined}
          >
            <SkincareProductSummaryCard
              product={product}
              variant="horizontal"
              className="h-full"
            />
          </div>
        );
      })}
    </div>
  );
}
