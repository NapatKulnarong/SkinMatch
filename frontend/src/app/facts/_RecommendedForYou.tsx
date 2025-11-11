"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";

import PageContainer from "@/components/PageContainer";
import { fetchPopularTopics, fetchTopicsBySection, fetchRecommendedTopics } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

type RecommendedForYouProps = {
  sectionId?: string;
};

export default function RecommendedForYou({ sectionId }: RecommendedForYouProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Try personalized endpoint first; fall back to blended list on failure
    fetchRecommendedTopics(4)
      .then((personalised) => {
        if (!active) return;
        if (personalised.length) {
          setTopics(personalised);
          return;
        }
        return Promise.all([fetchTopicsBySection("knowledge", 6), fetchPopularTopics(4)]).then(
          ([knowledge, popular]) => {
            if (!active) return;
            const combined = [...knowledge, ...popular].filter(
              (topic, index, arr) => arr.findIndex((t) => t.id === topic.id) === index
            );
            combined.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
            setTopics(combined.slice(0, 4));
          }
        );
      })
      .catch(() => {
        if (!active) return;
        Promise.all([fetchTopicsBySection("knowledge", 6), fetchPopularTopics(4)])
          .then(([knowledge, popular]) => {
            if (!active) return;
            const combined = [...knowledge, ...popular].filter(
              (topic, index, arr) => arr.findIndex((t) => t.id === topic.id) === index
            );
            combined.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
            setTopics(combined.slice(0, 4));
          })
          .catch((err) => {
            if (!active) return;
            console.error("Failed to load recommended topics", err);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const recommendations = useMemo(() => topics, [topics]);

  return (
    <PageContainer as="section" id={sectionId} className="lg:pt-3">
      <div className="rounded-[22px] lg:rounded-[32px] border-2 border-black bg-gradient-to-br from-[#FFF1CA] via-[#F9D689] to-[#FFF1CA] shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[10px_12px_0_rgba(0,0,0,0.18)]">
        <div className="relative flex flex-col gap-4 border-b border-black/10 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8 sm:pb-5">
          <div>
            <p className="hidden sm:block text-xs font-semibold uppercase tracking-[0.32em] text-[#11224a]/60">
              Tailored insights
            </p>
            <h2 className="lg:mt-2 flex items-center gap-2 text-xl lg:text-3xl font-extrabold text-[#11224a]">
              <SparklesIcon className="hidden sm:block h-6 w-6 text-[#B6771D]" aria-hidden />
              Recommended for your routine
            </h2>
            <p className="mt-2 text-sm text-[#11224a]/70 sm:text-base">
              Curated from your most-viewed concerns and the community’s current favourites.
            </p>
          </div>
          <Link
            href="/quiz"
            className="order-last inline-flex w-fit items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 text-sm font-semibold text-[#2d4a2b] shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 sm:order-none sm:absolute sm:right-6 sm:top-8 sm:w-auto sm:justify-start sm:px-6"
          >
            Update preferences
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="px-3 lg:px-3 pb-1 lg:pb-5 pt-4 sm:px-6">
          <div className="flex snap-x snap-mandatory gap-3 lg:gap-4 overflow-x-auto pb-4 sm:grid sm:auto-rows-[1fr] sm:grid-cols-2 sm:gap-4 sm:overflow-visible xl:grid-cols-4">
          {loading && !recommendations.length
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-44 min-w-[240px] rounded-[24px] border-2 border-black bg-white/70 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[4px_6px_0_rgba(0,0,0,0.18)] animate-pulse sm:min-w-0"
                />
              ))
            : recommendations.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/facts/${topic.slug}`}
                  className="group flex h-full min-h-[190px] lg:min-h-[245px] min-w-[250px] flex-col gap-3 rounded-[5px] border-2 border-black bg-white px-3 lg:px-4 py-2 lg:py-5 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[5px_6px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 sm:min-w-0"
                >
                  <span className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#11224a]/60">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#11224a] bg-[#FFF1CA] text-sm font-bold">
                      {topic.title.slice(0, 1)}
                    </span>
                    Match insight
                  </span>
                  <h3 className="lg:text-lg font-bold text-[#11224a] group-hover:text-[#0a1737]">
                    {topic.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#11224a]/70 line-clamp-3">
                    {topic.subtitle || topic.excerpt || "Tap to see why this ingredient belongs in your lineup."}
                  </p>
                  <div className="relative mt-auto flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#11224a]/50">
  {/* Hide on mobile */}
  <span className="hidden sm:inline">
    {new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads
  </span>

  {/* “View guide” button pinned bottom-right on mobile */}
  <span
  className="
    absolute bottom-2 right-2 
    sm:static 
    inline-flex items-center gap-1 
    text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.25em] 
    text-[#11224a] transition hover:-translate-y-[1px]
    
    /* Mobile (default): show oval button */
    rounded-full border border-[#11224a] bg-[#FAEAB1] px-4 py-1.5 
    
    /* Hide oval on sm and up */
    sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0
  "
>
  Read
  <span aria-hidden className="hidden sm:inline">
    ↗
  </span>
</span>
</div>
                </Link>
              ))}
          </div>
        </div>

        {!loading && !recommendations.length ? (
          <div className="border-t border-dashed border-[#11224a]/20 px-6 py-6 text-sm text-[#11224a]/70">
            We&apos;ll personalise this space once you explore a few more topics.
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
