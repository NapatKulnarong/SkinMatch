// src/app/quiz/result/loading/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TOTAL_STEPS } from "../../_config";
import StepNavArrows from "../../_StepNavArrows";
import { useQuiz } from "../../_QuizContext";

const tips = [
  "Reading your answers to understand your skin goals",
  "Matching ingredients that support your concerns",
  "Pulling product favorites from the Skin Match library",
];

export default function QuizLoadingPage() {
  const router = useRouter();
  const { answers, finalize } = useQuiz();
  const hasDetails = Boolean(answers.primaryConcern?.label);

  useEffect(() => {
    if (!hasDetails) {
      router.replace("/quiz");
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        router.replace("/quiz/result");
      }
    }, 1400);

    finalize()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          router.replace("/quiz/result");
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [finalize, router, hasDetails]);

  return (
    <main className="min-h-screen bg-[#f8cc8c] flex items-center justify-center">
      <section className="w-full max-w-[1200px] px-4">
        <div className="relative rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#D9CAB3] to-[#C5A880]" />

          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-20">
            <div className="pointer-events-auto">
              <StepNavArrows side="prev" current={TOTAL_STEPS + 1} />
            </div>
            <div className="h-12 w-12" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center gap-8 p-10 sm:p-12 h-[80vh] max-h-[700px] text-center">
            <div className="relative h-24 w-24">
              <div className="absolute inset-4 rounded-full border-[5px] border-[#3C3D37]/40" />
              <div className="absolute inset-4 rounded-full border-[5px] border-[#3C3D37] border-t-transparent animate-spin" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3C3D37] drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
                Crafting your Skin Match plan…
              </h1>
              <p className="max-w-xl font-semibold text-[#3C3D37] text-base sm:text-lg mx-auto">
                Hang tight! This might take a few seconds.
              </p>
            </div>

            <ul className="space-y-2 font-medium text-[#3C3D37] text-sm sm:text-base">
              {tips.map((tip) => (
                <li key={tip} className="flex items-center justify-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3C3D37]/70" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
