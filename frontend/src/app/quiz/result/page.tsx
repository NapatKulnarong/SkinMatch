// src/app/quiz/result/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavWidth } from "@/components/NavWidthContext";
import type { QuizProfile, QuizRecommendation, QuizResultSummary } from "@/lib/api.quiz";
import { emailQuizSummary } from "@/lib/api.quiz";
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

  useEffect(() => {
    if (isComplete && hasPrimary && !result) {
      finalize().catch(() => null);
    }
  }, [finalize, hasPrimary, isComplete, result]);

  const sectionMaxWidth = navWidth ? `${navWidth}px` : "1200px";
  const fallbackWidth = navWidth ? `${navWidth}px` : "720px";

  const answerLabels = useMemo(() => answersToLabels(answers), [answers]);
  const guidance = useMemo(() => buildGuidance(answerLabels), [answerLabels]);

  const ingredientHighlights = useMemo(() => {
    const highlights: { ingredient: string; reason: string }[] = [];
    const topIngredients = result?.summary.topIngredients ?? [];
    topIngredients.forEach((ingredient) => {
      if (!ingredient) return;
      highlights.push({ ingredient, reason: MATCH_INGREDIENT_REASON });
    });
    guidance.lookFor.forEach((item) => {
      if (!highlights.some((entry) => entry.ingredient === item.ingredient)) {
        highlights.push(item);
      }
    });
    return highlights.slice(0, 6);
  }, [guidance.lookFor, result?.summary.topIngredients]);

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

  const handleSubmitFeedback = useCallback(async () => {
    if (rating === 0) {
      alert("Please select a rating before submitting.");
      return;
    }
    
    // TODO: Implement API call to submit feedback
    console.log("Submitting feedback:", { sessionId: result?.sessionId, rating, feedback });
    
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
    }, 3000);
  }, [rating, feedback, result?.sessionId]);

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
            {renderRecommendations(recommendations, requiresAuth)}
          </div>

          {/* EMAIL & RETAKE QUIZ ROW */}
          <div className="rounded-3xl border-2 border-black bg-white/80 p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)] space-y-4">
            <h3 className="text-lg font-bold text-[#1b2a50]">Email this summary</h3>
            <p className="text-sm text-[#1b2a50]/70">
              Get a copy of your routine roadmap delivered straight to your inbox.
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
                  <p className="text-sm font-semibold text-[#3C3D37] mb-3">How would you rate this skin match?</p>
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
                    {rating > 0 && (
                      <span className="ml-2 text-sm font-semibold text-[#3C3D37]">
                        {rating} {rating === 1 ? "star" : "stars"}
                      </span>
                    )}
                  </div>
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
                  disabled={rating === 0}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#B9375D] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.2)]"
                >
                  Submit feedback
                </button>
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

function renderRecommendations(recommendations: QuizRecommendation[], requiresAuth: boolean) {
  if (recommendations.length) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recommendations.map((item) => {
          const brandLabel = item.brandName ?? item.brand;
          const priceLabel =
            item.priceSnapshot !== null
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: item.currency,
                  maximumFractionDigits: 0,
                }).format(item.priceSnapshot)
              : null;
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
              <footer className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 pt-3">
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
                    aria-label="Add to wishlist"
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ffebef] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                  >
                    <svg className="h-3.5 w-3.5 text-[#B9375D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-3 py-1.5 text-[10px] font-bold text-[#B9375D] shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                    >
                      View
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
