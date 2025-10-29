"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { emailQuizSummary } from "@/lib/api.quiz";

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

  // email form state (used for "Email this summary" box)
  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

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

    // reset email status each time profileId changes
    setEmailStatus("idle");
    setEmailMessage(null);
    setEmailInput("");

    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const handleEmailSummary = useCallback(async () => {
    if (!detail?.sessionId) {
      setEmailStatus("error");
      setEmailMessage("We couldn't find this quiz session. Please refresh and try again.");
      return;
    }

    setEmailStatus("sending");
    setEmailMessage(null);
    try {
      const emailValue = emailInput.trim();
      await emailQuizSummary(detail.sessionId, emailValue || undefined);
      setEmailStatus("success");
      setEmailMessage(
        emailValue
          ? `Summary sent to ${emailValue}.`
          : "Summary sent to your account email."
      );
    } catch (err) {
      setEmailStatus("error");
      const message =
        err instanceof Error
          ? err.message
          : "Failed to email this summary. Please try again.";
      setEmailMessage(message);
    }
  }, [detail?.sessionId, emailInput]);

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
        {/* top nav row */}
        <div className="flex items-center justify-between">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#3C3D37] hover:underline"
          >
            ← Back to account
          </Link>
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
              <p className="mt-2 text-xs text-[#3C3D37] text-opacity-70">
                Return to your account page to pick another match.
              </p>
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
            {/* header / meta */}
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

              <p className="text-xs font-semibold text-[#3C3D37] text-opacity-50">
                Completed {completedLabel}
              </p>
            </header>

            {/* profile + strategy */}
            <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
              {/* skin profile card */}
              <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#f0f5ff] to-[#F5BABB] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
                <h3 className="text-lg font-bold text-[#3C3D37] mb-4">Your skin profile</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profileItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-black/30 bg-white/80 px-4 py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B95E82] text-opacity-70">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#3C3D37]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* strategy notes card */}
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

            {/* ingredients + caution + email */}
            <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
              {/* LEFT COLUMN: Ingredients to prioritise */}
              <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#A7E399] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
                <h3 className="text-lg font-bold text-[#33574a]">Ingredients to prioritise</h3>
                {ingredientHighlights.length ? (
                  <ul className="mt-4 space-y-3">
                    {ingredientHighlights.map((entry) => (
                      <li
                        key={entry.ingredient}
                        className="flex items-start gap-3 text-sm text-[#1f2d26]"
                      >
                        <span
                          className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#33574a]"
                          aria-hidden
                        />
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

              {/* RIGHT COLUMN: caution card + email card stacked */}
              <div className="space-y-6">
                {/* caution card */}
                <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#fffbde] to-[#ffaf6f] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
                  <h3 className="text-lg font-bold text-[#70410f]">Use with caution</h3>
                  {cautionItems.length ? (
                    <ul className="mt-4 space-y-3">
                      {cautionItems.map((entry) => (
                        <li
                          key={entry.ingredient}
                          className="flex items-start gap-3 text-sm text-[#5f3111]"
                        >
                          <span
                            className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#b45a1b]"
                            aria-hidden
                          />
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

                {/* email summary card */}
                <section className="rounded-3xl border-2 border-black bg-white/80 p-6 shadow-[6px_8px_0_rgba(0,0,0,0.18)] space-y-4 text-center">
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
                      disabled={emailStatus === "sending" || !detail?.sessionId}
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
                </section>
              </div>
            </div>

            {/* IMPROVED PRODUCT MATCHES SECTION */}
            <section className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#f0e7ff] p-8 shadow-[6px_8px_0_rgba(0,0,0,0.18)]">
              <header className="space-y-2 text-center mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7C6DB1]">Product matches</p>
                <h3 className="text-2xl font-extrabold text-[#3C3D37]">
                  {recommendations.length ? "Curated for your profile" : "Matches unavailable"}
                </h3>
              </header>
              <div>{renderRecommendations(recommendations)}</div>
            </section>
          </section>
        ) : null}
      </PageContainer>
    </main>
  );
}

const STEP_META_BY_KEY: Partial<Record<HistoryAnswerKey, StepMeta>> = Object.values(
  STEP_META
).reduce(
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
    if (
      profile.pregnantOrBreastfeeding !== null &&
      profile.pregnantOrBreastfeeding !== undefined
    ) {
      apply("pregnancy", profile.pregnantOrBreastfeeding ? "yes" : "no");
    }
    apply("budget", profile.budget ?? labels.budget);
  }

  return labels;
}

function buildProfileItems(profile: QuizProfile | null, answers: HistoryAnswerLabels) {
  const items: { label: string; value: string }[] = [];
  const append = (label: string, value: string | null) => {
    items.push({
      label,
      value: value && value.trim() ? capitalizeLabel(value) : "Not provided",
    });
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
      formatPregnancyLabel(
        profile.pregnantOrBreastfeeding ?? answers.pregnancy
      )
    );
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
    insights.push(
      `Product matches double down on ${concerns.toLowerCase()} support.`
    );
  }

  const categories = summary.categoryBreakdown;
  if (categories && Object.keys(categories).length) {
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const [topCategory, total] = sorted[0];
    insights.push(
      `Expect a focus on ${capitalizeLabel(topCategory)} formulas (${total} hero pick${
        total === 1 ? "" : "s"
      }).`
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
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function lookupChoiceLabel(key: HistoryAnswerKey, value: string | null) {
  if (!value) return null;
  const meta = STEP_META_BY_KEY[key];
  if (!meta) return capitalizeLabel(value);
  const match = meta.fallbackChoices.find(
    (choice) =>
      choice.value === value ||
      choice.label.toLowerCase() === value.toLowerCase()
  );
  if (match) return match.label;
  return capitalizeLabel(value);
}

function renderRecommendations(recommendations: QuizRecommendation[]) {
  if (!recommendations.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#3C3D37] text-opacity-70">
          We&apos;re still analysing product data for your skin traits. Ingredient guidance above is ready to use today.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            className="group relative flex h-full flex-col rounded-3xl border-2 border-black bg-white p-5 shadow-[4px_6px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:shadow-[6px_8px_0_rgba(0,0,0,0.25)]"
          >


            {/* Product Image - 1:1 Ratio, No Border */}
            {item.imageUrl ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#f8f8f8]">
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
              <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-[#f2ebff] text-xs font-bold uppercase tracking-[0.2em] text-[#7a628c]">
                Product preview<br />coming soon
              </div>
            )}

            {/* Product Info */}
            <div className="mt-4 flex flex-col gap-2 flex-grow">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B9375D]">{brandLabel}</p>
              <h4 className="text-base font-bold leading-snug text-[#1f2d26]">{item.productName}</h4>
              <p className="text-xs font-semibold text-[#3C3D37] text-opacity-60">{capitalizeLabel(item.category)}</p>
              
              {/* Match Score & Price */}
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full border border-black/20 bg-[#e8f5e9] px-2.5 py-1 text-xs font-bold text-[#2e7d32]">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {item.score.toFixed(1)}
                </span>
                {priceLabel && (
                  <span className="text-sm font-bold text-[#3C3D37]">{priceLabel}</span>
                )}
              </div>

              {/* Hero Ingredients */}
              {item.ingredients.length > 0 && (
                <p className="text-xs leading-relaxed text-[#3C3D37] text-opacity-70">
                  <span className="font-semibold text-[#3C3D37]">Hero ingredients:</span>{" "}
                  {item.ingredients.slice(0, 3).join(", ")}
                  {item.ingredients.length > 3 ? "..." : ""}
                </p>
              )}
            </div>

            {/* Footer - Rating & CTA */}
            <footer className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-4">
              <div className="flex items-center gap-1 text-xs text-[#3C3D37] text-opacity-60">
                {item.averageRating ? (
                  <>
                    <svg className="h-4 w-4 text-[#fbbf24]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-[#3C3D37]">
                      {item.averageRating.toFixed(1)}
                    </span>
                    <span>({item.reviewCount})</span>
                  </>
                ) : (
                  <span>No reviews yet</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Wishlist Heart Button */}
                <button
                  type="button"
                  aria-label="Add to wishlist"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ffebef] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                >
                  <svg className="h-4 w-4 text-[#B9375D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {item.productUrl && (
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold text-[#B9375D] shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                  >
                    View product
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
