"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MagnifyingGlassIcon, StarIcon } from "@heroicons/react/24/solid";

import {
  fetchSkincareSuggestions,
  type SkincareProductSummary,
} from "@/lib/api.products";

type SkincareSearchBarProps = {
  placeholder?: string;
  buttonLabel?: string;
  className?: string;
  initialQuery?: string;
  fallbackHref?: (query: string) => string;
  suggestionLabel?: string;
  showHelperHint?: boolean;
  variant?: "default" | "pill";
<<<<<<< HEAD
=======
  buttonBgColor?: string;
>>>>>>> origin/main
};

const SUGGESTION_LIST_ID = "skincare-search-suggestions";
const SUGGESTION_DEBOUNCE_MS = 200;
const DEFAULT_LIMIT = 8;

export function SkincareSearchBar({
  placeholder = "Search by skincare name or brand...",
  buttonLabel = "Search products",
  className = "",
  initialQuery = "",
  fallbackHref = (query) => `/skincare-hub?q=${encodeURIComponent(query)}`,
  suggestionLabel = "Suggestions",
  showHelperHint = true,
  variant = "default",
<<<<<<< HEAD
=======
  buttonBgColor = "#a8c8e8",
>>>>>>> origin/main
}: SkincareSearchBarProps) {
  const isPill = variant === "pill";
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SkincareProductSummary[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  const trimmedQuery = query.trim();

  const resetDebounce = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const resetAbort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const stopBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      resetDebounce();
      resetAbort();
      stopBlurTimeout();
    };
  }, [resetAbort, resetDebounce, stopBlurTimeout]);

  useEffect(() => {
    if (!trimmedQuery) {
      resetDebounce();
      resetAbort();
      setSuggestions([]);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    resetDebounce();
    resetAbort();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    debounceRef.current = window.setTimeout(async () => {
      try {
        const response = await fetchSkincareSuggestions(trimmedQuery, {
          limit: DEFAULT_LIMIT,
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }
        setSuggestions(response.suggestions);
        setActiveIndex(-1);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Failed to load skincare suggestions", error);
          setSuggestions([]);
          setActiveIndex(-1);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      resetDebounce();
      resetAbort();
    };
  }, [resetAbort, resetDebounce, trimmedQuery]);

  const handleSuggestionSelect = useCallback(
    (item: SkincareProductSummary | null) => {
      if (!item) {
        return;
      }
      stopBlurTimeout();
      setSuggestions([]);
      setIsFocused(false);
      setActiveIndex(-1);
      setQuery(item.productName);
      router.push(`/skincare-hub/products/${item.slug}`);
    },
    [router, stopBlurTimeout]
  );

  const resolveSubmitTarget = useCallback((): SkincareProductSummary | null => {
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      return suggestions[activeIndex];
    }
    if (suggestions.length === 1 && suggestions[0].productName.toLowerCase() === trimmedQuery.toLowerCase()) {
      return suggestions[0];
    }
    return suggestions[0] ?? null;
  }, [activeIndex, suggestions, trimmedQuery]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const cleaned = trimmedQuery;
      if (!cleaned) {
        return;
      }
      const match = resolveSubmitTarget();
      if (match) {
        handleSuggestionSelect(match);
        return;
      }
      router.push(fallbackHref(cleaned));
      setIsFocused(false);
      setSuggestions([]);
      setActiveIndex(-1);
    },
    [fallbackHref, handleSuggestionSelect, resolveSubmitTarget, router, trimmedQuery]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!suggestions.length) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next = prev + 1;
          return next >= suggestions.length ? 0 : next;
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? suggestions.length - 1 : next;
        });
      } else if (event.key === "Enter") {
        const match =
          activeIndex >= 0 && activeIndex < suggestions.length
            ? suggestions[activeIndex]
            : null;
        if (match) {
          event.preventDefault();
          handleSuggestionSelect(match);
        }
      } else if (event.key === "Escape") {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    },
    [activeIndex, handleSuggestionSelect, suggestions]
  );

  const showSuggestions = isFocused && trimmedQuery.length > 0;
  const activeId =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? `${SUGGESTION_LIST_ID}-${activeIndex}`
      : undefined;

  const ratingFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    []
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative w-full ${className}`}
      aria-labelledby="skincare-hub-search-label"
    >
      <div
        className={
          isPill
<<<<<<< HEAD
            ? "flex items-center gap-3 rounded-full border-2 border-black bg-white pl-5 pr-3 py-2 shadow-[0_5px_0_rgba(0,0,0,0.25)] focus-within:ring-2 focus-within:ring-[#2d4a2b]"
=======
            ? "flex items-center gap-3 rounded-full border-2 border-black bg-white pl-5 pr-3 py-1 lg:py-2 shadow-[0_5px_0_rgba(0,0,0,0.25)] focus-within:ring-2 focus-within:ring-[#2d4a2b]"
>>>>>>> origin/main
            : "flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 shadow-[0_4px_0_rgba(0,0,0,0.25)] focus-within:ring-2 focus-within:ring-[#2d4a2b]"
        }
      >
        {isPill ? null : <MagnifyingGlassIcon className="h-5 w-5 text-[#2d4a2b]" />}
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            stopBlurTimeout();
            setIsFocused(true);
          }}
          onBlur={() => {
            stopBlurTimeout();
            blurTimeoutRef.current = window.setTimeout(() => {
              setIsFocused(false);
              setActiveIndex(-1);
            }, 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls={SUGGESTION_LIST_ID}
          aria-activedescendant={activeId}
          className={
            isPill
              ? "flex-1 bg-transparent text-sm sm:text-base focus:outline-none placeholder:text-[#1f2d26]/50"
              : "flex-1 bg-transparent text-sm sm:text-base focus:outline-none"
          }
        />
        <button
          type="submit"
<<<<<<< HEAD
          className={
            isPill
              ? "flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#1f2d26] text-white shadow-[0_4px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2d26]"
              : "flex-none rounded-full bg-[#2d4a2b] px-4 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#245322] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2d4a2b]"
=======
          style={isPill ? { backgroundColor: buttonBgColor } : undefined}
          className={
            isPill
              ? "-mr-2 lg:-mr-0 flex sm:h-10 sm:w-10 h-8 w-8 items-center justify-center rounded-full border-2 border-black text-black shadow-[0_4px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2d26]"
              : "flex-none rounded-full bg-[#5a7a9a] px-4 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#4a6a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#5a7a9a]"
>>>>>>> origin/main
          }
        >
          {isPill ? (
            <>
              <span className="sr-only">{buttonLabel}</span>
<<<<<<< HEAD
              <MagnifyingGlassIcon className="h-4 w-4" />
=======
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
>>>>>>> origin/main
            </>
          ) : (
            buttonLabel
          )}
        </button>
      </div>

      {showSuggestions && (
        <div
          className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[0_6px_0_rgba(0,0,0,0.22)]"
          role="listbox"
          id={SUGGESTION_LIST_ID}
        >
          <div className="flex items-center justify-between border-b border-dashed border-black/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2d4a2b]/60">
            <span>{suggestionLabel}</span>
            {isLoading ? <span>Loading…</span> : null}
          </div>
          {suggestions.length ? (
            <ul className="divide-y divide-black/5">
              {suggestions.map((item, index) => {
                const reviewCount = item.reviewCount ?? 0;
                const hasReviews = reviewCount > 0;
                const ratingLabel =
                  hasReviews && typeof item.averageRating === "number"
                    ? ratingFormatter.format(item.averageRating)
                    : null;
                const reviewsText = hasReviews
                  ? reviewCount === 1
                    ? "1 review"
                    : `${reviewCount} reviews`
                  : "No reviews yet";
                const isActive = index === activeIndex;
                return (
                  <li key={item.productId}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect(item)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        isActive ? "bg-[#f3fce6]" : "hover:bg-[#f6f6f6]"
                      }`}
                      role="option"
                      aria-selected={isActive}
                      id={`${SUGGESTION_LIST_ID}-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1f2d26] truncate">
                          {item.brand}{" "}
                          <span className="font-normal text-[#1f2d26]/80">
                            {item.productName}
                          </span>
                        </p>
                        <p className="text-xs text-[#1f2d26]/60 truncate">
                          {item.heroIngredients.slice(0, 2).join(" • ") ||
                            item.categoryLabel ||
                            "Skincare favorite"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end text-xs text-[#1f2d26]/60">
                        {ratingLabel ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#2d4a2b]">
                            <StarIcon className="h-3 w-3 text-[#f59e0b]" />
                            {ratingLabel}
                          </span>
                        ) : null}
                        <span>{reviewsText}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-[#1f2d26]/60">
              {isLoading ? "Finding matches…" : "No matching products yet."}
            </div>
          )}
          <div className="border-t border-dashed border-black/10 bg-[#f8f8f8] px-4 py-2 text-[11px] text-[#1f2d26]/60">
            Press Enter to open the highlighted product or click into the skincare hub to explore all results.
          </div>
        </div>
      )}

      {showHelperHint ? (
        <div className="mt-3 text-[11px] text-[#1f2d26]/60">
          Looking for deeper insights?{" "}
          <Link href="/skincare-hub" className="font-semibold text-[#2d4a2b] underline">
            Visit the Skincare Hub
          </Link>{" "}
          to browse reviews and product spotlights.
        </div>
      ) : null}
    </form>
  );
}
