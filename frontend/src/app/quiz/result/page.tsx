// src/app/quiz/result/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavWidth } from "@/components/NavWidthContext";
import type { ProductDetail, QuizProfile, QuizRecommendation, QuizResultSummary } from "@/lib/api.quiz";
import { emailQuizSummary, fetchProductDetail, submitQuizFeedback } from "@/lib/api.quiz";
import { getStoredProfile, getAuthToken } from "@/lib/auth-storage";
import { buildFeedbackMetadata } from "@/lib/feedback";
import { buildGuidance } from "./_guidance";
import { useQuiz } from "../_QuizContext";
import type { QuizAnswer, QuizAnswerKey } from "../_QuizContext";

const MATCH_INGREDIENT_REASON =
  "Frequently appears across the product matches prioritised for your skin profile.";

export default function QuizResultPage() {
  const router = useRouter();
  const { answers, resetQuiz, isComplete, result, finalize, error } = useQuiz();
  const navWidth = useNavWidth();

  const hasPrimary = Boolean(answers.primaryConcern?.label);

  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [anonymizeFeedback, setAnonymizeFeedback] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [activeRecommendation, setActiveRecommendation] = useState<QuizRecommendation | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [productDetailError, setProductDetailError] = useState<string | null>(null);
  const detailCacheRef = useRef<Record<string, ProductDetail>>({});
  const currentDetailRequestRef = useRef<string | null>(null);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isComplete && hasPrimary && !result) {
      finalize().catch(() => null);
    }
  }, [finalize, hasPrimary, isComplete, result]);

  useEffect(() => {
    const loadWishlist = async () => {
      const token = getAuthToken();
      if (!token) return;
      try {
        const { fetchWishlist } = await import("@/lib/api.wishlist");
        const items = await fetchWishlist(token);
        setWishlistedIds(new Set(items.map(item => item.id)));
      } catch (err) {
        console.error("Failed to load wishlist", err);
      }
    };
    loadWishlist();
  }, []);

  const sectionMaxWidth = navWidth ? `${navWidth}px` : "1200px";
  const fallbackWidth = navWidth ? `${navWidth}px` : "720px";

  const answerLabels = useMemo(() => answersToLabels(answers), [answers]);
  const guidance = useMemo(() => buildGuidance(answerLabels), [answerLabels]);

  const ingredientHighlights = useMemo(() => {
    const highlights = new Map<string, { ingredient: string; reason: string }>();

    const pushHighlight = (ingredient: string, reason: string | undefined) => {
      const name = ingredient?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const normalizedReason = reason?.trim() ?? "";
      const existing = highlights.get(key);

      if (existing) {
        if (
          normalizedReason &&
          normalizedReason !== MATCH_INGREDIENT_REASON &&
          (existing.reason === MATCH_INGREDIENT_REASON || !existing.reason.trim())
        ) {
          highlights.set(key, { ingredient: existing.ingredient, reason: normalizedReason });
        }
        return;
      }

      highlights.set(key, {
        ingredient: name,
        reason: normalizedReason || MATCH_INGREDIENT_REASON,
      });
    };

    (result?.summary?.ingredientsToPrioritize ?? []).forEach((entry) => {
      pushHighlight(entry.name, entry.reason);
    });

    const topIngredients = result?.summary?.topIngredients ?? [];
    topIngredients.forEach((ingredient) => pushHighlight(ingredient, undefined));

    guidance.lookFor.forEach((item) => {
      pushHighlight(item.ingredient, item.reason);
    });

    return Array.from(highlights.values()).slice(0, 6);
  }, [
    guidance.lookFor,
    result?.summary?.ingredientsToPrioritize,
    result?.summary?.topIngredients,
  ]);

  const fallbackStrategyNotes = useMemo(() => {
    const insights = [...guidance.insights];
    const summaryInsights = buildSummaryInsights(result?.summary);
    summaryInsights.forEach((note) => {
      if (!insights.includes(note)) {
        insights.push(note);
      }
    });
    return insights;
  }, [guidance.insights, result?.summary]);

  const aiStrategyNotes = result?.strategyNotes ?? [];
  const strategyNotes = aiStrategyNotes.length ? aiStrategyNotes : fallbackStrategyNotes;

  const profileItems = useMemo(() => {
    return buildProfileItems(result?.profile ?? null, answerLabels);
  }, [answerLabels, result?.profile]);

  const recommendations = result?.recommendations ?? [];
  const requiresAuth = Boolean(result?.requiresAuth);

  useEffect(() => {
    setEmailStatus("idle");
    setEmailMessage(null);
    setEmailInput("");
  }, [result?.sessionId]);

  const handleEmailSummary = useCallback(async () => {
    if (!result?.sessionId) {
      setEmailStatus("error");
      setEmailMessage("We couldn't find this quiz session. Please refresh and try again.");
      return;
    }

    setEmailStatus("sending");
    setEmailMessage(null);
    try {
      const emailValue = emailInput.trim();
      await emailQuizSummary(result.sessionId, emailValue || undefined);
      setEmailStatus("success");
      setEmailMessage(emailValue ? `Summary sent to ${emailValue}.` : "Summary sent to your account email.");
    } catch (err) {
      setEmailStatus("error");
      const message = err instanceof Error ? err.message : "Failed to email this summary. Please try again.";
      setEmailMessage(message);
    }
  }, [emailInput, result?.sessionId]);

  const handleShowProductDetails = useCallback(
    async (item: QuizRecommendation) => {
      if (!item?.productId) {
        return;
      }

      setActiveRecommendation(item);
      setProductDetailError(null);
      currentDetailRequestRef.current = item.productId;

      const cached = detailCacheRef.current[item.productId];
      if (cached) {
        setProductDetail(cached);
        setProductDetailLoading(false);
        return;
      }

      setProductDetail(null);
      setProductDetailLoading(true);

      try {
        const data = await fetchProductDetail(item.productId);
        detailCacheRef.current[item.productId] = data;
        if (currentDetailRequestRef.current === item.productId) {
          setProductDetail(data);
        }
      } catch (err) {
        if (currentDetailRequestRef.current === item.productId) {
          const message =
            err instanceof Error
              ? err.message
              : "We couldn't load this product right now. Please try again.";
          setProductDetailError(message);
        }
      } finally {
        if (currentDetailRequestRef.current === item.productId) {
          setProductDetailLoading(false);
        }
      }
    },
    []
  );

  const handleCloseProductDetails = useCallback(() => {
    currentDetailRequestRef.current = null;
    setActiveRecommendation(null);
    setProductDetail(null);
    setProductDetailError(null);
    setProductDetailLoading(false);
  }, []);

  const handleRetryProductDetails = useCallback(() => {
    if (activeRecommendation) {
      void handleShowProductDetails(activeRecommendation);
    }
  }, [activeRecommendation, handleShowProductDetails]);

  const handleSubmitFeedback = useCallback(async () => {
    if (rating === 0) {
      setFeedbackError("Please select a rating before submitting.");
      return;
    }
    if (!result?.sessionId) {
      setFeedbackError("We couldn't find this quiz session. Please refresh and try again.");
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const storedProfile = getStoredProfile();
      const badge = result?.summary?.primaryConcerns?.[0] ?? result?.profile?.primaryConcerns?.[0] ?? null;
      const trimmedMessage = feedback.trim();
      const metadata = buildFeedbackMetadata({
        profile: anonymizeFeedback ? null : storedProfile,
        anonymize: anonymizeFeedback,
        source: "quiz-result",
        badge,
      });

      await submitQuizFeedback({
        sessionId: result.sessionId,
        rating,
        message: trimmedMessage || undefined,
        metadata,
      });

      setRating(0);
      setHoverRating(0);
      setFeedback("");
      setFeedbackSubmitted(true);
      setAnonymizeFeedback(false);
      setTimeout(() => {
        setFeedbackSubmitted(false);
      }, 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "We couldn't send your feedback right now. Please try again.";
      setFeedbackError(message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [
    anonymizeFeedback,
    feedback,
    rating,
    result?.profile?.primaryConcerns,
    result?.sessionId,
    result?.summary?.primaryConcerns,
  ]);

  if (!hasPrimary) {
    return (
      <main className="min-h-screen bg-[#f8cc8c] flex items-center justify-center">
        <section className="mx-auto w-full px-6 text-center space-y-6" style={{ maxWidth: fallbackWidth }}>
          <h1 className="text-3xl font-extrabold text-[#3C3D37]">Let&apos;s build your skin profile</h1>
          <p className="text-base text-[#3C3D37]/80">
            We couldn&apos;t find your latest quiz answers. Please retake the quick quiz so we can summarise your
            skin profile and ingredient roadmap.
          </p>
          <Link
            href="/quiz"
            onClick={() => {
              void resetQuiz();
            }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-[0_6px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]"
          >
            Retake the quiz
            <span aria-hidden>→</span>
          </Link>
        </section>
      </main>
    );
  }

  const handleRetake = async () => {
    try {
      await resetQuiz();
    } catch (err) {
      console.error("Failed to reset quiz session", err);
    } finally {
      router.push("/quiz");
    }
  };

  return (
    <main className="min-h-screen bg-[#FFF6E9] flex items-start justify-center pt-36 pb-20">
      <section className="mx-auto w-full px-32 space-y-12" style={{ maxWidth: sectionMaxWidth }}>
        <header className="text-center space-y-4">
          <p className="uppercase tracking-[0.3em] text-xs font-semibold text-[#B9375D]">
            Your Skin Match Snapshot
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3C3D37] drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]">
            Personalised routine roadmap
          </h1>
          <p className="text-base sm:text-lg text-[#3C3D37]/80 max-w-2xl mx-auto">
            Here&apos;s a snapshot of your skin profile—plus the ingredient insights surfaced by our matcher.
          </p>
          {error && (
            <p className="text-sm text-[#B9375D]">
              We had trouble fetching the latest recommendations. Your saved guidance is shown below.
            </p>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <section className="space-y-8">
            <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#f0f5ff] to-[#F5BABB] p-8 shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
              <h2 className="text-2xl font-bold text-[#3C3D37] mb-4">Your skin profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {profileItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-black/60 bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#B95E82]/80 font-semibold">
                      {item.label}
                    </p>
                    <p className="mt-1 text-base font-semibold text-[#3C3D37]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#A7E399] p-8 shadow-[6px_8px_0_rgba(0,0,0,0.25)] space-y-6">
              <h2 className="text-2xl font-bold text-[#33574a]">Ingredients to prioritise</h2>
              <ul className="space-y-4">
                {ingredientHighlights.map((item) => (
                  <li key={item.ingredient} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#33574a]" aria-hidden />
                    <div>
                      <p className="font-semibold text-[#1f2d26]">{item.ingredient}</p>
                      <p className="text-sm text-[#1f2d26]/70">{item.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="space-y-8">
            <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#A3CCDA] p-7 shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
              <h2 className="text-xl font-bold text-[#1b2a50]">Strategy notes</h2>
              <ul className="mt-4 space-y-4">
                {strategyNotes.map((insight) => (
                  <li key={insight} className="text-sm text-[#1b2a50]/80 font-medium leading-relaxed">
                    {insight}
                  </li>
                ))}
              </ul>
              {!strategyNotes.length && (
                <p className="text-sm text-[#1b2a50]/70">
                  Keep routines gentle and consistent—your skin will reward the steady care.
                </p>
              )}
            </div>

            <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#fffbde] to-[#ffaf6f] p-8 shadow-[6px_8px_0_rgba(0,0,0,0.25)] space-y-6">
              <h2 className="text-2xl font-bold text-[#70410f]">Use with caution</h2>
              {guidance.avoid.length ? (
                <ul className="space-y-4">
                  {guidance.avoid.map((item) => (
                    <li key={item.ingredient} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#b45a1b]" aria-hidden />
                      <div>
                        <p className="font-semibold text-[#5f3111]">{item.ingredient}</p>
                        <p className="text-sm text-[#5f3111]/75">{item.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#5f3111]/75">
                  Nothing major to avoid based on your answers—maintain balance and listen to your skin.
                </p>
              )}
            </div>

          </aside>

          {/* PRODUCT MATCHES SECTION - MOVED UP */}
            <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#f0e7ff] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)] lg:col-span-2">
            <h2 className="text-2xl font-bold text-[#3C3D37] mb-4">Product matches</h2>
            {renderRecommendations(recommendations, requiresAuth, handleShowProductDetails, wishlistedIds, setWishlistedIds)}
          </div>

          {/* EMAIL & RETAKE QUIZ ROW */}
          <div className="rounded-3xl border-2 border-black bg-white/80 p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)] space-y-4">
            <h3 className="text-lg font-bold text-[#1b2a50]">Email this summary</h3>
            <p className="text-sm text-[#1b2a50]/70">
              Get a copy of your SkinProfile delivered straight to your inbox.
            </p>
            <div className="space-y-3 text-left">
              <input
                type="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[#1b2a50]/30 bg-white/90 px-4 py-2 text-sm text-[#1b2a50] shadow-[0_3px_0_rgba(0,0,0,0.12)] focus:border-[#1b2a50] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleEmailSummary}
                disabled={emailStatus === "sending" || !result?.sessionId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#1b2a50] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailStatus === "sending" ? "Sending..." : "Send summary"}
              </button>
              {emailStatus === "success" && emailMessage && (
                <p className="text-sm font-semibold text-[#1b2a50]">{emailMessage}</p>
              )}
              {emailStatus === "error" && emailMessage && (
                <p className="text-sm font-semibold text-[#B9375D]">{emailMessage}</p>
              )}
              {emailStatus === "idle" && !emailMessage && (
                <p className="text-xs text-[#1b2a50]/60">
                  Leave the field blank to use your account email, or enter another address.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#fff8e1] to-[#ffe0b2] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)] flex flex-col">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#3C3D37]">Want to tweak your answers?</h3>
              <p className="text-sm text-[#3C3D37]/70">
                Update your responses to see how your ingredient roadmap evolves.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-[#3C3D37] shadow-[0_6px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] mt-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake the quiz
            </button>
          </div>

          {/* FEEDBACK SECTION */}
          <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#ffd4e5] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)] lg:col-span-2">
            <h2 className="text-2xl font-bold text-[#3C3D37] mb-4">Rate your match experience</h2>
            
            {feedbackSubmitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#A7E399] mb-4">
                  <svg className="w-8 h-8 text-[#33574a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-[#3C3D37]">Thank you for your feedback!</p>
                <p className="text-sm text-[#3C3D37] text-opacity-70 mt-2">Your input helps us improve our matches.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <svg
                          className={`w-10 h-10 ${
                            star <= (hoverRating || rating)
                              ? "text-[#fbbf24] fill-current"
                              : "text-gray-300"
                          }`}
                          fill={star <= (hoverRating || rating) ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border-2 border-black bg-white px-4 py-3 shadow-[2px_3px_0_rgba(0,0,0,0.1)] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#3C3D37]">Submit feedback anonymously</p>
                    <p className="text-xs text-[#3C3D37]/70">
                      Keep your thoughts visible while hiding your name on public testimonials.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anonymizeFeedback}
                    onClick={() => setAnonymizeFeedback((prev) => !prev)}
                    className={`relative inline-flex h-9 w-16 items-center rounded-full border-2 border-black transition ${
                      anonymizeFeedback ? "bg-[#B9375D]" : "bg-white"
                    }`}
                  >
                    <span className="sr-only">
                      {anonymizeFeedback ? "Anonymous feedback enabled" : "Anonymous feedback disabled"}
                    </span>
                    <span
                      className={`absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-black bg-white transition-transform ${
                        anonymizeFeedback ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label htmlFor="feedback" className="block text-sm font-semibold text-[#3C3D37] mb-2">
                    Additional feedback (optional)
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Share your thoughts about the matches, ingredients, or overall experience..."
                    rows={4}
                    className="w-full rounded-2xl border-2 border-black px-4 py-3 text-sm text-[#3C3D37] placeholder-[#3C3D37] placeholder-opacity-40 focus:outline-none focus:ring-2 focus:ring-[#B9375D] shadow-[2px_3px_0_rgba(0,0,0,0.1)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0 || isSubmittingFeedback}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#B9375D] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.2)]"
                >
                  {isSubmittingFeedback ? "Sending..." : "Submit feedback"}
                </button>
                {feedbackError ? (
                  <p className="text-sm font-semibold text-red-600">{feedbackError}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {!isComplete && (
          <p className="text-sm text-center text-[#3C3D37]/60">
            Missing an answer? You can revisit any step above to fill the gaps and refine the guidance.
          </p>
        )}
      </section>
      {activeRecommendation && (
        <ProductDetailModal
          recommendation={activeRecommendation}
          detail={productDetail}
          loading={productDetailLoading}
          error={productDetailError}
          onClose={handleCloseProductDetails}
          onRetry={handleRetryProductDetails}
        />
      )}
    </main>
  );
}

function answersToLabels(answers: Record<QuizAnswerKey, QuizAnswer | null>) {
  return (Object.entries(answers) as [QuizAnswerKey, QuizAnswer | null][]).reduce(
    (acc, [key, selection]) => {
      acc[key] = selection?.label ?? null;
      return acc;
    },
    {} as Record<QuizAnswerKey, string | null>
  );
}

function formatPregnancy(value: boolean | string | null): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return capitalize(value);
  }
  return "Not provided";
}

function formatBudget(value: string | null): string {
  if (!value) return "Not provided";
  if (value === "mid") return "Mid-range";
  if (value === "premium") return "Premium / luxury";
  return capitalize(value);
}

function capitalize(text: string) {
  if (!text) return "";
  return text
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPriceLabel(price: number | null, currency?: string) {
  if (typeof price !== "number") return null;
  if (!currency || price <= 0) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return null;
  }
}

function buildProfileItems(profile: QuizProfile | null, answers: Record<QuizAnswerKey, string | null>) {
  const items: { label: string; value: string }[] = [];
  const append = (label: string, value: string | null) => {
    items.push({ label, value: value && value.trim() ? value : "Not provided" });
  };

  if (profile) {
    append("Primary concern", profile.primaryConcerns[0] ?? answers.primaryConcern);
    if (profile.secondaryConcerns.length || answers.secondaryConcern) {
      append("Secondary focus", profile.secondaryConcerns[0] ?? answers.secondaryConcern);
    }
    append("Eye area", profile.eyeAreaConcerns[0] ?? answers.eyeConcern);
    append("Skin type", profile.skinType ?? answers.skinType);
    append("Sensitivity", profile.sensitivity ?? answers.sensitivity);
    append(
      "Pregnancy / breastfeeding",
      formatPregnancy(profile.pregnantOrBreastfeeding ?? answers.pregnancy)
    );
    append("Budget mindset", formatBudget(profile.budget ?? answers.budget));
    return items;
  }

  append("Primary concern", answers.primaryConcern);
  if (answers.secondaryConcern) {
    append("Secondary focus", answers.secondaryConcern);
  }
  append("Eye area", answers.eyeConcern);
  append("Skin type", answers.skinType);
  append("Sensitivity", answers.sensitivity);
  append("Pregnancy / breastfeeding", formatPregnancy(answers.pregnancy));
  append("Budget mindset", formatBudget(answers.budget));
  return items;
}

function buildSummaryInsights(summary: QuizResultSummary | undefined) {
  if (!summary) return [] as string[];
  const insights: string[] = [];

  if (summary.primaryConcerns.length) {
    const concerns = summary.primaryConcerns.join(" & ");
    insights.push(`Product matches double down on ${concerns.toLowerCase()} support.`);
  }

  const categories = summary.categoryBreakdown;
  if (categories && Object.keys(categories).length) {
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const [topCategory, total] = sorted[0];
    insights.push(`Expect a focus on ${topCategory} formulas (${total} hero pick${total === 1 ? "" : "s"}).`);
  }

  return insights;
}

function renderRecommendations(
  recommendations: QuizRecommendation[],
  requiresAuth: boolean,
  onShowDetails: (item: QuizRecommendation) => void | Promise<void>,
  wishlistedIds: Set<string>,
  setWishlistedIds: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const handleFav = async (item: QuizRecommendation) => {
    try {
      const token = getAuthToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }
      if (!item.productId) return;
      const isWishlisted = wishlistedIds.has(item.productId);
      const { addToWishlist, removeFromWishlist } = await import("@/lib/api.wishlist");
      if (isWishlisted) {
        await removeFromWishlist(item.productId, token);
        setWishlistedIds(prev => {
          const next = new Set(prev);
          next.delete(item.productId);
          return next;
        });
      } else {
        await addToWishlist(item.productId, token);
        setWishlistedIds(prev => new Set(prev).add(item.productId));
      }
    } catch (err) {
      console.error("Failed to update wishlist", err);
    }
  };
  if (recommendations.length) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recommendations.map((item) => {
          const brandLabel = item.brandName ?? item.brand;
          const priceLabel = formatPriceLabel(item.priceSnapshot, item.currency);
          return (
            <article
              key={item.productId}
              className="group relative flex h-full flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_4px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:shadow-[4px_6px_0_rgba(0,0,0,0.25)]"
            >
              {/* Product Image - 1:1 Ratio, No Border */}
              {item.imageUrl ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#f8f8f8]">
                  <Image
                    src={item.imageUrl}
                    alt={`${brandLabel} ${item.productName}`}
                    fill
                    unoptimized
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 240px"
                  />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[#f2ebff] text-[10px] font-bold uppercase tracking-[0.15em] text-[#7a628c] text-center px-2">
                  Product preview<br />coming soon
                </div>
              )}

              {/* Product Info */}
              <div className="mt-3 flex flex-col gap-1.5 flex-grow">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#B9375D]">{brandLabel}</p>
                <h4 className="text-sm font-bold leading-tight text-[#1f2d26] line-clamp-2">{item.productName}</h4>
                <p className="text-[10px] font-semibold text-[#3C3D37] text-opacity-60">{capitalize(item.category)}</p>
                
                {/* Match Score & Price */}
                <div className="flex items-center gap-1.5 text-xs mt-1">
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-black/20 bg-[#e8f5e9] px-2 py-0.5 text-[10px] font-bold text-[#2e7d32]">
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {item.score.toFixed(1)}
                  </span>
                  {priceLabel && (
                    <span className="text-xs font-bold text-[#3C3D37]">{priceLabel}</span>
                  )}
                </div>

                {/* Hero Ingredients */}
                {item.ingredients.length > 0 && (
                  <p className="text-[10px] leading-relaxed text-[#3C3D37] text-opacity-70 line-clamp-2">
                    <span className="font-semibold text-[#3C3D37]">Hero:</span>{" "}
                    {item.ingredients.slice(0, 2).join(", ")}
                    {item.ingredients.length > 2 ? "..." : ""}
                  </p>
                )}
              </div>

              {/* Footer - Rating & CTA */}
              <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
                <div className="flex items-center gap-1 text-[10px] text-[#3C3D37] text-opacity-60">
                  {item.averageRating ? (
                    <>
                      <svg className="h-3 w-3 text-[#fbbf24]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-semibold text-[#3C3D37]">
                        {item.averageRating.toFixed(1)}
                      </span>
                      <span>({item.reviewCount})</span>
                    </>
                  ) : (
                    <span>No reviews</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    aria-label={wishlistedIds.has(item.productId) ? "Remove from wishlist" : "Add to wishlist"}
                    onClick={() => { void handleFav(item); }}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ffebef] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                  >
                    <svg className={`h-3.5 w-3.5 ${wishlistedIds.has(item.productId) ? "text-pink-500" : "text-[#B9375D]"}`} fill={wishlistedIds.has(item.productId) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void onShowDetails(item);
                    }}
                    className="inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-3 py-1.5 text-[10px] font-bold text-[#1f2d26] shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#f5f4ff] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                  >
                    Details
                  </button>

                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#B9375D] px-3 py-1.5 text-[10px] font-bold text-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a72f52] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                    >
                      Shop
                    </a>
                  )}
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    );
  }

  if (requiresAuth) {
    return (
      <p className="text-sm text-[#3C3D37]/70 text-center py-8">
        Sign in to unlock personalised product matches and routine builders tailored to your profile.
      </p>
    );
  }

  return (
    <p className="text-sm text-[#3C3D37]/70 text-center py-8">
      We&apos;re still analysing product data for your skin traits. Ingredient guidance above is ready to use today.
    </p>
  );
}

type ProductDetailModalProps = {
  recommendation: QuizRecommendation;
  detail: ProductDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
};

const RATIONALE_LABELS: Record<string, string> = {
  primary_concerns: "Targets your primary concerns",
  secondary_concerns: "Supports your secondary focus",
  eye_area: "Focused on eye area needs",
  skin_type: "Skin type compatible",
  sensitivity: "Friendly for sensitive skin",
  restrictions: "Matches your preferences",
  budget: "Fits your budget range",
};

function ProductDetailModal({
  recommendation,
  detail,
  loading,
  error,
  onClose,
  onRetry,
}: ProductDetailModalProps) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const previous = typeof document !== "undefined" ? document.body.style.overflow : "";
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = previous;
      }
    };
  }, []);

  const display = detail ?? null;
  const imageUrl = display?.imageUrl ?? recommendation.imageUrl ?? null;
  const brand = display?.brand ?? recommendation.brandName ?? recommendation.brand;
  const name = display?.productName ?? recommendation.productName;
  const categoryLabel =
    display?.categoryLabel ?? capitalize(display?.category ?? recommendation.category);
  const priceLabel = formatPriceLabel(
    display?.price ?? recommendation.priceSnapshot,
    display?.currency ?? recommendation.currency
  );
  const rating = display?.averageRating ?? recommendation.averageRating;
  const reviewCount = display?.reviewCount ?? recommendation.reviewCount;
  const heroIngredients =
    (display?.heroIngredients && display.heroIngredients.length
      ? display.heroIngredients
      : recommendation.ingredients.slice(0, 3)) ?? [];
  const ingredientDetails = display?.ingredients.length
    ? display.ingredients
    : recommendation.ingredients.map((ingredient, index) => ({
        name: ingredient,
        inciName: null,
        highlight: index < heroIngredients.length,
        order: index,
      }));
  const concerns = display?.concerns ?? [];
  const skinTypes = display?.skinTypes ?? [];
  const restrictions = display?.restrictions ?? [];
  const affiliateUrl =
    display?.affiliateUrl ?? display?.productUrl ?? recommendation.productUrl ?? null;

  const rationaleEntries = Object.entries(recommendation.rationale ?? {})
    .map(([key, values]) => ({
      key,
      label: RATIONALE_LABELS[key] ?? capitalize(key),
      values: Array.isArray(values)
        ? values.filter(Boolean).map((value) => String(value))
        : [],
    }))
    .filter((entry) => entry.values.length);

  const ingredientPreview = ingredientDetails.slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${brand} ${name}`}
        className="relative flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border-2 border-black bg-white shadow-[8px_10px_0_rgba(0,0,0,0.25)]"
      >
        <div className="flex-1 overflow-y-auto">
          <div className="grid min-h-full gap-5 px-5 pb-6 pt-8 md:grid-cols-[220px,1fr] md:pt-8">
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#f7f7f7] hover:shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                  aria-label="Close product details"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative overflow-hidden rounded-2xl border-2 border-black/10 bg-[#f7f7f7] pb-[85%]">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={`${brand} ${name}`}
                    fill
                    unoptimized
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 60vw, 220px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-xs font-semibold text-[#7a628c]">
                    Image coming soon
                  </div>
                )}
              </div>

              {affiliateUrl && (
                <a
                  href={affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#B9375D] px-4 py-2 text-sm font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a72f52] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)]"
                >
                  Shop with affiliate
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M12.293 2.293a1 1 0 011.414 0l4 4A1 1 0 0117 8h-3v7a1 1 0 11-2 0V7a1 1 0 011-1h2.586L12.293 3.707a1 1 0 010-1.414z" />
                    <path d="M5 4a3 3 0 00-3 3v7a3 3 0 003 3h7a3 3 0 003-3v-1a1 1 0 112 0v1a5 5 0 01-5 5H5a5 5 0 01-5-5V7a5 5 0 015-5h1a1 1 0 110 2H5z" />
                  </svg>
                </a>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B9375D]">{brand}</p>
                <h2 className="text-2xl font-extrabold leading-tight text-[#1f2d26]">{name}</h2>
                <p className="text-sm font-semibold text-[#3C3D37] text-opacity-70">{categoryLabel}</p>
                {(rating || priceLabel) && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#1f2d26]">
                    {rating ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-black/20 bg-[#fff3c4] px-3 py-1 font-semibold">
                        <svg className="h-4 w-4 text-[#f59e0b]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 8.72c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {rating.toFixed(1)}
                        <span className="text-xs text-[#3C3D37] text-opacity-60">({reviewCount ?? 0})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#3C3D37] text-opacity-60">No reviews yet</span>
                    )}
                    {priceLabel && (
                      <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-[#1f2d26]">
                        {priceLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {display?.summary && (
                <p className="text-sm leading-relaxed text-[#3C3D37] text-opacity-80">{display.summary}</p>
              )}

              {display?.description && (
                <div className="rounded-2xl border border-[#d7d7d7] bg-[#fafafa] p-4 text-sm leading-relaxed text-[#3C3D37]">
                  {display.description}
                </div>
              )}

              {heroIngredients.length ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1f2d26] uppercase tracking-[0.12em]">
                    Hero ingredients
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {heroIngredients.map((ingredient) => (
                      <span
                        key={ingredient}
                        className="inline-flex items-center rounded-full border border-black/10 bg-[#fce8ef] px-3 py-1 text-xs font-semibold text-[#B9375D]"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {ingredientPreview.length ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1f2d26] uppercase tracking-[0.12em]">
                    Ingredient highlights
                  </h3>
                  <ul className="mt-3 grid gap-2 text-sm text-[#3C3D37] text-opacity-80 sm:grid-cols-2">
                    {ingredientPreview.map((ingredient) => (
                      <li key={`${ingredient.name}-${ingredient.order}`} className="flex items-start gap-2">
                        <span
                          className={`mt-1 inline-flex h-2 w-2 rounded-full ${
                            ingredient.highlight ? "bg-[#B9375D]" : "bg-[#3C3D37]/40"
                          }`}
                          aria-hidden
                        />
                        <div>
                          <p className="font-semibold text-[#1f2d26]">{ingredient.name}</p>
                          {ingredient.inciName && (
                            <p className="text-xs uppercase tracking-[0.12em] text-[#3C3D37] text-opacity-50">
                              {ingredient.inciName}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(concerns.length || skinTypes.length || restrictions.length) && (
                <div className="space-y-3">
                  {concerns.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">Targets</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {concerns.map((concern) => (
                          <span
                            key={concern}
                            className="rounded-full border border-black/10 bg-[#e6f5f0] px-3 py-1 font-semibold text-[#1f2d26]"
                          >
                            {concern}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {skinTypes.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">
                        Skin type fit
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {skinTypes.map((skinType) => (
                          <span
                            key={skinType}
                            className="rounded-full border border-black/10 bg-[#fff3c4] px-3 py-1 font-semibold text-[#1f2d26]"
                          >
                            {capitalize(skinType)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {restrictions.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">
                        Preferences met
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {restrictions.map((restriction) => (
                          <span
                            key={restriction}
                            className="rounded-full border border-black/10 bg-[#e8e5ff] px-3 py-1 font-semibold text-[#33308a]"
                          >
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {rationaleEntries.length ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1f2d26] uppercase tracking-[0.12em]">
                    Why we matched it
                  </h3>
                  <ul className="mt-3 space-y-3 text-sm text-[#3C3D37] text-opacity-80">
                    {rationaleEntries.map((entry) => (
                      <li key={entry.key}>
                        <p className="font-semibold text-[#1f2d26]">{entry.label}</p>
                        <p className="text-sm text-[#3C3D37] text-opacity-70">{entry.values.join(", ")}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {error ? (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="shrink-0 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {loading && !detail ? (
                <p className="text-xs font-semibold text-[#3C3D37] text-opacity-60">
                  Fetching product details…
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
