// frontend/src/app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

import { StarIcon } from "@heroicons/react/24/solid";
import PageContainer from "@/components/PageContainer";
import SiteFooter from "@/components/SiteFooter";
import NewsletterSignup from "@/components/NewsletterSignup";
import { ProductScanner } from "@/components/ProductScanner";
import { EnvironmentAlertPanel } from "@/components/EnvironmentAlertPanel";
import { TRENDING_INGREDIENTS } from "@/constants/ingredients";
import { fetchIngredientSuggestions, type IngredientSuggestion } from "@/lib/api.ingredients";
import {
  getAuthToken,
  getStoredProfile,
  PROFILE_EVENT,
  type StoredProfile,
} from "@/lib/auth-storage";
import { fetchFeedbackHighlights, fetchQuizHistory, type FeedbackHighlight } from "@/lib/api.quiz";
import {
  QUIZ_ANSWERS_STORAGE_KEY,
  QUIZ_SESSION_STORAGE_KEY,
} from "./quiz/_QuizContext";

function QuizCtaButton() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [hasQuizHistory, setHasQuizHistory] = useState(false);

  useEffect(() => {
    const updateProfile = (next?: StoredProfile | null) => {
      setProfile(next ?? getStoredProfile());
    };

    updateProfile();

    const profileListener = (event: Event) => {
      if ("detail" in event) {
        const custom = event as CustomEvent<StoredProfile | null>;
        updateProfile(custom.detail ?? null);
        return;
      }
      updateProfile();
    };

    const storageListener = (event: StorageEvent) => {
      if (event.key === "sm_profile" || event.key === "sm_token") {
        updateProfile();
      }
    };

    window.addEventListener(PROFILE_EVENT, profileListener);
    window.addEventListener("storage", storageListener);
    return () => {
      window.removeEventListener(PROFILE_EVENT, profileListener);
      window.removeEventListener("storage", storageListener);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!profile) {
      setHasQuizHistory(false);
      return () => {
        isCancelled = true;
      };
    }

    const token = getAuthToken();
    if (!token) {
      setHasQuizHistory(false);
      return () => {
        isCancelled = true;
      };
    }

    const loadHistory = async () => {
      try {
        const items = await fetchQuizHistory(token);
        if (!isCancelled) {
          setHasQuizHistory(items.length > 0);
        }
      } catch (error) {
        if (!isCancelled) {
          console.warn("Failed to load quiz history", error);
          setHasQuizHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [profile]);

  const showRetake = Boolean(profile && hasQuizHistory);
  const buttonLabel = showRetake ? "Retake the quiz" : "Find your match";

  const handleClick = useCallback(() => {
    if (!showRetake || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(QUIZ_ANSWERS_STORAGE_KEY);
      window.localStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear stored quiz state before retake", error);
    }
  }, [showRetake]);

  return (
    <Link
      href="/quiz"
      onClick={handleClick}
      className="inline-flex items-center justify-center gap-2 sm:gap-3 rounded-full border-2 border-black bg-white px-4 sm:px-8 py-2 sm:py-4 text-xs sm:text-base font-semibold text-black 
                shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 ease-out hover:-translate-y-px hover:bg-[#ffe9a5] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] 
                active:translate-y-[2px] active:bg-[#ffe2a6] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 w-full sm:w-auto"
    >
      <span className="truncate">{buttonLabel}</span>
      <ArrowRightIcon className="hidden md:block h-4 w-4 sm:h-6 sm:w-6 flex-shrink-0" />
    </Link>
  );
}

type SuccessStory = {
  id?: string;
  name: string;
  initials: string;
  location: string;
  rating: number;
  text: string;
  badge: string;
};

const DEFAULT_SUCCESS_STORIES: SuccessStory[] = [
  {
    id: "default-1",
    name: "Sarah K.",
    initials: "SK",
    location: "Bangkok, Thailand",
    rating: 5,
    text: "Finally found products that work with my sensitive skin! The ingredient insights were exactly what I needed.",
    badge: "Reduced redness by 70%",
  },
  {
    id: "default-2",
    name: "Michael T.",
    initials: "MT",
    location: "Chiang Mai, Thailand",
    rating: 5,
    text: "The AI recommendations matched my skin concerns perfectly. My acne cleared up in just 3 weeks!",
    badge: "Clear skin in 3 weeks",
  },
  {
    id: "default-3",
    name: "Ploy W.",
    initials: "PW",
    location: "Phuket, Thailand",
    rating: 5,
    text: "Love how it considers my budget and pregnancy-safe ingredients. Makes shopping so much easier!",
    badge: "Safe & effective routine",
  },
];

const SUGGESTION_DEBOUNCE_MS = 180;
const SUGGESTION_LIMIT = 8;
const SUGGESTION_LIST_ID = "ingredient-search-suggestions";

const FALLBACK_LOCATION = "SkinMatch community";

const mapHighlightToStory = (highlight: FeedbackHighlight): SuccessStory => ({
  id: highlight.id,
  name: highlight.displayName,
  initials: highlight.initials || highlight.displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SM",
  location: highlight.location ?? FALLBACK_LOCATION,
  rating: highlight.rating ?? 5,
  text: highlight.message,
  badge: highlight.badge ?? "Shared by our community",
});

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
        suggestionAbortRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
        suggestionAbortRef.current = null;
      }
      setSuggestions([]);
      setIsSuggestionLoading(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort();
      suggestionAbortRef.current = null;
    }

    const controller = new AbortController();
    suggestionAbortRef.current = controller;
    setIsSuggestionLoading(true);

    debounceRef.current = window.setTimeout(async () => {
      try {
        const items = await fetchIngredientSuggestions(trimmed, {
          limit: SUGGESTION_LIMIT,
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }
        setSuggestions(items);
        setActiveSuggestionIndex(-1);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.warn("Failed to load ingredient suggestions", error);
        setSuggestions([]);
        setActiveSuggestionIndex(-1);
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggestionLoading(false);
        }
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
        suggestionAbortRef.current = null;
      }
    };
  }, [searchQuery]);

  const getSuggestionLabel = useCallback(
    (item: IngredientSuggestion) => item.commonName || item.inciName || item.key,
    []
  );

  const formatSuggestionMeta = useCallback((count: number) => {
    if (!Number.isFinite(count) || count <= 0) {
      return "";
    }
    return count === 1 ? "1 product" : `${count} products`;
  }, []);

  const closeSuggestions = useCallback(() => {
    setIsInputFocused(false);
    setActiveSuggestionIndex(-1);
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion: IngredientSuggestion) => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
        suggestionAbortRef.current = null;
      }

      const label = getSuggestionLabel(suggestion).trim();
      if (!label) {
        return;
      }

      setSearchQuery(label);
      setSuggestions([]);
      setIsSuggestionLoading(false);
      closeSuggestions();
      router.push(`/ingredients?q=${encodeURIComponent(label)}`);
    },
    [closeSuggestions, getSuggestionLabel, router]
  );

  const handleInputFocus = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsInputFocused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      closeSuggestions();
      blurTimeoutRef.current = null;
    }, 120);
  }, [closeSuggestions]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const hasItems = suggestions.length > 0;
      if (event.key === "ArrowDown") {
        if (!hasItems) {
          return;
        }
        event.preventDefault();
        setActiveSuggestionIndex((prev) => {
          const next = prev + 1;
          if (next >= suggestions.length) {
            return 0;
          }
          return next;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        if (!hasItems) {
          return;
        }
        event.preventDefault();
        setActiveSuggestionIndex((prev) => {
          const next = prev - 1;
          if (next < 0) {
            return suggestions.length - 1;
          }
          return next;
        });
        return;
      }

      if (event.key === "Enter") {
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          event.preventDefault();
          handleSuggestionSelect(suggestions[activeSuggestionIndex]);
        } else {
          closeSuggestions();
        }
        return;
      }

      if (event.key === "Escape") {
        closeSuggestions();
        return;
      }
    },
    [activeSuggestionIndex, closeSuggestions, handleSuggestionSelect, suggestions]
  );

  const shouldShowSuggestions = isInputFocused && searchQuery.trim().length > 0;
  const hasSuggestions = suggestions.length > 0;
  const activeSuggestionId =
    activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length
      ? `${SUGGESTION_LIST_ID}-${activeSuggestionIndex}`
      : undefined;
  const [successStories, setSuccessStories] = useState<SuccessStory[]>(DEFAULT_SUCCESS_STORIES);

  useEffect(() => {
    let cancelled = false;

    const loadFeedback = async () => {
      try {
        const highlights = await fetchFeedbackHighlights(3);
        if (!cancelled && highlights.length) {
          setSuccessStories(highlights.map(mapHighlightToStory));
        }
      } catch (error) {
        console.warn("Failed to load feedback highlights", error);
      }
    };

    loadFeedback();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleIngredientSearch = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        return;
      }
      closeSuggestions();
      router.push(`/ingredients?q=${encodeURIComponent(trimmed)}`);
    },
    [closeSuggestions, router, searchQuery]
  );

  const handleTrendingSelect = useCallback(
    (value: string) => {
      setSearchQuery(value);
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      closeSuggestions();
      router.push(`/ingredients?q=${encodeURIComponent(trimmed)}`);
    },
    [closeSuggestions, router]
  );

  return (
    <main className="min-h-screen bg-[#f8cc8c] text-gray-900">
      <PageContainer className="relative flex flex-col gap-6 sm:gap-12 pt-43 sm:pt-32 pb-8 sm:pb-16">
        {/* Hero Section */}
        <section className="overflow-hidden rounded-[24px] sm:rounded-[32px] border-2 border-black bg-[#FFECC0] shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.35)]">
          {/* Mobile Layout: Mascot left, content right */}
          <div className="flex items-center gap-3 px-4 lg:px-5 py-5 md:hidden">
            <div className="flex-shrink-0">
              <Image
                src="/img/mascot/matchy_match.gif"
                alt="Matchy the SkinMatch mascot giving a friendly wave"
                width={360}
                height={270}
                priority
                className="h-auto w-37"
              />
            </div>
            <div className="flex-1 space-y-2 text-left min-w-0">
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold">
                  SkinMatch
                </h1>
                <p className="hidden md:block text-xs font-semibold text-gray-700">
                  &ldquo;Your skin, Your match, Your best care!&rdquo;
                </p>
              </div>

              <p className="text-xs text-gray-700">
                Build a routine tailored to your skin goals. Explore ingredients,
                track sensitivities, and discover matches that love your skin back.
              </p>

              <div className="flex justify-start pt-1">
                <QuizCtaButton />
              </div>
            </div>
          </div>

          {/* Desktop Layout: Mascot left, content right (same as image) */}
          <div className="hidden md:grid md:grid-cols-[0.95fr_1.05fr] items-center gap-8 px-10 py-10">
            <div className="flex justify-center">
              <Image
                src="/img/mascot/matchy_match.gif"
                alt="Matchy the SkinMatch mascot giving a friendly wave"
                width={360}
                height={270}
                priority
                className="h-auto w-full max-w-xs"
              />
            </div>

            <div className="space-y-6 text-left">
              <div className="space-y-2 lg:space-y-4 lg:pt-3">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-gray-600">
                  Personalized skincare insights
                </p>
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold">
                  SkinMatch
                </h1>
                <p className="text-lg lg:text-xl xl:text-2xl font-semibold text-gray-700">
                  &ldquo;Your skin, Your match, Your best care!&rdquo;
                </p>
              </div>

              <p className="text-base lg:text-lg text-gray-700 max-w-xl">
                Build a routine tailored to your skin goals. Explore ingredients,
                track sensitivities, and discover matches that love your skin back.
              </p>

              <div className="flex justify-start">
                <QuizCtaButton />
              </div>
            </div>
          </div>
        </section>

        {/* Ingredient Search */}
        <section className="rounded-[28px] border-2 border-black bg-[#e8f4e3] p-5 sm:rounded-[28px] sm:bg-gradient-to-br sm:from-[#e4e5ba] sm:to-[#8ec78d] sm:p-8 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[4px_6px_0_rgba(0,0,0,0.15)]">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="sm:hidden space-y-2">
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-8 w-8 text-[#4a6b47]" />
                <h2 className="text-xl font-extrabold text-[#2d4a2b] leading-tight">
                  Ingredient Quick Search
                </h2>
              </div>
              <p className="text-sm text-[#2d4a2b]/70">
                Swipe through trending actives or enter a hero ingredient to see matching formulas.
              </p>
            </div>

            <div className="hidden sm:block lg:text-center space-y-2">
              <div className="flex items-center lg:justify-center gap-2 lg:gap-3">
                <GlobeAltIcon className="h-8 w-8 sm:h-10 sm:w-10 text-[#4a6b47]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#2d4a2b]">Ingredient Quick Search</h2>
              </div>
              <p className="text-sm sm:text-base text-[#2d4a2b]/70">
                Discover what&apos;s inside your favorite products
              </p>
            </div>

            <form onSubmit={handleIngredientSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                placeholder="Search any ingredient (e.g., hyaluronic acid)..."
                aria-label="Search skincare ingredients"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={shouldShowSuggestions}
                aria-controls={SUGGESTION_LIST_ID}
                aria-activedescendant={activeSuggestionId}
                className="w-full rounded-full border-2 border-black bg-white px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-14 text-xs md:text-sm sm:text-base shadow-[0_4px_0_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#2d4a2b]"
              />
              <button
                type="submit"
                className="absolute right-1 lg:right-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-[#4a6b47] p-2 
                          sm:p-2.5 text-white shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[21px]  hover:shadow-[0_4px_0_rgba(0,0,0,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4a2b]"
              >
                <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              {shouldShowSuggestions && (
                <div
                  id={SUGGESTION_LIST_ID}
                  role="listbox"
                  className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-[18px] border-2 border-black bg-white shadow-[0_4px_0_rgba(0,0,0,0.2)] sm:shadow-[0_8px_0_rgba(0,0,0,0.2)]"
                >
                  {isSuggestionLoading && !hasSuggestions ? (
                    <div className="px-4 py-3 text-sm text-[#2d4a2b]/70">Searching…</div>
                  ) : hasSuggestions ? (
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {suggestions.map((item, index) => {
                        const label = getSuggestionLabel(item);
                        const meta = formatSuggestionMeta(item.productCount);
                        const isActive = index === activeSuggestionIndex;
                        const optionId = `${SUGGESTION_LIST_ID}-${index}`;
                        return (
                          <li key={`${item.key}-${index}`}>
                            <button
                              type="button"
                              id={optionId}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSuggestionSelect(item)}
                              onMouseEnter={() => setActiveSuggestionIndex(index)}
                              className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${
                                isActive ? "bg-[#e8f4e3]" : "hover:bg-[#f1f7ec]"
                              } focus:outline-none focus-visible:bg-[#e8f4e3]`}
                              aria-selected={isActive}
                              role="option"
                            >
                              <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-[#4a6b47]" />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-semibold text-[#2d4a2b]">
                                  {label}
                                </span>
                                {item.inciName && item.inciName !== label && (
                                  <span className="truncate text-xs text-[#2d4a2b]/60">
                                    {item.inciName}
                                  </span>
                                )}
                              </div>
                              {meta && (
                                <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-[#2d4a2b]/50">
                                  {meta}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-[#2d4a2b]/60">
                      No matching ingredients yet. Try another keyword.
                    </div>
                  )}
                </div>
              )}
            </form>

          <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible sm:gap-2">
            {TRENDING_INGREDIENTS.map((ingredient) => (
              <button
                key={ingredient.name}
                type="button"
                onClick={() => handleTrendingSelect(ingredient.name)}
                className="flex-none rounded-full border border-black/70 bg-white px-2.5 py-1 text-[10px] font-semibold text-[#4a6b47] shadow-[0_3px_0_rgba(0,0,0,0.15)] transition 
                          hover:-translate-y-0.5 hover:shadow-[0_4px_0_rgba(0,0,0,0.2)] hover:bg-[#ebffd8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4a2b] sm:px-3 sm:py-1.5 sm:text-[11px]"
              >
                {ingredient.name}
              </button>
            ))}
          </div>
          </div>
        </section>

        {/* Product Scanner */}
        <ProductScanner />

        {/* Environment Alerts */}
        <EnvironmentAlertPanel />

        {/* Testimonials */}
        <section className="space-y-4 sm:space-y-6">
          <div className="lg:text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#3C3D37]">Success Stories</h2>
            <p className="text-sm sm:text-base text-[#3C3D37]/70">
              Real results from real SkinMatch users
            </p>
          </div>

          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pt-1 pb-3">
            {successStories.map((story, index) => {
              const ratingValue = Math.max(0, Math.min(5, Math.round(story.rating ?? 5)));
              const key = story.id ?? `${story.name}-${index}`;
              return (
              <article
                key={key}
                className="flex-none w-[260px] sm:w-[398px] rounded-[28px] border-2 border-black bg-gradient-to-br from-white to-[#fef5f5] p-5 sm:p-6 shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:shadow-[6px_8px_0_rgba(0,0,0,0.25)] snap-start overflow-hidden"
              >
                <div className="flex h-full flex-col space-y-3 sm:space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-black bg-gradient-to-br from-[#f8d1d4] to-[#d8949a] text-sm sm:text-base font-bold text-[#5a2a3a]">
                        {story.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-base text-[#3C3D37] truncate">{story.name}</p>
                        <p className="text-[10px] sm:text-xs text-[#3C3D37]/60 truncate">{story.location}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 ml-12 sm:ml-14">
                      {Array.from({ length: ratingValue }).map((_, i) => (
                        <StarIcon key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-[#f59e0b]" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed text-[#3C3D37]/80">
                    &ldquo;{story.text}&rdquo;
                  </p>

                  <div className="mt-auto inline-flex max-w-max items-center gap-2 rounded-full border border-[#4a6b47]/20 bg-[#e8f4e3] px-3 py-1">
                    <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#4a6b47]" />
                    <span className="text-[10px] sm:text-xs font-semibold text-[#4a6b47]">
                      {story.badge}
                    </span>
                  </div>
                </div>
              </article>
            );
            })}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="rounded-[24px] sm:rounded-[28px] border-2 border-black bg-gradient-to-br from-[#B9E5E8] to-[#DFF2EB] p-6 sm:p-8 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <NewsletterSignup
            source="homepage"
            variant="full"
          />
        </section>
      </PageContainer>

      <SiteFooter />
    </main>
  );
}
