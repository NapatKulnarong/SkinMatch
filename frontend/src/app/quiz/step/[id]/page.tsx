// src/app/quiz/step/[id]/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StepNavArrows from "../../_StepNavArrows";
import { TOTAL_STEPS } from "../../_config";

/* -------------------- Options per step -------------------- */
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

// ❌ Removed the old “ingredient restrictions” (was step 7)

// Budget becomes the new step 7
const OPTIONS_Q7 = ["Affordable", "Mid-range", "Premium / luxury"];

/* -------------------- Page -------------------- */
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

/* -------------------- Step switcher -------------------- */
function renderCardByStep(step: number) {
  switch (step) {
    case 2:
      return (
        <QuestionCard
          title="Do you have any secondary concerns?"
          options={OPTIONS_Q2}
          gradientFrom="#F4F6FF"
          gradientTo="#447D9B"
          accent="#7879aa"
          gridCols="sm:grid-cols-2 lg:grid-cols-3"
          current={step}
        />
      );

    case 3:
      return (
        <QuestionCard
          title="Do you have any eye area concerns?"
          options={OPTIONS_Q3}
          gradientFrom="#F2F8FF"
          gradientTo="#568F87"
          accent="#5288A5"
          gridCols="grid-cols-2"
          current={step}
        />
      );

    case 4:
      return (
        <QuestionCard
          title="Which best describes your skin type?"
          options={OPTIONS_Q4}
          gradientFrom="#EAFBF6"
          gradientTo="#73946B"
          accent="#64A19D"
          gridCols="grid-cols-2"
          current={step}
        />
      );

    case 5:
      return (
        <QuestionCard
          title="Is your skin sensitive?"
          options={OPTIONS_Q5}
          gradientFrom="#F3F9EA"
          gradientTo="#DDA853"
          accent="#8CB183"
          gridCols="grid-cols-1 sm:grid-cols-3"
          current={step}
        />
      );

    case 6:
      return (
        <QuestionCard
          title="Are you pregnant or breastfeeding?"
          options={OPTIONS_Q6}
          gradientFrom="#FFF6D5"
          gradientTo="#F08B51"
          accent="#E3BF6C"
          gridCols="grid-cols-1 sm:grid-cols-2"
          current={step}
        />
      );

    // ✅ New step 7 = Budget
    case 7:
      return (
        <QuestionCard
          title="What’s your budget preference?"
          options={OPTIONS_Q7}
          gradientFrom="#FFE5E9"
          gradientTo="#B9375D"
          accent="#BE3F62"
          gridCols="grid-cols-1 sm:grid-cols-3"
          current={step}
        />
      );

    default:
      return <PlaceholderCard current={step} />;
  }
}

/* -------------------- Reusable Cards -------------------- */
function QuestionCard(props: {
  title: string;
  options: string[];
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  gridCols: string;
  current: number;
}) {
  const { title, options, gradientFrom, gradientTo, accent, gridCols, current } = props;
  const [value, setValue] = useState<string | null>(null);
  const router = useRouter();

  // Uses TOTAL_STEPS (set this to 7 in ../../_config)
  const nextHref =
    current >= TOTAL_STEPS ? `/quiz/step/${TOTAL_STEPS}` : `/quiz/step/${current + 1}`;

  const handleSelect = (opt: string) => {
    setValue(opt);
    setTimeout(() => router.push(nextHref), 160);
  };

  return (
    <div className="relative rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] overflow-hidden">
      {/* FULL-BLEED GRADIENT LAYER */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})` }}
      />

      {/* ARROWS */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-20">
        <div className="pointer-events-auto">
          <StepNavArrows side="prev" current={current} />
        </div>
        <div className="pointer-events-auto">
          <StepNavArrows side="next" current={current} />
        </div>
      </div>

      {/* CONTENT */}
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

/* -------------------- Dots (navigation) -------------------- */
function Dots({ current }: { current: number }) {
  return (
    <div className="mt-auto flex items-center justify-center gap-2 pb-1">
      {/* First dot goes to /quiz (Q1) */}
      <Link
        href="/quiz"
        className={[
          "inline-block h-2 w-2 rounded-full",
          current === 1 ? "bg-white" : "bg-white/50 hover:bg-white",
        ].join(" ")}
        aria-label="Go to step 1"
      />
      {/* Dots 2..TOTAL_STEPS */}
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