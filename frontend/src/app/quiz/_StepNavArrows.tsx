"use client";

import Link from "next/link";
import { useMemo } from "react";
import { RESULT_LOADING_HREF, TOTAL_STEPS } from "./_config";

type Props = {
  /** step you are currently on (1..TOTAL_STEPS) */
  current: number;
  /** which arrow to render */
  side: "prev" | "next";
  disabled?: boolean;
};

export default function StepNavArrows({ current, side, disabled = false }: Props) {
  const isPrev = side === "prev";

  // compute target hrefs
  const prevHref = useMemo(
    () => (current <= 2 ? "/quiz" : `/quiz/step/${current - 1}`),
    [current]
  );
  const nextHref = useMemo(() => {
    if (current >= TOTAL_STEPS) return RESULT_LOADING_HREF;
    return `/quiz/step/${current + 1}`;
  }, [current]);

  const href = isPrev ? prevHref : nextHref;

  const baseClass = `
    grid place-items-center h-12 w-12 rounded-full border-2 border-black
    shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all select-none
  `;

  if (disabled) {
    return (
      <span className={`${baseClass} bg-white/30 text-black/40 pointer-events-none`} aria-hidden>
        <span className="text-2xl leading-none">{isPrev ? "‹" : "›"}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={isPrev ? "Previous question" : "Next question"}
      className={`${baseClass} bg-white/40 hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]`}
    >
      {/* simple chevrons; swap for your icons if you want */}
      <span className="text-2xl leading-none text-black">
        {isPrev ? "‹" : "›"}
      </span>
    </Link>
  );
}
