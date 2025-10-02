import type { Topic } from "@/lib/types";

export async function fetchPopularTopics(): Promise<Topic[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "1") {
    const { popularTopicsMock } = await import("@/mocks/facts.mock");
    await new Promise(r => setTimeout(r, 150)); // small delay for UI states
    return popularTopicsMock.slice(0, 5);
  }

  const base = process.env.NEXT_PUBLIC_API_BASE!;
  const res = await fetch(`${base}/facts/popular-topics`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load popular topics");
  return res.json();
}