// frontend/src/app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { GlobeAltIcon, CameraIcon } from "@heroicons/react/24/outline";

import { StarIcon } from "@heroicons/react/24/solid";
import Navbar from "@/components/Navbar";
import PageContainer from "@/components/PageContainer";
import { TRENDING_INGREDIENTS } from "@/constants/ingredients";
import { fetchIngredientSuggestions, type IngredientSuggestion } from "@/lib/api.ingredients";
import {
  getAuthToken,
  getStoredProfile,
  PROFILE_EVENT,
  type StoredProfile,
} from "@/lib/auth-storage";
import { fetchFeedbackHighlights, fetchQuizHistory, type FeedbackHighlight } from "@/lib/api.quiz";
import { deriveInitials } from "@/lib/feedback";
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
  const buttonLabel = showRetake ? "Retake the quiz" : "Find your match now";

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
      className="inline-flex items-center justify-center gap-2 sm:gap-3 rounded-full border-2 border-black bg-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 w-full sm:w-auto"
    >
      <span className="truncate">{buttonLabel}</span>
      <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
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

const mapHighlightToSuccessStory = (highlight: FeedbackHighlight): SuccessStory => {
  const cleanedInitials = highlight.initials?.trim();
  const initials = cleanedInitials ? cleanedInitials.toUpperCase() : deriveInitials(highlight.displayName);
  const clampedRating = (() => {
    if (typeof highlight.rating !== "number") {
      return 5;
    }
    const rounded = Math.round(highlight.rating);
    return Math.min(5, Math.max(1, rounded));
  })();

  return {
    id: highlight.id,
    name: highlight.displayName,
    initials,
    location: highlight.location?.trim() || "SkinMatch community",
    rating: clampedRating,
    text: highlight.message,
    badge: highlight.badge?.trim() || "Community highlight",
  };
};

const SUGGESTION_DEBOUNCE_MS = 180;
const SUGGESTION_LIMIT = 8;
const SUGGESTION_LIST_ID = "ingredient-search-suggestions";

