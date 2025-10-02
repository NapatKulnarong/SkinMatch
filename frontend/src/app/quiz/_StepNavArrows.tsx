"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TOTAL_STEPS } from "./_config";

type Props = {
  /** step you are currently on (1..TOTAL_STEPS) */
  current: number;
  /** which arrow to render */
  side: "prev" | "next";
};

export default function StepNavArrows({ current, side }: Props) {
  const isPrev = side === "prev";

  // compute target hrefs
  const prevHref = useMemo(
    () => (current <= 2 ? "/quiz" : `/quiz/step/${current - 1}`),
    [current]
  );
  const nextHref = useMemo(
    () =>
      current >= TOTAL_STEPS ? `/quiz/step/${TOTAL_STEPS}` : `/quiz/step/${current + 1}`,
    [current]
  );

  const href = isPrev ? prevHref : nextHref;

  return (
    <Link
      href={href}
      aria-label={isPrev ? "Previous question" : "Next question"}
      className="
        grid place-items-center h-12 w-12 rounded-full bg-white/40
        border-2 border-black shadow-[0_6px_0_rgba(0,0,0,0.35)]
        hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]
        active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]
        transition-all select-none
      "
    >
      {/* simple chevrons; swap for your icons if you want */}
      <span className="text-2xl leading-none text-black">
        {isPrev ? "‹" : "›"}
      </span>
    </Link>
  );
}