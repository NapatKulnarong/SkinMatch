"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/centella_ampoule.jpg";

export default function TrendingSkincare() {
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
      <PageContainer as="section" className="pt-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-56 rounded-[22px] border-2 border-black bg-white/40 shadow-[6px_8px_0_rgba(0,0,0,0.15)] animate-pulse"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer as="section" className="pt-16">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error}
        </div>
      </PageContainer>
    );
  }

  if (!topics.length) {
    return (
      <PageContainer as="section" className="pt-16">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          No trending skincare topics found yet.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer as="section" className="pt-16">
      <div className="relative">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Trending Skincare
          </h2>
          <p className="mt-2 text-gray-700 md:text-lg">
            Editor-reviewed favourites making waves across Thai beauty feeds.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => {
            const image = item.heroImageUrl ?? FALLBACK_IMAGE;
            const description = item.subtitle || item.excerpt || "See why it's trending.";

            return (
              <Link
                key={item.slug}
                href={`/facts/${item.slug}`}
                className="group relative block overflow-hidden rounded-[22px] border-2 border-black bg-white/70 shadow-[6px_8px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-1"
                aria-label={`Read review for ${item.title}`}
              >
                <div className="relative h-56 w-full">
                  <Image
                    src={image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                    unoptimized={Boolean(item.heroImageUrl?.startsWith("http"))}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                    <h3 className="text-lg font-bold leading-snug md:text-xl">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/90 md:text-base">
                      {description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 font-semibold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
            >
              {showAll ? "Show less" : "Read more"}
              <span aria-hidden className="text-lg">{showAll ? "▲" : "▼"}</span>
            </button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
