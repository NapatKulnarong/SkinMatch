"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageContainer from "@/components/PageContainer";
import { STEP_META, type StepMeta } from "@/app/quiz/_config";
import { buildGuidance } from "@/app/quiz/result/_guidance";
import {
  fetchQuizHistoryDetail,
  type QuizHistoryDetail,
  type QuizProfile,
  type QuizRecommendation,
  type QuizResultSummary,
} from "@/lib/api.quiz";
import { getAuthToken } from "@/lib/auth-storage";

const MATCH_INGREDIENT_REASON =
  "Frequently appears across the product matches prioritised for your skin profile.";

export default function MatchDetailPage({ params }: { params: { profileId: string } }) {
  return <MatchDetailContent profileId={params.profileId} />;
}

function MatchDetailContent({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<QuizHistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    if (!token) {
      setError("Please sign in to view this match summary.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchQuizHistoryDetail(profileId);
        if (cancelled) return;
        setDetail(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load history detail", err);
        setError(err instanceof Error ? err.message : "Unable to load this match summary.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const answerLabels = useMemo(() => (detail ? buildAnswerLabels(detail) : null), [detail]);
  const guidance = useMemo(() => (answerLabels ? buildGuidance(answerLabels) : null), [answerLabels]);
  const profileItems = useMemo(
    () => (detail && answerLabels ? buildProfileItems(detail.profile, answerLabels) : []),
    [detail, answerLabels]
  );
  const ingredientHighlights = useMemo(() => {
    if (!detail || !guidance) return [];
    return buildIngredientHighlights(detail.summary, guidance.lookFor);
  }, [detail, guidance]);
  const strategyNotes = useMemo(() => {
    if (!detail || !guidance) return [] as string[];
    const aiNotes = detail.strategyNotes ?? [];
    if (aiNotes.length) {
      return aiNotes;
    }
    const merged = [...buildSummaryInsights(detail.summary), ...guidance.insights];
    const seen = new Set<string>();
    return merged.filter((note) => {
      if (!note || seen.has(note)) return false;
      seen.add(note);
      return true;
    });
  }, [detail, guidance]);
  const cautionItems = guidance?.avoid ?? [];
  const recommendations = detail?.recommendations ?? [];

  const completedLabel = detail
    ? new Date(detail.completedAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <main className="min-h-screen bg-[#FFF6E9]">
      <Navbar />
      <PageContainer className="pt-32 pb-16">
        <div className="flex items-center justify-between">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#3C3D37] hover:underline"
          >
            ← Back to account
          </Link>
          {detail?.sessionId && (
            <Link
              href={`/quiz/result?session=${detail.sessionId}`}
              className="text-sm font-semibold text-[#B9375D] hover:underline"
            >
              View original result
            </Link>
          )}
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-center shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-[#B9375D]" />
              <p className="text-sm font-semibold text-[#3C3D37]">Loading match summary…</p>
            </div>
          </div>
        ) : error ? (
          <div className="mt-12 flex justify-center">
            <div className="max-w-md rounded-2xl border-2 border-black bg-white px-6 py-5 text-center shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
              <p className="text-sm font-semibold text-[#B9375D]">{error}</p>
              <p className="mt-2 text-xs text-[#3C3D37] text-opacity-70">Return to your account page to pick another match.</p>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="mt-4 inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-semibold text-[#3C3D37] shadow-[0_3px_0_rgba(0,0,0,0.2)]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : detail && guidance && answerLabels ? (
          <section className="mt-10 space-y-10">
            <header className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B9375D]">
                Your skin match snapshot
              </p>
              <h1 className="text-3xl font-extrabold text-[#3C3D37] drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]">
                Personalised routine roadmap
              </h1>
              <p className="text-sm text-[#3C3D37] text-opacity-70">
                Here&apos;s a snapshot of your skin profile—plus the ingredient insights surfaced by our matcher.
              </p>
              <p className="text-xs font-semibold text-[#3C3D37] text-opacity-50">Completed {completedLabel}</p>
            </header>

            <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
              <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#f0f5ff] to-[#F5BABB] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
                <h3 className="text-lg font-bold text-[#3C3D37] mb-4">Your skin profile</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profileItems.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-black/30 bg-white/80 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B95E82] text-opacity-70">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#3C3D37]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#A3CCDA] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
                <h3 className="text-lg font-bold text-[#1b2a50]">Strategy notes</h3>
                {strategyNotes.length ? (
                  <ul className="mt-4 space-y-3 text-sm text-[#1b2a50] text-opacity-80">
                    {strategyNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[#1b2a50] text-opacity-70">
                    Keep routines gentle and consistent—your skin will reward the steady care.
                  </p>
                )}
              </section>
            </div>

            <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
              <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#A7E399] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
                <h3 className="text-lg font-bold text-[#33574a]">Ingredients to prioritise</h3>
                {ingredientHighlights.length ? (
                  <ul className="mt-4 space-y-3">
                    {ingredientHighlights.map((entry) => (
                      <li key={entry.ingredient} className="flex items-start gap-3 text-sm text-[#1f2d26]">
                        <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#33574a]" aria-hidden />
                        <div>
                          <p className="font-semibold">{entry.ingredient}</p>
                          <p className="text-sm text-[#1f2d26] text-opacity-70">{entry.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[#1f2d26] text-opacity-70">
                    Ingredient insights will appear here once we have more data for this match.
                  </p>
                )}
              </section>

              <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#fffbde] to-[#ffaf6f] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
                <h3 className="text-lg font-bold text-[#70410f]">Use with caution</h3>
                {cautionItems.length ? (
                  <ul className="mt-4 space-y-3">
                    {cautionItems.map((entry) => (
                      <li key={entry.ingredient} className="flex items-start gap-3 text-sm text-[#5f3111]">
                        <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#b45a1b]" aria-hidden />
                        <div>
                          <p className="font-semibold">{entry.ingredient}</p>
                          <p className="text-sm text-[#5f3111] text-opacity-75">{entry.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[#5f3111] text-opacity-75">
                    Nothing major to avoid based on this profile—maintain balance and listen to your skin.
                  </p>
                )}
              </section>
            </div>

            <section className="rounded-3xl border-2 border-dashed border-black/30 bg-white/70 p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
              <header className="space-y-2 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#3C3D37] text-opacity-60">Product matches</p>
                <h3 className="text-lg font-bold text-[#3C3D37]">
                  {recommendations.length ? "Curated for your profile" : "Matches unavailable"}
                </h3>
              </header>
              <div className="mt-4">{renderRecommendations(recommendations)}</div>
            </section>
          </section>
        ) : null}
      </PageContainer>
    </main>
  );
}

const STEP_META_BY_KEY: Partial<Record<HistoryAnswerKey, StepMeta>> = Object.values(STEP_META).reduce(
  (acc, meta) => {
    acc[meta.key as HistoryAnswerKey] = meta;
    return acc;
  },
  {} as Partial<Record<HistoryAnswerKey, StepMeta>>
);

const BACKEND_TO_FRONT_KEY: Record<string, HistoryAnswerKey> = {
  main_concern: "primaryConcern",
  secondary_concern: "secondaryConcern",
  eye_concern: "eyeConcern",
  skin_type: "skinType",
  sensitivity: "sensitivity",
  pregnant_or_breastfeeding: "pregnancy",
  budget_preference: "budget",
};

type HistoryAnswerKey =
  | "primaryConcern"
  | "secondaryConcern"
  | "eyeConcern"
  | "skinType"
  | "sensitivity"
  | "pregnancy"
  | "budget";

type HistoryAnswerLabels = Record<HistoryAnswerKey, string | null>;

function buildAnswerLabels(detail: QuizHistoryDetail): HistoryAnswerLabels {
  const labels: HistoryAnswerLabels = {
    primaryConcern: null,
    secondaryConcern: null,
    eyeConcern: null,
    skinType: null,
    sensitivity: null,
    pregnancy: null,
    budget: null,
  };

  const apply = (key: HistoryAnswerKey, value: string | null) => {
    labels[key] = lookupChoiceLabel(key, value);
  };

  Object.entries(detail.answerSnapshot ?? {}).forEach(([key, value]) => {
    const front = BACKEND_TO_FRONT_KEY[key];
    if (!front) return;
    if (Array.isArray(value)) {
      apply(front, value.length ? String(value[0]) : null);
    } else if (typeof value === "boolean") {
      apply(front, value ? "yes" : "no");
    } else if (typeof value === "number") {
      apply(front, String(value));
    } else if (typeof value === "string") {
      apply(front, value);
    } else if (value === null || value === undefined) {
      apply(front, null);
    } else {
      apply(front, String(value));
    }
  });

  const profile = detail.profile;
  if (profile) {
    apply("primaryConcern", profile.primaryConcerns[0] ?? labels.primaryConcern);
    if (profile.secondaryConcerns.length) {
      apply("secondaryConcern", profile.secondaryConcerns[0]);
    }
    apply("eyeConcern", profile.eyeAreaConcerns[0] ?? labels.eyeConcern);
    apply("skinType", profile.skinType ?? labels.skinType);
    apply("sensitivity", profile.sensitivity ?? labels.sensitivity);
    if (profile.pregnantOrBreastfeeding !== null && profile.pregnantOrBreastfeeding !== undefined) {
      apply("pregnancy", profile.pregnantOrBreastfeeding ? "yes" : "no");
    }
    apply("budget", profile.budget ?? labels.budget);
  }

  return labels;
}

function buildProfileItems(profile: QuizProfile | null, answers: HistoryAnswerLabels) {
  const items: { label: string; value: string }[] = [];
  const append = (label: string, value: string | null) => {
    items.push({ label, value: value && value.trim() ? capitalizeLabel(value) : "Not provided" });
  };

  if (profile) {
    append("Primary concern", profile.primaryConcerns[0] ?? answers.primaryConcern);
    if (profile.secondaryConcerns.length || answers.secondaryConcern) {
      append("Secondary focus", profile.secondaryConcerns[0] ?? answers.secondaryConcern);
    }
    append("Eye area", profile.eyeAreaConcerns[0] ?? answers.eyeConcern);
    append("Skin type", profile.skinType ?? answers.skinType);
    append("Sensitivity", profile.sensitivity ?? answers.sensitivity);
    append("Pregnancy / breastfeeding", formatPregnancyLabel(profile.pregnantOrBreastfeeding ?? answers.pregnancy));
    append("Budget mindset", formatBudgetLabel(profile.budget ?? answers.budget));
    return items;
  }

  append("Primary concern", answers.primaryConcern);
  if (answers.secondaryConcern) {
    append("Secondary focus", answers.secondaryConcern);
  }
  append("Eye area", answers.eyeConcern);
  append("Skin type", answers.skinType);
  append("Sensitivity", answers.sensitivity);
  append("Pregnancy / breastfeeding", formatPregnancyLabel(answers.pregnancy));
  append("Budget mindset", formatBudgetLabel(answers.budget));
  return items;
}

function buildSummaryInsights(summary: QuizResultSummary) {
  const insights: string[] = [];

  if (summary.primaryConcerns.length) {
    const concerns = summary.primaryConcerns.join(" & ");
    insights.push(`Product matches double down on ${concerns.toLowerCase()} support.`);
  }

  const categories = summary.categoryBreakdown;
  if (categories && Object.keys(categories).length) {
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const [topCategory, total] = sorted[0];
    insights.push(
      `Expect a focus on ${capitalizeLabel(topCategory)} formulas (${total} hero pick${total === 1 ? "" : "s"}).`
    );
  }

  return insights;
}

function buildIngredientHighlights(
  summary: QuizResultSummary,
  lookFor: { ingredient: string; reason: string }[]
) {
  const highlights: { ingredient: string; reason: string }[] = [];
  (summary.topIngredients ?? []).forEach((ingredient) => {
    if (!ingredient) return;
    highlights.push({ ingredient, reason: MATCH_INGREDIENT_REASON });
  });
  lookFor.forEach((entry) => {
    if (!highlights.some((item) => item.ingredient === entry.ingredient)) {
      highlights.push(entry);
    }
  });
  return highlights.slice(0, 6);
}

function formatPregnancyLabel(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const cleaned = value.trim().toLowerCase();
    if (cleaned === "true" || cleaned === "yes") return "Yes";
    if (cleaned === "false" || cleaned === "no") return "No";
    return capitalizeLabel(value);
  }
  return "Not provided";
}

function formatBudgetLabel(value: string | null) {
  if (!value) return "Not provided";
  if (value === "mid") return "Mid-range";
  if (value === "premium") return "Premium / luxury";
  return capitalizeLabel(value);
}

function capitalizeLabel(text: string) {
  if (!text) return "";
  return text
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lookupChoiceLabel(key: HistoryAnswerKey, value: string | null) {
  if (!value) return null;
  const meta = STEP_META_BY_KEY[key];
  if (!meta) return capitalizeLabel(value);
  const match = meta.fallbackChoices.find(
    (choice) => choice.value === value || choice.label.toLowerCase() === value.toLowerCase()
  );
  if (match) return match.label;
  return capitalizeLabel(value);
}

function renderRecommendations(recommendations: QuizRecommendation[]) {
  if (!recommendations.length) {
    return (
      <p className="text-sm text-[#3C3D37] text-opacity-70">
        We&apos;re still analysing product data for your skin traits. Ingredient guidance above is ready to use today.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-left">
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
            className="flex h-full flex-col gap-3 rounded-3xl border-2 border-black bg-white p-5 shadow-[4px_6px_0_rgба(0,0,0,0.18)]"
          >
            {item.imageUrl ? (
              <div className="relative h-40 w-full overflow-hidden rounded-2xl border-2 border-black bg-white">
                <Image
                  src={item.imageUrl}
                  alt={`${brandLabel} ${item.productName}`}
                  fill
                  unoptimized
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 90vw, (max-width: 1024px) 40vw, 320px"
                />
              </div>
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-2xl border-2 border-dashed border-black/20 bg-[#f2ebff] text-xs font-semibold uppercase tracking-[0.2em] text-[#7a628c]">
                Product preview coming soon
              </div>
            )}
            <header className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B9375D]">{brandLabel}</p>
              <h4 className="text-lg font-bold text-[#1f2d26]">{item.productName}</h4>
              <p className="text-xs text-[#3C3D37] text-opacity-60">{capitalizeLabel(item.category)}</p>
            </header>
            <p className="text-sm text-[#3C3D37] text-opacity-75">
              Match score <span className="font-semibold text-[#3C3D37]">{item.score.toFixed(1)}</span>
              {priceLabel ? <> • {priceLabel}</> : null}
            </p>
              {item.ingredients.length > 0 && (
                <p className="text-xs text-[#3C3D37] text-opacity-70">
                Hero ingredients: {item.ingredients.slice(0, 3).join(", ")}
                {item.ingredients.length > 3 ? "…" : ""}
              </p>
            )}
            <footer className="mt-auto flex items-center justify-between text-xs text-[#3C3D37] text-opacity-60">
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
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-3 py-1.5 font-semibold text-[#B9375D] shadow-[0_3px_0_rgба(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:shadow-[0_5px_0_rgба(0,0,0,0.2)]"
                >
                  View product
                </a>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
