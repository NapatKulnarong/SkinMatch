"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { usePathname } from "next/navigation";

import PageContainer from "@/components/PageContainer";
import { fetchPopularTopics, fetchTopicsBySection, fetchRecommendedTopics } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";
import { PROFILE_EVENT, getAuthToken } from "@/lib/auth-storage";
import {
  QUIZ_COMPLETED_EVENT,
  QUIZ_COMPLETED_FLAG_STORAGE_KEY,
  QUIZ_SESSION_STORAGE_KEY,
} from "@/app/quiz/_QuizContext";

type RecommendedForYouProps = {
  sectionId?: string;
};

export default function RecommendedForYou({ sectionId }: RecommendedForYouProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);
  const [needsQuizPrompt, setNeedsQuizPrompt] = useState(false);
  const pathname = usePathname();
  const activeRef = useRef(true);

  const persistQuizCompletion = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(QUIZ_COMPLETED_FLAG_STORAGE_KEY, "1");
      } catch (err) {
        console.warn("Failed to persist quiz completion flag", err);
      }
    }
    setHasCompletedQuiz(true);
    setNeedsQuizPrompt(false);
  }, []);

  const syncQuizCompletionFromStorage = useCallback(() => {
    if (typeof window === "undefined") {
      setHasCompletedQuiz(false);
      return false;
    }
    try {
      const stored = window.localStorage.getItem(QUIZ_COMPLETED_FLAG_STORAGE_KEY);
      const completed = stored === "1";
      setHasCompletedQuiz(completed);
      return completed;
    } catch (err) {
      console.warn("Failed to read quiz completion flag", err);
      setHasCompletedQuiz(false);
      return false;
    }
  }, []);

  const loadRecommendations = useCallback((providedSessionId?: string | null) => {
    activeRef.current = true;
    setLoading(true);
    setError(null);
    setNeedsQuizPrompt(false);

    const loadCuratedFallback = () =>
      Promise.all([fetchTopicsBySection("knowledge", 6), fetchPopularTopics(4)]).then(
        ([knowledge, popular]) => {
          if (!activeRef.current) return;
          const combined = [...knowledge, ...popular].filter(
            (topic, index, arr) => arr.findIndex((t) => t.id === topic.id) === index
          );
          combined.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
          setTopics(combined.slice(0, 4));
          setError(null);
          setNeedsQuizPrompt(false);
          setLoading(false);
        }
      );

    // Determine session_id to use:
    // 1. If provided (from event), use that
    // 2. For anonymous users, get from localStorage
    // 3. For logged-in users, don't pass session_id (backend will get latest automatically)
    const token = getAuthToken();
    const isLoggedIn = Boolean(token);
    
    let sessionId: string | null | undefined = providedSessionId;
    
    // If not provided and user is anonymous, try to get from localStorage
    if (!sessionId && !isLoggedIn && typeof window !== "undefined") {
      try {
        sessionId = window.localStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to read quiz session from localStorage", err);
      }
    }
    
    // For logged-in users, don't pass session_id so backend gets their latest session
    // For anonymous users, pass session_id if available
    const sessionIdToUse = isLoggedIn ? undefined : sessionId;
    
    console.log("[RecommendedForYou] Loading recommendations:", {
      isLoggedIn,
      sessionId,
      sessionIdToUse,
      providedSessionId,
    });
    
    // Try personalized endpoint first; fall back to blended list on failure
    fetchRecommendedTopics(4, sessionIdToUse)
      .then((personalised) => {
        if (!activeRef.current) return;
        if (personalised.length) {
          persistQuizCompletion();
          setTopics(personalised);
          setError(null);
          setLoading(false);
          return;
        }
        if (!hasCompletedQuiz) {
          setTopics([]);
          setNeedsQuizPrompt(true);
          setError(null);
          setLoading(false);
          return;
        }
        return loadCuratedFallback();
      })
      .catch(() => {
        if (!activeRef.current) return;
        loadCuratedFallback()
          .catch((err) => {
            if (!activeRef.current) return;
            console.error("Failed to load recommended topics", err);
            setError("We couldn't load recommended topics right now. Please try again later.");
            setTopics([]);
            setNeedsQuizPrompt(false);
            setLoading(false);
          });
      });
  }, [hasCompletedQuiz, persistQuizCompletion]);

  useEffect(() => {
    syncQuizCompletionFromStorage();
  }, [syncQuizCompletionFromStorage]);

  // Load recommendations on mount and when pathname changes (user navigates back from quiz)
  useEffect(() => {
    loadRecommendations();
    
    return () => {
      activeRef.current = false;
    };
  }, [loadRecommendations, pathname]);

  // Listen for profile updates and quiz completion to refresh recommendations
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Refresh recommendations when profile is updated (e.g., after quiz completion for logged-in users)
      loadRecommendations();
    };

    const handleQuizCompleted = (event: Event) => {
      // Refresh recommendations when quiz is completed (works for both logged-in and anonymous users)
      // Extract session_id from event detail if available (for anonymous users)
      let sessionId: string | null | undefined = undefined;
      if ("detail" in event) {
        const customEvent = event as CustomEvent<{ sessionId?: string }>;
        sessionId = customEvent.detail?.sessionId;
        console.log("[RecommendedForYou] Quiz completed event received, sessionId:", sessionId);
      } else {
        console.log("[RecommendedForYou] Quiz completed event received without detail");
      }
      persistQuizCompletion();
      loadRecommendations(sessionId);
    };

    const handleStorageUpdate = (event: StorageEvent) => {
      // Refresh when profile or token changes in localStorage
      if (event.key === "sm_profile" || event.key === "sm_token") {
        loadRecommendations();
      }
      if (event.key === QUIZ_COMPLETED_FLAG_STORAGE_KEY) {
        const completed = event.newValue === "1";
        setHasCompletedQuiz(Boolean(completed));
        if (completed) {
          setNeedsQuizPrompt(false);
        }
      }
    };

    window.addEventListener(PROFILE_EVENT, handleProfileUpdate);
    window.addEventListener(QUIZ_COMPLETED_EVENT, handleQuizCompleted);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener(PROFILE_EVENT, handleProfileUpdate);
      window.removeEventListener(QUIZ_COMPLETED_EVENT, handleQuizCompleted);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [loadRecommendations, persistQuizCompletion]);

  const recommendations = useMemo(() => topics, [topics]);

  return (
    <PageContainer as="section" id={sectionId} className="lg:pt-3">
      <div className="rounded-[22px] lg:rounded-[32px] border-2 border-black bg-gradient-to-br from-[#FFF1CA] via-[#F9D689] to-[#FFF1CA] shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[10px_12px_0_rgba(0,0,0,0.18)]">
        <div className="relative flex flex-col gap-4 border-b border-black/10 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8 sm:pb-5">
          <div>
            <p className="hidden sm:block text-xs font-semibold uppercase tracking-[0.32em] text-[#11224a]/60">
              Tailored insights
            </p>
            <h2 className="lg:mt-2 flex items-center gap-2 text-xl lg:text-3xl font-extrabold text-[#11224a]">
              <SparklesIcon className="hidden sm:block h-6 w-6 text-[#B6771D]" aria-hidden />
              Recommended for your routine
            </h2>
            <p className="mt-2 text-sm text-[#11224a]/70 sm:text-base">
              Curated from your most-viewed concerns and the community&apos;s current favourites.
            </p>
          </div>
          <Link
            href="/quiz"
            className="order-last inline-flex w-fit items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 text-sm font-semibold text-[#2d4a2b] shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 sm:order-none sm:absolute sm:right-6 sm:top-8 sm:w-auto sm:justify-start sm:px-6"
          >
            Update preferences
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Quiz prompt - reduced padding for compact look */}
        {needsQuizPrompt && (
          <div className="px-6 py-10 text-sm text-[#11224a]/70">
            <div className="mx-auto max-w-xl rounded-[18px] border-2 border-[#11224a]/20 bg-white/80 p-5 text-center shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
              <p className="text-base font-semibold text-[#11224a]">Take the SkinMatch quiz</p>
              <p className="mt-2 text-sm text-[#11224a]/80">
                Update your preferences to unlock personalised ingredients, routines, and insights curated just for you.
              </p>
            </div>
          </div>
        )}

        <div className="px-3 lg:px-3 pb-1 lg:pb-5 pt-4 sm:px-6">
          <div className="flex snap-x snap-mandatory gap-3 lg:gap-4 overflow-x-auto pb-4 sm:grid sm:auto-rows-[1fr] sm:grid-cols-2 sm:gap-4 sm:overflow-visible xl:grid-cols-4">
          {loading && !recommendations.length
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-44 min-w-[240px] rounded-[24px] border-2 border-black bg-white/70 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[4px_6px_0_rgba(0,0,0,0.18)] animate-pulse sm:min-w-0"
                />
              ))
            : recommendations.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/facts/${topic.slug}`}
                  className="group flex h-full min-h-[190px] lg:min-h-[245px] min-w-[250px] flex-col gap-3 rounded-[5px] border-2 border-black bg-white px-3 lg:px-4 py-2 lg:py-5 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[5px_6px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 sm:min-w-0"
                >
                  <span className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#11224a]/60">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#11224a] bg-[#FFF1CA] text-sm font-bold">
                      {topic.title.slice(0, 1)}
                    </span>
                    Match insight
                  </span>
                  <h3 className="lg:text-lg font-bold text-[#11224a] group-hover:text-[#0a1737]">
                    {topic.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#11224a]/70 line-clamp-3">
                    {topic.subtitle || topic.excerpt || "Tap to see why this ingredient belongs in your lineup."}
                  </p>
                  <div className="relative mt-auto flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#11224a]/50">
                    {/* Hide on mobile */}
                    <span className="hidden sm:inline">
                      {new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads
                    </span>

                    {/* "View guide" button pinned bottom-right on mobile */}
                    <span
                      className="
                        absolute bottom-2 right-2 
                        sm:static 
                        inline-flex items-center gap-1 
                        text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.25em] 
                        text-[#11224a] transition hover:-translate-y-[1px]
                        
                        /* Mobile (default): show oval button */
                        rounded-full border border-[#11224a] bg-[#FAEAB1] px-4 py-1.5 
                        
                        /* Hide oval on sm and up */
                        sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0
                      "
                    >
                      Read
                      <span aria-hidden className="hidden sm:inline">
                        ↗
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* Error message only */}
        {!loading && !recommendations.length && !needsQuizPrompt && error && (
          <div className="px-6 py-6 text-sm text-[#11224a]/70">
            <div className="rounded-[16px] border-2 border-[#B6771D]/30 bg-[#FFF1CA]/60 p-4 text-center">
              <p className="font-semibold text-[#11224a]">{error}</p>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
