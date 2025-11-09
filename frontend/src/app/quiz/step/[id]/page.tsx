// src/app/quiz/step/[id]/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import StepNavArrows from "../../_StepNavArrows";
import { RESULT_LOADING_HREF, TOTAL_STEPS, getStepMeta, type StepMeta } from "../../_config";
import { useQuizAnswer } from "../../_QuizContext";
import type { QuizChoice } from "../../_QuizContext";
import PageContainer from "@/components/PageContainer";

const buildFallbackChoices = (meta: StepMeta): QuizChoice[] =>
  meta.fallbackChoices.map((choice, index) => ({
    id: `${choice.value}-${index}`,
    label: choice.label,
    value: choice.value,
    order: index + 1,
  }));

export default function QuizStepPage({ params }: { params: { id: string } }) {
  const step = useMemo(() => {
    const parsed = Number(params.id);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return Math.min(parsed, TOTAL_STEPS);
  }, [params.id]);

  const meta = getStepMeta(step);

  return (
    <main className="min-h-screen bg-[#f8cc8c] pb-10 pt-38 sm:pt-32 sm:flex sm:items-center sm:justify-center sm:py-10">
      <PageContainer className="w-full max-w-3xl">
        {meta ? <QuestionCard meta={meta} current={step} /> : <PlaceholderCard current={step} />}
      </PageContainer>
    </main>
  );
}

type QuestionCardProps = {
  meta: StepMeta;
  current: number;
};

function QuestionCard({ meta, current }: QuestionCardProps) {
  const router = useRouter();
  const { value, setValue, choices } = useQuizAnswer(meta.key);

  const fallbackChoices = useMemo(() => buildFallbackChoices(meta), [meta]);
  const availableChoices = choices.length ? choices : fallbackChoices;

  const isFinalStep = current >= TOTAL_STEPS;
  const nextHref = isFinalStep ? RESULT_LOADING_HREF : `/quiz/step/${current + 1}`;

  const handleSelect = (choice: QuizChoice) => {
    setValue(choice.label);
    if (!isFinalStep) {
      setTimeout(() => router.push(nextHref), 160);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[30px] border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] h-[720px] sm:h-[756px]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${meta.gradientFrom}, ${meta.gradientTo})`,
        }}
      />

      <div className="relative z-10 flex h-full flex-col gap-5 p-6 sm:p-10">

        <h1 className="text-center text-2xl sm:text-4xl font-extrabold text-gray-800 drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">
          {meta.title}
        </h1>

        <div className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1 flex items-center justify-center">
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
                  style={selected ? { backgroundColor: meta.accent } : undefined}
                  aria-pressed={selected}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
        </div>

        {isFinalStep && (
          <div className="flex justify-end pr-1 sm:pr-4">
            <button
              type="button"
              onClick={() => value && router.push(nextHref)}
              disabled={!value}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-2 text-base font-semibold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60 hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]"
            >
              {value ? "Get your match" : "Select an option"}
              <span aria-hidden>→</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 text-xs font-semibold uppercase tracking-wide text-black/70 sm:text-sm">
          <span>
            Step {current} of {TOTAL_STEPS}
          </span>
          <div className="flex items-center gap-2">
            <StepNavArrows side="prev" current={current} />
            <StepNavArrows side="next" current={current} disabled={isFinalStep} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({ current }: { current: number }) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] min-h-[620px] sm:min-h-[660px]">
      <div className="absolute inset-0 bg-black" />
      <div className="relative z-10 flex h-full flex-col gap-6 p-6 sm:p-10 text-center text-white">
        <h2 className="mt-6 text-xl sm:text-2xl opacity-70">Step {current} (placeholder)</h2>
        <div className="min-h-0 flex-1" />
        <div className="flex items-center justify-between gap-3 pt-2 text-xs font-semibold uppercase tracking-wide">
          <span>Step {current} of {TOTAL_STEPS}</span>
          <div className="flex items-center gap-2">
            <StepNavArrows side="prev" current={current} />
            <StepNavArrows side="next" current={current} />
          </div>
        </div>
      </div>
    </div>
  );
}
