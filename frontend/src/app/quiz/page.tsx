// src/app/quiz/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import StepNavArrows from "./_StepNavArrows";
import { STEP_META, TOTAL_STEPS } from "./_config";
import { useQuizAnswer } from "./_QuizContext";
import type { QuizChoice } from "./_QuizContext";

const STEP_ONE_META = STEP_META[1];
const STEP_ONE_FALLBACK_CHOICES: QuizChoice[] = STEP_ONE_META.fallbackChoices.map(
  (choice, index) => ({
    id: `${choice.value}-${index}`,
    label: choice.label,
    value: choice.value,
    order: index + 1,
  })
);

export default function QuizPage() {
  const router = useRouter();
  const { value, setValue, choices } = useQuizAnswer(STEP_ONE_META.key);

  const availableChoices = useMemo<QuizChoice[]>(() => {
    return choices.length ? choices : STEP_ONE_FALLBACK_CHOICES;
  }, [choices]);

  const handleSelect = (choice: QuizChoice) => {
    setValue(choice.label);
    setTimeout(() => router.push("/quiz/step/2"), 160);
  };

  return (
    <main className="min-h-screen bg-[#f8cc8c] flex items-center justify-center">
      <section className="w-full max-w-[1200px] px-4">
        <div
          className="
            relative rounded-3xl border-2 border-black
            shadow-[6px_8px_0_rgba(0,0,0,0.35)] overflow-hidden
          "
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${STEP_ONE_META.gradientFrom}, ${STEP_ONE_META.gradientTo})`,
            }}
          />

          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-20">
            <div className="pointer-events-auto">
              <StepNavArrows side="prev" current={1} />
            </div>
            <div className="pointer-events-auto">
              <StepNavArrows side="next" current={1} />
            </div>
          </div>

          <div className="relative z-10 flex flex-col p-8 sm:p-10 h-[80vh] max-h-[700px]">
            <h1 className="mt-6 text-center text-2xl sm:text-4xl font-extrabold text-gray-800 drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">
              {STEP_ONE_META.title}
            </h1>

            <div className="flex-1 flex items-center justify-center">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 place-items-center">
                {availableChoices.map((choice) => {
                  const selected = value === choice.label;
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleSelect(choice)}
                      className={[
                        "w-full sm:min-w-[280px] px-6 py-5 rounded-full text-lg font-semibold",
                        "border-2 border-black shadow-[0_6px_0_rgba(0,0,0,0.35)]",
                        selected ? "text-black" : "bg-white text-black",
                        "transition-all duration-150 ease-out",
                        "hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]",
                        "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]",
                      ].join(" ")}
                      style={selected ? { backgroundColor: STEP_ONE_META.accent } : undefined}
                      aria-pressed={selected}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto flex items-center justify-center gap-2 pb-1">
              <span
                className="inline-block h-2 w-2 rounded-full bg-white"
                aria-label="Step 1 (current)"
              />
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
