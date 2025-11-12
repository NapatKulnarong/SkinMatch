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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTopicsBySection("trending", 12)
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

  const visible = useMemo(() => topics.slice(0, 6), [topics]);
  const showViewAll = topics.length > 6;

  if (loading) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-48 rounded-[24px] border-2 border-black bg-white/50 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.2)] animate-pulse"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error}
        </div>
      </PageContainer>
    );
  }

  if (!topics.length) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          No trending skincare topics found yet.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer as="section" id={sectionId} className="pt-6 lg:pt-3">
      <div className="sm:rounded-[32px] sm:border-2 sm:border-dashed sm:border-black sm:bg-white/50 sm:p-8 sm:shadow-[4px_6px_0_rgba(0,0,0,0.18)]">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl md:text-4xl font-extrabold text-[#1a2130]">
              Trending Skincare
            </h2>
            <p className="hidden sm:block mt-2 text-[#1a2130]/70 md:text-lg">
              Editor-reviewed favourites making waves across Thai beauty feeds.
            </p>
          </div>
          <div className="flex gap-2 text-xs uppercase tracking-[0.32em] text-[#3c4c3f]/70">
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
              Social buzz ↑
            </span>
          </div>
        </div>

        <div className="lg:pt-1 flex snap-x snap-mandatory sm:snap-none gap-3 lg:gap-4 overflow-x-auto pb-4 lg:pb-6 ps-1 pe-4 sm:pe-6">
          {visible.map((item, index) => {
            const image = item.heroImageUrl ?? FALLBACK_IMAGE;
            const description = item.subtitle || item.excerpt || "See why it's trending.";
            const hypeScore = (item.viewCount ?? 0) + (index + 1) * 128;

            return (
              <article
                key={item.slug}
                className="flex-none w-[255px] lg:w-[360px] snap-start overflow-hidden rounded-[26px] border-2 border-black bg-white shadow-none sm:shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-1.5"
              >
                <Link href={`/facts/${item.slug}`} className="flex h-full flex-col">
                  <div className="relative h-40 overflow-hidden sm:h-48">
                    <Image
                      src={image}
                      alt={item.heroImageAlt ?? item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
                      <p className="mt-1 text-sm text-white/85 line-clamp-2">{description}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-4 p-5 text-[#1a2130]">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a2130]/60">
                        Trending metrics
                      </p>
                      <div className="space-y-2 text-xs uppercase tracking-[0.3em] text-[#1a2130]/60">
                        <span>{new Intl.NumberFormat().format(item.viewCount ?? 0)} reads</span>
                        <span>Hype score {new Intl.NumberFormat().format(hypeScore)}</span>
                        <span>Social buzz ↑</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[#1a2130]/60">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a2130]">
                        Read <span aria-hidden>↗</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}

          {showViewAll && (
            <div className="flex-none w-[255px] lg:w-[360px] snap-start rounded-[26px] border-2 border-dashed border-black bg-white/80 p-5 text-center shadow-none sm:shadow-[6px_8px_0_rgba(0,0,0,0.18)] flex flex-col justify-between gap-4">
              <div className="space-y-2 text-[#1a2130]">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#3c4c3f]/70">
                  Want more?
                </p>
                <h3 className="text-xl font-bold">See all Trending stories</h3>
                <p className="text-sm text-[#1a2130]/70">
                  Dive into every editor-picked launch and viral routine shaking up Thai beauty feeds.
                </p>
              </div>
              <Link
                href="/facts/trending"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-[#ece5ff] px-5 py-2 font-semibold text-[#1a2130] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]"
              >
                Browse Trending <span aria-hidden>↗</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