export default function HomePage() {
  const router = useRouter();
  const [successStories, setSuccessStories] = useState<SuccessStory[]>(DEFAULT_SUCCESS_STORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadHighlights = async () => {
      try {
        const highlights = await fetchFeedbackHighlights(6);
        if (isCancelled || highlights.length === 0) {
          return;
        }
        setSuccessStories(highlights.map(mapHighlightToSuccessStory));
      } catch (error) {
        if (!isCancelled) {
          console.warn("Failed to load feedback highlights", error);
        }
      }
    };

    void loadHighlights();

    return () => {
      isCancelled = true;
    };
  }, []);

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
    (event: React.KeyboardEvent<HTMLInputElement>) => {
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

  const handleIngredientSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
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
      <Navbar />
      <PageContainer className="relative flex flex-col gap-8 sm:gap-12 pt-24 sm:pt-32 pb-12 sm:pb-16">
        {/* Hero Section */}
        <section className="overflow-hidden rounded-[24px] sm:rounded-[32px] border-2 border-black bg-[#fff1dd] shadow-[6px_8px_0_rgba(0,0,0,0.35)]">
          <div className="grid items-center gap-6 sm:gap-8 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-[1.05fr_0.95fr]">
            <div className="order-1 space-y-4 sm:space-y-6 text-center md:order-2 md:text-left">
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-gray-600">
                  Personalized skincare insights
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold">
                  SkinMatch
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-700">
                  &ldquo;Your skin, Your match, Your best care!&rdquo;
                </p>
              </div>

              <p className="text-sm sm:text-base md:text-lg text-gray-700 md:max-w-xl mx-auto md:mx-0">
                Build a routine tailored to your skin goals. Explore ingredients,
                track sensitivities, and discover matches that love your skin back.
              </p>

              <div className="flex justify-center md:justify-start">
                <QuizCtaButton />
              </div>
            </div>

            <div className="order-2 flex justify-center md:order-1">
              <Image
                src="/img/mascot/matchy_magnifier.png"
                alt="Matchy the SkinMatch mascot giving a friendly wave"
                width={360}
                height={270}
                priority
                className="h-auto w-full max-w-[200px] sm:max-w-sm"
              />
            </div>
          </div>
        </section>

        {/* Ingredient Search */}
        <section className="rounded-[24px] sm:rounded-[28px] border-2 border-black bg-gradient-to-br from-[#e8f4e3] to-[#d4e9ce] p-6 sm:p-8 shadow-[4px_6px_0_rgba(0,0,0,0.15)]">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <GlobeAltIcon className="h-8 w-8 sm:h-10 sm:w-10 text-[#4a6b47]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#2d4a2b]">Ingredient Quick Search</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4a6b47]/30 bg-[#4a6b47]/10 px-3 py-1">
                <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4 text-[#4a6b47]" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4a6b47]">
                  BETA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#2d4a2b]/70">
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
                className="w-full rounded-full border-2 border-black bg-white px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-14 text-sm sm:text-base shadow-[0_4px_0_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#2d4a2b]"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-[#4a6b47] p-2 sm:p-2.5 text-white shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[2px] hover:shadow-[0_4px_0_rgba(0,0,0,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4a2b]"
              >
                <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              {shouldShowSuggestions && (
                <div
                  id={SUGGESTION_LIST_ID}
                  role="listbox"
                  className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-[18px] border-2 border-black bg-white shadow-[0_8px_0_rgba(0,0,0,0.2)]"
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

            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-xs font-semibold text-[#2d4a2b]/60">Trending:</span>
              {TRENDING_INGREDIENTS.map((ingredient) => (
                <button
                  key={ingredient.name}
                  type="button"
                  onClick={() => handleTrendingSelect(ingredient.name)}
                  className="rounded-full border border-black/20 bg-white px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-[#4a6b47] transition hover:-translate-y-0.5 hover:shadow-[0_3px_0_rgba(0,0,0,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4a2b]"
                >
                  {ingredient.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Product Scanner Teaser */}
        <section className="relative rounded-[24px] sm:rounded-[28px] border-2 border-dashed border-black bg-gradient-to-br from-[#f9e8e8] to-[#f5d4d4] shadow-[4px_6px_0_rgba(0,0,0,0.15)] overflow-visible">
          {/* Mascot Image - positioned absolutely to overflow the box */}
          <div className="absolute -top-4 right-4 sm:-top-6 sm:right-8 md:-top-45 md:-right-8 z-10 pointer-events-none">
  <Image
    src="/img/mascot/matchy_camera.png"
    alt="Matchy with camera"
    width={180}
    height={180}
    className="h-auto w-[100px] sm:w-[140px] md:w-[280px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
  />
</div>

          <div className="relative px-6 py-8 sm:px-10 sm:py-10 pt-20 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <CameraIcon className="h-8 w-8 sm:h-10 sm:w-10 text-[#a85b5b]" />
                  <h2 className="text-xl sm:text-2xl font-bold text-[#6b3e3e]">
                    Instant Product Scanner
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#a85b5b]/30 bg-[#a85b5b]/10 px-3 py-1">
                  <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4 text-[#a85b5b]" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#a85b5b]">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[#6b3e3e]/70 max-w-xl mx-auto">
                  Upload a product photo to analyze ingredients instantly and get personalized safety ratings based on your skin profile.
                </p>
              </div>

              <button
                disabled
                className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[#5a4230] opacity-50 cursor-not-allowed shadow-[0_4px_0_rgba(0,0,0,0.2)]"
              >
                <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                Scan Product (Coming Soon)
              </button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="space-y-4 sm:space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#3C3D37]">Success Stories</h2>
            <p className="text-sm sm:text-base text-[#3C3D37]/70">
              Real results from real SkinMatch users
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {successStories.map((story, index) => {
              const ratingValue = Math.max(0, Math.min(5, Math.round(story.rating ?? 5)));
              const key = story.id ?? `${story.name}-${index}`;
              return (
              <article
                key={key}
                className="rounded-2xl sm:rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#fef5f5] p-5 sm:p-6 shadow-[4px_6px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:shadow-[6px_8px_0_rgba(0,0,0,0.25)]"
              >
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-black bg-gradient-to-br from-[#f8d1d4] to-[#d8949a] text-sm sm:text-base font-bold text-[#5a2a3a]">
                        {story.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-base text-[#3C3D37] truncate">{story.name}</p>
                        <p className="text-[10px] sm:text-xs text-[#3C3D37]/60 truncate">{story.location}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {Array.from({ length: ratingValue }).map((_, i) => (
                        <StarIcon key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-[#f59e0b]" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed text-[#3C3D37]/80">
                    &ldquo;{story.text}&rdquo;
                  </p>

                  <div className="inline-flex items-center gap-2 rounded-full border border-[#4a6b47]/20 bg-[#e8f4e3] px-3 py-1">
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
        <section className="rounded-[24px] sm:rounded-[28px] border-2 border-black bg-gradient-to-br from-[#f0e9f7] to-[#e8d9f0] p-6 sm:p-8 shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <div className="mx-auto max-w-2xl text-center space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#4a3a5a]">
                Get Weekly Skincare Tips
              </h2>
              <p className="text-xs sm:text-sm text-[#4a3a5a]/70">
                Join 10,000+ skincare enthusiasts receiving expert ingredient insights and routine advice
              </p>
            </div>

            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your.email@example.com"
                className="flex-1 rounded-full border-2 border-black bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm shadow-[0_3px_0_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#7c5a8f]"
              />
              <button
                type="submit"
                className="rounded-full border-2 border-black bg-[#7c5a8f] px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)]"
              >
                Subscribe
              </button>
            </form>

            <p className="text-[10px] sm:text-xs text-[#4a3a5a]/60">
              No spam, unsubscribe anytime. We respect your privacy.
            </p>
          </div>
        </section>
      </PageContainer>

      {/* Footer */}
      <footer className="border-t-2 border-black bg-[#3C3D37] text-white">
        <PageContainer className="py-8 sm:py-12">
          <div className="grid gap-6 sm:gap-8 grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1 space-y-3 sm:space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold">SkinMatch</h3>
              <p className="text-xs sm:text-sm text-white/70">
                Your personalized skincare journey starts here. Find products that truly match your skin.
              </p>
            </div>

            {/* Resources */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Resources</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/ingredients" className="text-white/70 hover:text-white transition">
                    Ingredient Glossary
                  </Link>
                </li>
                <li>
                  <Link href="/skin-types" className="text-white/70 hover:text-white transition">
                    Skin Type Guide
                  </Link>
                </li>
                <li>
                  <Link href="/facts" className="text-white/70 hover:text-white transition">
                    Skincare Facts
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-white/70 hover:text-white transition">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Quick Links */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/quiz" className="text-white/70 hover:text-white transition">
                    Take the Quiz
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="text-white/70 hover:text-white transition">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-white/70 hover:text-white transition">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-white/70 hover:text-white transition">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social & Legal */}
            <div className="col-span-2 lg:col-span-1 space-y-3 sm:space-y-4">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Connect</h4>
              <div className="flex gap-2 sm:gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 transition hover:bg-white/20"
                >
                  <span className="sr-only">Facebook</span>
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 transition hover:bg-white/20"
                >
                  <span className="sr-only">Instagram</span>
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 transition hover:bg-white/20"
                >
                  <span className="sr-only">Twitter</span>
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
              <ul className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-white/60">
                <li>
                  <Link href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 border-t border-white/10 pt-6 sm:pt-8 text-center text-[10px] sm:text-xs text-white/60">
            <p>© {new Date().getFullYear()} SkinMatch. All rights reserved.</p>
          </div>
        </PageContainer>
      </footer>
    </main>
  );
}
