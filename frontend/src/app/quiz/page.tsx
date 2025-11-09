// src/app/quiz/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import StepNavArrows from "./_StepNavArrows";
import { STEP_META, TOTAL_STEPS } from "./_config";
import { useQuizAnswer } from "./_QuizContext";
import type { QuizChoice } from "./_QuizContext";
import PageContainer from "@/components/PageContainer";

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
    <main className="min-h-screen bg-[#f8cc8c] pb-10 pt-38 sm:pt-32 sm:flex sm:items-center sm:justify-center sm:py-10">
      <PageContainer className="w-full max-w-3xl">
        <div className="relative w-full overflow-hidden rounded-[30px] border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] min-h-[620px] sm:min-h-[660px]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${STEP_ONE_META.gradientFrom}, ${STEP_ONE_META.gradientTo})`,
            }}
          />

          <div className="relative z-10 flex h-full flex-col gap-5 p-6 sm:p-10">

            <h1 className="text-center text-2xl sm:text-4xl font-extrabold text-gray-800 drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">
              {STEP_ONE_META.title}
            </h1>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-4 flex items-center justify-center">
              <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4 pb-2">
                {availableChoices.map((choice) => {
                  const selected = value === choice.label;
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleSelect(choice)}
                      className={[
                        "w-full min-h-[72px] rounded-2xl text-sm sm:text-base font-semibold",
                        "border-2 border-black shadow-[0_5px_0_rgba(0,0,0,0.35)]",
                        selected ? "text-black" : "bg-white text-black",
                        "transition-all duration-150 ease-out",
                        "hover:translate-y-[-1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.35)]",
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

            <div className="flex items-center justify-between gap-3 pt-2 text-xs font-semibold uppercase tracking-wide text-black/70 sm:text-sm">
              <span>Step 1 of {TOTAL_STEPS}</span>
              <div className="flex items-center gap-2">
                <StepNavArrows side="prev" current={1} />
                <StepNavArrows side="next" current={1} />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
