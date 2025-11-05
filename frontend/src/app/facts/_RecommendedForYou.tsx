"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
    <PageContainer as="section" id={sectionId} className="pt-12">
      <div className="rounded-[32px] border-2 border-black bg-gradient-to-br from-[#f6fbe8] via-[#fef8e7] to-[#f2f7e4] shadow-[10px_12px_0_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-6 border-b border-black/10 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#11224a]/60">
              Tailored insights
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#11224a]">
              Recommended for your routine
            </h2>
            <p className="mt-2 text-sm text-[#11224a]/70 sm:text-base">
              Curated from your most-viewed concerns and the community’s current favourites.
            </p>
          </div>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#fef4d8] px-5 py-2 text-sm font-semibold text-[#2d4a2b] shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]"
          >
            Update preferences
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid gap-4 px-6 pb-6 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading && !recommendations.length
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-40 rounded-[24px] border-2 border-black bg-white/70 shadow-[4px_6px_0_rgba(0,0,0,0.18)] animate-pulse"
                />
              ))
            : recommendations.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/facts/${topic.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-[24px] border-2 border-black bg-white px-4 py-5 shadow-[5px_6px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#11224a]/60">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#11224a]/20 bg-[#e8efff] text-sm font-bold">
                      {topic.title.slice(0, 1)}
                    </span>
                    Match insight
                  </span>
                  <h3 className="text-lg font-bold text-[#11224a] group-hover:text-[#0a1737]">
                    {topic.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#11224a]/70">
                    {topic.subtitle || topic.excerpt || "Tap to see why this ingredient belongs in your lineup."}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#11224a]/50">
                    <span>{new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads</span>
                    <span className="inline-flex items-center gap-1 text-[#2667ff]">
                      View guide <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              ))}
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
