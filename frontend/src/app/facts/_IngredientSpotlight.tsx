"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/serum_texture.jpg";
const PALETTE = [
  "from-[#e5f4ff] via-[#f0f9ff] to-white",
  "from-[#fef5ec] via-[#fff3f3] to-white",
  "from-[#eef9f1] via-[#f4fff6] to-white",
  "from-[#f5f5ff] via-[#f0f0ff] to-white",
];

type IngredientSpotlightProps = {
  sectionId?: string;
};

export default function IngredientSpotlight({ sectionId }: IngredientSpotlightProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchTopicsBySection("ingredient_spotlight", 10)
      .then((data) => {
        if (!active) return;
        setTopics(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load ingredient spotlight", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const spotlight = useMemo(() => topics.slice(0, 8), [topics]);
  const displayed = spotlight;

  return (
    <PageContainer as="section" id={sectionId} className="pt-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-[#0f1f17] md:text-4xl">Ingredient Spotlight</h2>
          <p className="mt-2 text-[#0f1f17]/70 md:text-lg">
            Swipe through the actives our community can’t stop talking about.
          </p>
        </div>
        <div className="flex gap-2 text-xs uppercase tracking-[0.32em] text-[#3c4c3f]/70">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#3c4c3f]/30 bg-white/60 px-3 py-1 font-semibold">
            Ingredients that work
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#3c4c3f]/30 bg-white/60 px-3 py-1 font-semibold">
            Good match, good result
            </span>
          </div>
      </div>

      <div className="overflow-hidden">
        <div className="pt-1 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {loading && spotlight.length === 0
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-[220px] min-w-[240px] rounded-[24px] border-2 border-black bg-white/60 shadow-[4px_6px_0_rgba(0,0,0,0.2)] animate-pulse"
                  />
                ))
              : displayed.map((topic, index) => {
                  const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
                  const description = topic.subtitle || topic.excerpt || "Daily-deep dive";
                  const palette = PALETTE[index % PALETTE.length];

                  return (
                  <article
                    key={topic.slug}
                    className={`relative min-w-[260px] snap-start overflow-hidden rounded-[26px] border-2 border-black bg-gradient-to-br ${palette} shadow-[6px_8px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1`}
                  >
                    <Link href={`/facts/${topic.slug}`} className="flex h-full flex-col">
                      <div className="relative h-36 overflow-hidden">
                        <Image
                          src={image}
                          alt={topic.heroImageAlt ?? topic.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 60vw, 320px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-4 p-4 text-[#0f1f17]">
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold leading-tight">{topic.title}</h3>
                          <p className="text-sm leading-relaxed text-[#0f1f17]/70 line-clamp-2">
                            {description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {buildTagHints(description).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full border border-[#0f1f17]/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
        </div>
      </div>
    </PageContainer>
  );
}

function buildTagHints(source: string): string[] {
  const keywords = source
    .split(/[,.]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const tags = keywords.slice(0, 2).map((text) => text.split(" ")[0]?.toLowerCase() ?? "care");
  if (!tags.length) {
    tags.push("skin");
  }
  return tags.slice(0, 3);
}
