// src/lib/api.ts
import { resolveApiBase } from "./apiBase";

export async function fetchHomepage() {
  // while backend isn't ready, this flag is 1 (use mock)
  if (process.env.NEXT_PUBLIC_USE_MOCK === "1") {
    const { homepageMock } = await import("../mocks/homepage.mock");
    // simulate a small delay so you can see loading states later if you add them
    await new Promise((r) => setTimeout(r, 150));
    return homepageMock;
  }

  // when backend is ready, flip NEXT_PUBLIC_USE_MOCK=0 and this will run:
  const res = await fetch(`${resolveApiBase()}/homepage`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load homepage");
  return res.json();
}
