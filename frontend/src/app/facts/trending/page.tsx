import Image from "next/image";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

export const metadata = {
  title: "Trending Skincare Library • SkinMatch",
  description: "Catch up on every editor-reviewed launch and ingredient making noise in Thailand.",
};

async function loadTopics(): Promise<FactTopicSummary[]> {
  try {
    return await fetchTopicsBySection("trending", 60);
  } catch (error) {
    console.error("Failed to load trending archive", error);
    return [];
  }
}

export default async function TrendingArchivePage() {
  const topics = await loadTopics();

  return (
    <main className="min-h-screen bg-[#ece5ff]">
      <PageContainer className="pb-16 pt-37">
        <header className="flex flex-col gap-4 rounded-[32px] border-2 border-dashed border-black bg-white/80 p-6 shadow-[4px_6px_0_rgba(0,0,0,0.2)] sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#3c4c3f]/70">
              Trending skincare
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#1a2130] sm:text-4xl">
              All viral routines & launches
            </h1>
            <p className="mt-3 text-[#1a2130]/75 sm:text-lg">
              Swipe through every product, treatment, and routine the SkinMatch team has spotlighted recently.
            </p>
          </div>

          <Link
            href="/facts"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-[#ece5ff] px-5 py-2 font-semibold text-[#1a2130] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]"
          >
            ← Back to Skin Facts
          </Link>
        </header>

        {topics.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic, index) => {
              const image = topic.heroImageUrl ?? "/img/facts_img/centella_ampoule.jpg";
              const description = topic.subtitle || topic.excerpt || "See why it's trending.";
              const hypeScore = (topic.viewCount ?? 0) + (index + 1) * 128;

              return (
                <Link
                  key={topic.slug}
                  href={`/facts/${topic.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[28px] border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-1.5"
                >
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image
                      src={image}
                      alt={topic.heroImageAlt ?? topic.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-5 text-[#1a2130]">
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold leading-tight">{topic.title}</h2>
                      <p className="text-sm text-[#1a2130]/75 line-clamp-3">{description}</p>
                    </div>
                    <div className="space-y-1 text-xs uppercase tracking-[0.3em] text-[#1a2130]/60">
                      <p>{new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads</p>
                      <p>Hype score {new Intl.NumberFormat().format(hypeScore)}</p>
                      <p>Social buzz ↑</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      Read the trend <span aria-hidden>↗</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-[28px] border-2 border-dashed border-black bg-white/70 p-10 text-center text-[#1a2130] shadow-[4px_4px_0_rgba(0,0,0,0.35)]">
            We couldn&apos;t load Trending topics right now. Please try again later.
          </div>
        )}
      </PageContainer>
    </main>
  );
}
