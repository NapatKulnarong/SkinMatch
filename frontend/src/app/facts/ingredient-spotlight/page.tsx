import Image from "next/image";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

export const metadata = {
  title: "Ingredient Spotlight Library • SkinMatch",
  description: "Browse every Ingredient Spotlight deep dive curated by the SkinMatch team.",
};

async function loadTopics(): Promise<FactTopicSummary[]> {
  try {
    return await fetchTopicsBySection("ingredient_spotlight", 60);
  } catch (error) {
    console.error("Failed to load ingredient spotlight archive", error);
    return [];
  }
}

export default async function IngredientSpotlightArchivePage() {
  const topics = await loadTopics();

  return (
    <main className="min-h-screen bg-[#d2eec8]">
      <PageContainer className="pb-16 pt-37 space-y-10">
        <header className="mt-8 sm:mt-0 flex flex-col gap-4 rounded-[32px] border-2 border-dashed border-black bg-white/70 p-6 shadow-[4px_6px_0_rgba(0,0,0,0.2)] sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#3c4c3f]/70">
              Ingredient Spotlight
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#0f1f17] sm:text-4xl">
              All ingredient deep dives
            </h1>
            <p className="mt-3 text-[#0f1f17]/75 sm:text-lg">
              Explore every active our community loves — from barrier-supporting classics to buzzy new launches.
            </p>
          </div>

          <Link
            href="/facts"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-[#f5f5ff] px-5 py-2 font-semibold text-[#0f1f17] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]"
          >
            ← Back to Skin Facts
          </Link>
        </header>

        {topics.length ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => {
              const image = topic.heroImageUrl ?? "/img/facts_img/serum_texture.jpg";
              const description = topic.subtitle || topic.excerpt || "Discover the routine benefits, pairings, and notes.";

              return (
                <Link
                  key={topic.slug}
                  href={`/facts/${topic.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[28px] border-2 border-black bg-white shadow-none sm:shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-1.5"
                >
                  <div className="relative h-40 w-full overflow-hidden sm:h-56">
                    <Image
                      src={image}
                      alt={topic.heroImageAlt ?? topic.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-4 text-[#0f1f17] sm:p-5">
                    <div className="space-y-2">
                      <h2 className="text-base font-bold leading-tight sm:text-xl">{topic.title}</h2>
                      <p className="text-xs text-[#0f1f17]/75 line-clamp-3 sm:text-sm">{description}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      Read deep dive <span aria-hidden>↗</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-[28px] border-2 border-dashed border-black bg-white/70 p-10 text-center text-[#0f1f17] shadow-[4px_4px_0_rgba(0,0,0,0.35)]">
            We couldn&apos;t load Ingredient Spotlight topics right now. Please try again later.
          </div>
        )}
      </PageContainer>
    </main>
  );
}
