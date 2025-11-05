"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/green_tea.jpg";

type SkinKnowledgeProps = {
  sectionId?: string;
};

export default function SkinKnowledge({ sectionId }: SkinKnowledgeProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTopicsBySection("knowledge", 9)
      .then((data) => {
        if (!active) return;
        setTopics(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load Skin Knowledge topics", err);
        setError("We couldn't load Skin Knowledge topics right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleTopics = useMemo(() => {
    return showAll ? topics : topics.slice(0, 6);
  }, [topics, showAll]);

  const hasMore = topics.length > 6;

  const handleToggle = () => setShowAll((prev) => !prev);

  if (loading) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-56 rounded-[24px] border-2 border-black bg-white/40 shadow-[6px_8px_0_rgba(0,0,0,0.15)] animate-pulse"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-16">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error}
        </div>
      </PageContainer>
    );
  }

  if (!topics.length) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-16">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          No Skin Knowledge topics found yet.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer as="section" id={sectionId} className="pt-12">
      <div className="relative">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#122016]">
            Skin Knowledge
          </h2>
            <p className="mt-2 text-[#1f2d26]/70 md:text-lg">
            Hand-picked ingredient guides to help you build smarter routines.
          </p>
        </div>
          <div className="flex gap-2 text-xs uppercase tracking-[0.32em] text-[#3c4c3f]/70">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#3c4c3f]/30 bg-white/60 px-3 py-1 font-semibold">
              Updated weekly
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#3c4c3f]/30 bg-white/60 px-3 py-1 font-semibold">
              Evidence based
            </span>
          </div>
        </div>

        <div className="grid auto-rows-[1fr] gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTopics.map((topic) => {
            const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
            const description = topic.subtitle || topic.excerpt || "Read the full guide.";
            const isNew = topic.viewCount > 1000;

            return (
              <Link
                key={topic.slug}
                href={`/facts/${topic.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border-2 border-black bg-white shadow-[8px_10px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-1.5"
                aria-label={`Read about ${topic.title}`}
              >
                <div className="relative h-56 w-full overflow-hidden">
                  <Image
                    src={image}
                    alt={topic.heroImageAlt ?? topic.title}
                    fill
                    priority={false}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                  {isNew && (
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
                      New
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4 p-6">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-[#2d3a2f]/70">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#2d3a2f]/20 bg-[#eef4ea] px-3 py-1 font-semibold">
                        Ingredient Guide
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#2d3a2f]/10 bg-[#f6f6f6] px-3 py-1 font-semibold">
                        {new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#122016] md:text-xl">
                      {topic.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#1f2d26]/75 md:text-base">
                      {description}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d3a2f]">
                    Start learning <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {topics.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={!hasMore}
              onClick={() => hasMore && handleToggle()}
              className={`inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#f0f6ed] px-6 py-2 font-semibold text-[#1f2d26] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 ${
                hasMore ? "hover:-translate-y-[1px] hover:bg-white" : "cursor-not-allowed opacity-60"
              }`}
            >
              {hasMore ? (showAll ? "Show less" : "Show more") : "More coming soon"}
              <span aria-hidden className="text-lg">{hasMore ? (showAll ? "▲" : "▼") : "•"}</span>
            </button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
