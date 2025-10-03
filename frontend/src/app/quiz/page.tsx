// src/app/quiz/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StepNavArrows from "./_StepNavArrows";
import { TOTAL_STEPS } from "./_config";

const OPTIONS = [
  "Acne & breakouts",
  "Fine lines & wrinkles",
  "Uneven skin texture",
  "Blackheads",
  "Hyperpigmentation",
  "Acne scars",
  "Dull skin",
  "Damaged skin barrier",
  "Redness",
  "Excess oil",
  "Dehydrated skin",
];

export default function QuizPage() {
  const [value, setValue] = useState<string | null>(null);
  const router = useRouter();

  const handleSelect = (opt: string) => {
    setValue(opt);
    // Tiny delay so the press animation is visible
    setTimeout(() => router.push("/quiz/step/2"), 160);
  };

  return (
    <main className="min-h-screen bg-[#FFF6E9] flex items-center justify-center">
      <section className="w-full max-w-[1200px] px-4">
        {/* Quiz Card */}
        <div
          className="
            relative rounded-3xl border-2 border-black
            shadow-[6px_8px_0_rgba(0,0,0,0.35)] overflow-hidden
          "
        >
          {/* FULL-BLEED GRADIENT LAYER */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#F7F5FB] to-[#B08BBB]" />

          {/* ARROWS: full-width layer, left + right */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-20">
            <div className="pointer-events-auto">
              <StepNavArrows side="prev" current={1} />
            </div>
            <div className="pointer-events-auto">
              <StepNavArrows side="next" current={1} />
            </div>
          </div>

          {/* CONTENT ABOVE THE GRADIENT */}
          <div className="relative z-10 flex flex-col p-8 sm:p-10 h-[80vh] max-h-[700px]">
            {/* Question */}
            <h1 className="mt-6 text-center text-2xl sm:text-4xl font-extrabold text-gray-800 drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">
              What is your main skincare concern?
            </h1>

            {/* Options (centered in the card) */}
            <div className="flex-1 flex items-center justify-center">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 place-items-center">
                {OPTIONS.map((opt) => {
                  const selected = value === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(opt)}
                      className={[
                        "w-full sm:min-w-[280px] px-6 py-5 rounded-full text-lg font-semibold",
                        "border-2 border-black shadow-[0_6px_0_rgba(0,0,0,0.35)]",
                        selected ? "bg-[#be9fc7] text-black" : "bg-white text-black",
                        "transition-all duration-150 ease-out",
                        "hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]",
                        "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]",
                      ].join(" ")}
                      aria-pressed={selected}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress dots (clickable for steps 2–TOTAL_STEPS) */}
            <div className="mt-auto flex items-center justify-center gap-2 pb-1">
              {/* Current step (1) – not clickable */}
              <span
                className="inline-block h-2 w-2 rounded-full bg-white"
                aria-label="Step 1 (current)"
              />
              {/* Steps 2..TOTAL_STEPS */}
              {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => {
                const idx = i + 2;
                return (
                  <Link
                    key={idx}
                    href={`/quiz/step/${idx}`}
                    aria-label={`Go to step ${idx}`}
                    className="inline-block h-2 w-2 rounded-full bg-white/50 hover:bg-white transition-colors"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
