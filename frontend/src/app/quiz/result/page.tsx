// src/app/quiz/result/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNavWidth } from "@/components/NavWidthContext";
import type { QuizProfile, QuizRecommendation, QuizResultSummary } from "@/lib/api.quiz";
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

  const combinedInsights = useMemo(() => {
    const insights = [...guidance.insights];
    const summaryInsights = buildSummaryInsights(result?.summary);
    summaryInsights.forEach((note) => {
      if (!insights.includes(note)) {
        insights.push(note);
      }
    });
    return insights;
  }, [guidance.insights, result?.summary]);

  const profileItems = useMemo(() => {
    return buildProfileItems(result?.profile ?? null, answerLabels);
  }, [answerLabels, result?.profile]);

  const recommendations = result?.recommendations ?? [];
  const requiresAuth = Boolean(result?.requiresAuth);

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
                {combinedInsights.map((insight) => (
                  <li key={insight} className="text-sm text-[#1b2a50]/80 font-medium leading-relaxed">
                    {insight}
                  </li>
                ))}
              </ul>
              {!combinedInsights.length && (
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

            <div className="rounded-3xl border-2 border-black bg-[#F2EAD3] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.25)] space-y-4 text-center">
              <h3 className="text-lg font-bold text-[#3C3D37]">Want to tweak your answers?</h3>
              <p className="text-sm text-[#3C3D37]/70">
                Update your responses to see how your ingredient roadmap evolves.
              </p>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2.5 text-sm font-semibold text-[#3C3D37] shadow-[0_6px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)]"
              >
                Retake the quiz
                <span aria-hidden>↺</span>
              </button>
            </div>
          </aside>

          <div className="rounded-3xl border-2 border-dashed border-black/30 bg-white/70 p-7 shadow-[6px_8px_0_rgba(0,0,0,0.12)] space-y-4 lg:col-span-2">
            <header className="space-y-2 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#3C3D37]/60">
                Product matches
              </p>
              <h3 className="text-lg font-bold text-[#3C3D37]">
                {recommendations.length ? "Curated for your profile" : "Matches unavailable"}
              </h3>
            </header>
            {renderRecommendations(recommendations, requiresAuth)}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-left">
        {recommendations.map((item) => {
          const brandLabel = item.brandName ?? item.brand;
          return (
            <article
              key={item.productId}
              className="rounded-3xl border-2 border-black bg-white p-5 shadow-[4px_6px_0_rgba(0,0,0,0.18)] space-y-3"
            >
              <header className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B9375D]">
                  {brandLabel}
                </p>
                <h4 className="text-lg font-bold text-[#1f2d26]">{item.productName}</h4>
                <p className="text-xs text-[#3C3D37]/60">{capitalize(item.category)}</p>
              </header>
              <p className="text-sm text-[#3C3D37]/75">
                Match score{" "}
                <span className="font-semibold text-[#3C3D37]">{item.score.toFixed(1)}</span>
                {item.priceSnapshot !== null && (
                  <>
                    {" • "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: item.currency,
                      maximumFractionDigits: 0,
                    }).format(item.priceSnapshot)}
                  </>
                )}
              </p>
              {item.ingredients.length > 0 && (
                <p className="text-xs text-[#3C3D37]/70">
                  Hero ingredients: {item.ingredients.slice(0, 3).join(", ")}
                  {item.ingredients.length > 3 ? "…" : ""}
                </p>
              )}
              <footer className="flex items-center justify-between text-xs text-[#3C3D37]/60">
                {item.averageRating ? (
                  <span>
                    {item.averageRating.toFixed(1)} ★ ({item.reviewCount} review
                    {item.reviewCount === 1 ? "" : "s"})
                  </span>
                ) : (
                  <span>No reviews yet</span>
                )}
                {item.productUrl && (
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#B9375D] hover:underline"
                  >
                    View
                  </a>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    );
  }

  if (requiresAuth) {
    return (
      <p className="text-sm text-[#3C3D37]/70">
        Sign in to unlock personalised product matches and routine builders tailored to your profile.
      </p>
    );
  }

  return (
    <p className="text-sm text-[#3C3D37]/70">
      We&apos;re still analysing product data for your skin traits. Ingredient guidance above is ready to use today.
    </p>
  );
}
