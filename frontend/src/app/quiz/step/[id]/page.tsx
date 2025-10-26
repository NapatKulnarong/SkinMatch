// src/app/quiz/step/[id]/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StepNavArrows from "../../_StepNavArrows";
import { RESULT_LOADING_HREF, TOTAL_STEPS, getStepMeta, type StepMeta } from "../../_config";
import { useQuizAnswer } from "../../_QuizContext";
import type { QuizChoice } from "../../_QuizContext";

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
    <main className="min-h-screen bg-[#f8cc8c] flex items-center justify-center">
      <section className="w-full max-w-[1200px] px-4">
        {meta ? <QuestionCard meta={meta} current={step} /> : <PlaceholderCard current={step} />}
      </section>
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
    <div className="relative rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${meta.gradientFrom}, ${meta.gradientTo})`,
        }}
      />

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-20">
        <div className="pointer-events-auto">
          <StepNavArrows side="prev" current={current} />
        </div>
        <div className="pointer-events-auto">
          <StepNavArrows side="next" current={current} disabled={isFinalStep} />
        </div>
      </div>

      <div className="relative z-10 flex flex-col p-8 sm:p-10 h-[80vh] max-h-[700px]">
        <h1 className="mt-6 text-center text-2xl sm:text-4xl font-extrabold text-gray-800 drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">
          {meta.title}
        </h1>

        <div className="flex-1 flex items-center justify-center">
          <div className={`grid gap-4 ${meta.gridCols} place-items-center`}>
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
          <div className="mt-8 flex justify-end pr-2 sm:pr-4">
            <button
              type="button"
              onClick={() => value && router.push(nextHref)}
              disabled={!value}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-2 text-base font-semibold text-gray-900 shadow-[0_6px_0_rgba(0,0,0,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60 hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]"
            >
              {value ? "Get your match" : "Select an option"}
              <span aria-hidden>→</span>
            </button>
          </div>
        )}

        <Dots current={current} />
      </div>
    </div>
  );
}

function PlaceholderCard({ current }: { current: number }) {
  return (
    <div className="relative rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] overflow-hidden">
      <div className="absolute inset-0 bg-black" />
      <div className="relative z-10 p-8 sm:p-10 h-[80vh] max-h-[700px] text-center text-white flex flex-col">
        <h2 className="mt-6 text-xl sm:text-2xl opacity-70">Step {current} (placeholder)</h2>
        <div className="flex-1" />
        <Dots current={current} />
      </div>
    </div>
  );
}

function Dots({ current }: { current: number }) {
  return (
    <div className="mt-auto flex items-center justify-center gap-2 pb-1">
      <Link
        href="/quiz"
        className={[
          "inline-block h-2 w-2 rounded-full",
          current === 1 ? "bg-white" : "bg-white/50 hover:bg-white",
        ].join(" ")}
        aria-label="Go to step 1"
      />
      {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => {
        const idx = i + 2;
        return (
          <Link
            key={idx}
            href={`/quiz/step/${idx}`}
            className={[
              "inline-block h-2 w-2 rounded-full transition-colors",
              current === idx ? "bg-white" : "bg-white/50 hover:bg-white",
            ].join(" ")}
            aria-label={`Go to step ${idx}`}
          />
        );
      })}
    </div>
  );
}
