"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/centella_ampoule.jpg";

type TrendingSkincareProps = {
  sectionId?: string;
};

export default function TrendingSkincare({ sectionId }: TrendingSkincareProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTopicsBySection("trending", 9)
      .then((data) => {
        if (!active) return;
        setTopics(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load trending skincare topics", err);
        setError("We couldn't load trending skincare stories right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => (showAll ? topics : topics.slice(0, 6)), [topics, showAll]);
  const hasMore = topics.length > 6;

  const toggle = () => setShowAll((prev) => !prev);

  if (loading) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-48 rounded-[24px] border-2 border-black bg-white/50 shadow-[6px_8px_0_rgba(0,0,0,0.2)] animate-pulse"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error}
        </div>
      </PageContainer>
    );
  }

  if (!topics.length) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          No trending skincare topics found yet.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer as="section" id={sectionId} className="pt-12">
      <div className="mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a2130]">
          Trending Skincare
        </h2>
        <p className="mt-2 text-[#1a2130]/70 md:text-lg">
          Editor-reviewed favourites making waves across Thai beauty feeds.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item, index) => {
          const image = item.heroImageUrl ?? FALLBACK_IMAGE;
          const description = item.subtitle || item.excerpt || "See why it's trending.";
          const hypeScore = (item.viewCount ?? 0) + (index + 1) * 128;

          return (
            <Link
              key={item.slug}
              href={`/facts/${item.slug}`}
              className="relative flex flex-col gap-4 rounded-[28px] border-2 border-black bg-gradient-to-br from-white via-[#f6f1ff] to-white shadow-[6px_8px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-1.5"
              aria-label={`Read review for ${item.title}`}
            >
              <div className="relative h-44 overflow-hidden rounded-t-[26px]">
                <Image
                  src={image}
                  alt={item.heroImageAlt ?? item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 320px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
                  <div>
                    <h3 className="text-lg font-bold leading-snug md:text-xl">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/85 md:text-base line-clamp-2">
                      {description}
                    </p>
                  </div>
                  <span className="inline-flex h-12 min-w-[48px] items-center justify-center rounded-full border border-white/40 bg-white/10 px-3 text-xs font-semibold uppercase tracking-[0.28em]">
                    #{index + 1}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 px-5 text-xs uppercase tracking-[0.3em] text-[#1a2130]/60">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#1a2130]/15 bg-white px-4 py-1 font-semibold">
                  {new Intl.NumberFormat().format(item.viewCount ?? 0)} reads
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#1a2130]/15 bg-white px-4 py-1 font-semibold">
                  Hype score {new Intl.NumberFormat().format(hypeScore)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#1a2130]/15 bg-white px-4 py-1 font-semibold">
                  Social buzz ↑
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-black/10 px-5 py-4 text-sm font-semibold text-[#1a2130]">
                <span>Why it&apos;s buzzing</span>
                <span aria-hidden>→</span>
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
            onClick={() => hasMore && toggle()}
            className={`inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#ece5ff] px-6 py-2 font-semibold text-[#1a2130] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 ${
              hasMore ? "hover:-translate-y-[1px]" : "cursor-not-allowed opacity-60"
            }`}
          >
            {hasMore ? (showAll ? "Show fewer trends" : "See more trends") : "More trends soon"}
            <span aria-hidden className="text-lg">{hasMore ? (showAll ? "▲" : "▼") : "•"}</span>
          </button>
        </div>
      )}
    </PageContainer>
  );
}
