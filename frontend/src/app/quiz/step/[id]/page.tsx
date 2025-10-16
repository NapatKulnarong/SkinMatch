// src/app/quiz/step/[id]/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StepNavArrows from "../../_StepNavArrows";
import { RESULT_LOADING_HREF, TOTAL_STEPS } from "../../_config";
import { QuizAnswerKey, useQuizAnswer } from "../../_QuizContext";

const OPTIONS_Q2 = [
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

const OPTIONS_Q3 = ["Dark circles", "Fine lines & wrinkles", "Puffiness", "None"];
const OPTIONS_Q4 = ["Normal", "Oily", "Dry", "Combination"];
const OPTIONS_Q5 = ["Yes", "Sometimes", "No"];
const OPTIONS_Q6 = ["Yes", "No"];
const OPTIONS_Q7 = ["Affordable", "Mid-range", "Premium / luxury"];

export default function QuizStepPage({ params }: { params: { id: string } }) {
  const step = useMemo(() => Number(params.id) || 2, [params.id]);

  return (
    <main className="min-h-screen bg-[#FFF6E9] flex items-center justify-center">
      <section className="w-full max-w-[1200px] px-4">
        {renderCardByStep(step)}
      </section>
    </main>
  );
}

function renderCardByStep(step: number) {
  switch (step) {
    case 2:
      return (
        <QuestionCard
          title="Do you have any secondary concerns?"
          options={OPTIONS_Q2}
          gradientFrom="#F4F6FF"
          gradientTo="#447D9B"
          accent="#6391ab"
          gridCols="sm:grid-cols-2 lg:grid-cols-3"
          current={step}
          answerKey="secondaryConcern"
        />
      );
    case 3:
      return (
        <QuestionCard
          title="Do you have any eye area concerns?"
          options={OPTIONS_Q3}
          gradientFrom="#F2F8FF"
          gradientTo="#568F87"
          accent="#79a7a2"
          gridCols="grid-cols-2"
          current={step}
          answerKey="eyeConcern"
        />
      );
    case 4:
      return (
        <QuestionCard
          title="Which best describes your skin type?"
          options={OPTIONS_Q4}
          gradientFrom="#EAFBF6"
          gradientTo="#73946B"
          accent="#8caa88"
          gridCols="grid-cols-2"
          current={step}
          answerKey="skinType"
        />
      );
    case 5:
      return (
        <QuestionCard
          title="Is your skin sensitive?"
          options={OPTIONS_Q5}
          gradientFrom="#F3F9EA"
          gradientTo="#DDA853"
          accent="#e3bd7b"
          gridCols="grid-cols-1 sm:grid-cols-3"
          current={step}
          answerKey="sensitivity"
        />
      );
    case 6:
      return (
        <QuestionCard
          title="Are you pregnant or breastfeeding?"
          options={OPTIONS_Q6}
          gradientFrom="#FFF6D5"
          gradientTo="#F08B51"
          accent="#f5ac79"
          gridCols="grid-cols-1 sm:grid-cols-2"
          current={step}
          answerKey="pregnancy"
        />
      );
    case 7:
      return (
        <QuestionCard
          title="What’s your budget preference?"
          options={OPTIONS_Q7}
          gradientFrom="#FFE5E9"
          gradientTo="#B9375D"
          accent="#cf708b"
          gridCols="grid-cols-1 sm:grid-cols-3"
          current={step}
          answerKey="budget"
        />
      );
    default:
      return <PlaceholderCard current={step} />;
  }
}

type QuestionCardProps = {
  title: string;
  options: string[];
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  gridCols: string;
  current: number;
  answerKey: QuizAnswerKey;
};

function QuestionCard(props: QuestionCardProps) {
  const { title, options, gradientFrom, gradientTo, accent, gridCols, current, answerKey } = props;
  const router = useRouter();
  const { value, setValue } = useQuizAnswer(answerKey);

  const isFinalStep = current >= TOTAL_STEPS;
  const nextHref = isFinalStep ? RESULT_LOADING_HREF : `/quiz/step/${current + 1}`;

  const handleSelect = (opt: string) => {
    setValue(opt);
    if (!isFinalStep) setTimeout(() => router.push(nextHref), 160);
  };

  return (
    <div className="relative rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})` }}
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
          {title}
        </h1>

        <div className="flex-1 flex items-center justify-center">
          <div className={`grid gap-4 ${gridCols} place-items-center`}>
            {options.map((opt) => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={[
                    "w-full sm:min-w-[280px] px-6 py-5 rounded-full text-lg font-semibold",
                    "border-2 border-black shadow-[0_6px_0_rgba(0,0,0,0.35)]",
                    selected ? "text-black" : "bg-white text-black",
                    "transition-all duration-150 ease-out",
                    "hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]",
                    "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]",
                  ].join(" ")}
                  style={selected ? { backgroundColor: accent } : undefined}
                  aria-pressed={selected}
                >
                  {opt}
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
