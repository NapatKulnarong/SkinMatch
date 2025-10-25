// src/app/quiz/result/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildGuidance } from "./_guidance";
import { useQuiz } from "../_QuizContext";
import { useNavWidth } from "@/components/NavWidthContext";

export default function QuizResultPage() {
  const router = useRouter();
  const { answers, resetQuiz, isComplete } = useQuiz();
  const navWidth = useNavWidth();
  const maxWidth = navWidth ? `${navWidth}px` : "1200px";
  const sectionStyle = { maxWidth };
  const fallbackStyle = { maxWidth: navWidth ? `${navWidth}px` : "720px" };

  if (!answers.primaryConcern) {
    return (
      <main className="min-h-screen bg-[#f8cc8c] flex items-center justify-center">
        <section className="mx-auto w-full px-6 text-center space-y-6" style={fallbackStyle}>
          <h1 className="text-3xl font-extrabold text-[#3C3D37]">Let&apos;s build your skin profile</h1>
          <p className="text-base text-[#3C3D37]/80">
            We couldn&apos;t find your latest quiz answers. Please retake the quick quiz so we can summarise your
            skin profile and ingredient roadmap.
          </p>
          <Link
            href="/quiz"
            onClick={() => resetQuiz()}
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-[0_6px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]"
          >
            Retake the quiz
            <span aria-hidden>→</span>
          </Link>
        </section>
      </main>
    );
  }

  const guidance = buildGuidance(answers);

  const profileItems = [
    { label: "Primary concern", value: answers.primaryConcern },
    answers.secondaryConcern
      ? { label: "Secondary focus", value: answers.secondaryConcern }
      : null,
    { label: "Eye area", value: answers.eyeConcern ?? "Not provided" },
    { label: "Skin type", value: answers.skinType ?? "Not provided" },
    { label: "Sensitivity", value: answers.sensitivity ?? "Not provided" },
    { label: "Pregnancy / breastfeeding", value: answers.pregnancy ?? "Not provided" },
    { label: "Budget mindset", value: answers.budget ?? "Not provided" },
  ].filter(Boolean) as { label: string; value: string }[];

  const handleRetake = () => {
    resetQuiz();
    router.push("/quiz");
  };

  return (
    <main className="min-h-screen bg-[#FFF6E9] flex items-start justify-center pt-36 pb-20">
      <section className="mx-auto w-full px-32 space-y-12" style={sectionStyle}>
        <header className="text-center space-y-4">
          <p className="uppercase tracking-[0.3em] text-xs font-semibold text-[#B9375D]">
            Your Skin Match Snapshot
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3C3D37] drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]">
            Personalised routine roadmap
          </h1>
          <p className="text-base sm:text-lg text-[#3C3D37]/80 max-w-2xl mx-auto">
            Here&apos;s a snapshot of your skin profile — plus which ingredients to love and which to skip while we
            fine-tune your personalised matcher.
          </p>
        </header>

        {/* Grid layout with product matches spanning both columns */}
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          {/* Left column: Profile and Ingredients */}
          <section className="space-y-8">
            {/* Your skin profile */}
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

            {/* Ingredients to prioritise */}
            <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#A7E399] p-8 shadow-[6px_8px_0_rgba(0,0,0,0.25)] space-y-6">
              <h2 className="text-2xl font-bold text-[#33574a]">Ingredients to prioritise</h2>
              <ul className="space-y-4">
                {guidance.lookFor.map((item) => (
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

          {/* Right column: Strategy notes, Use with caution, then tweak/retake */}
          <aside className="space-y-8">
            {/* Strategy notes */}
            <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#A3CCDA] p-7 shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
              <h2 className="text-xl font-bold text-[#1b2a50]">Strategy notes</h2>
              <ul className="mt-4 space-y-4">
                {guidance.insights.map((insight) => (
                  <li key={insight} className="text-sm text-[#1b2a50]/80 font-medium leading-relaxed">
                    {insight}
                  </li>
                ))}
              </ul>
              {!guidance.insights.length && (
                <p className="text-sm text-[#1b2a50]/70">
                  Keep routines gentle and consistent—your skin will reward the steady care.
                </p>
              )}
            </div>

            {/* Use with caution */}
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

            {/* Tweak answers / Retake quiz */}
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

          {/* Product matches spanning both columns */}
          <div className="rounded-3xl border-2 border-dashed border-black/40 bg-white/70 p-7 shadow-[6px_8px_0_rgba(0,0,0,0.1)] text-center space-y-3 lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#3C3D37]/60">
              Product matches
            </p>
            <h3 className="text-lg font-bold text-[#3C3D37]">Coming soon</h3>
            <p className="text-sm text-[#3C3D37]/70">
              Our AI matcher is still training on product formulas. When it’s ready, this space will hold routines tailored to your answers.
            </p>
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