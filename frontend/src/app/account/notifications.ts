type UvLevel = "high" | "low" | null;

/**
 * Determine whether we should display an ultraviolet alert notification when the
 * latest reading comes in. Product requirement:
 *  - First visit with high UV -> notify
 *  - If previous reading was low and now high -> notify
 *  - All other transitions don't trigger (low->low, high->low, high->high)
 */
export function shouldNotifyHighUv(previousLevel: UvLevel, currentLevel: UvLevel): boolean {
  if (currentLevel !== "high") {
    return false;
  }

  // Notify on first high reading or when transitioning from low -> high
  return previousLevel !== "high";
}

/**
 * Notify the user that Personal Picks have fresh data when they finish another
 * quiz session (i.e., their completed quiz count increases).
 */
export function shouldNotifyPersonalPicksUpdate(
  previousQuizCount: number | null,
  currentQuizCount: number | null
): boolean {
  const prev = typeof previousQuizCount === "number" ? previousQuizCount : 0;
  const curr = typeof currentQuizCount === "number" ? currentQuizCount : 0;

  return curr > prev;
}
