"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { fetchPopularTopics } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/sheet_mask.jpg";

type PopularTopicsProps = {
  sectionId?: string;
};

export default function PopularTopics({ sectionId }: PopularTopicsProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPopularTopics()
      .then((data) => {
        if (!active) return;
        setTopics(data);
        setIdx(0);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load popular topics", err);
        setError("We couldn't load popular topics right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (topics.length < 2) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % topics.length), 6000);
    return () => clearInterval(timer);
  }, [topics.length]);

  const current = useMemo(() => topics[idx], [topics, idx]);

  if (loading) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-20">
        <div className="rounded-[28px] border-2 border-black bg-white/60 shadow-[8px_10px_0_rgba(0,0,0,0.2)]">
          <div className="h-[420px] md:h-[520px] animate-pulse rounded-[28px]" />
        </div>
      </PageContainer>
    );
  }

  if (error || !current) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-20">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error ?? "No popular topics found yet. Check back soon!"}
        </div>
      </PageContainer>
    );
  }

  const heroImage = current.heroImageUrl ?? FALLBACK_IMAGE;
  const blurb = current.subtitle || current.excerpt || "Discover the full story.";

  return (
    <PageContainer as="section" id={sectionId} className="pt-20">
      <div className="relative -top-7 z-20 py-2 text-4xl font-extrabold text-gray-900">
          Skin Facts
      </div>
      <div className="relative overflow-hidden rounded-[32px] border-2 border-black 
                     bg-gradient-to-br from-[#fff1d6] via-[#ffe9c8] to-[#f4f1df] shadow-[10px_12px_0_rgba(0,0,0,0.22)]">
        <div className="grid lg:grid-cols-[minmax(0,2.6fr)_minmax(280px,1fr)]">
          <div className="relative h-[420px] md:h-[542px] w-full">
            <Image
              src={heroImage}
              alt={current.heroImageAlt ?? current.title}
              fill
              priority
              className="object-cover w-full h-full"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2d4a2b]/85 via-[#2d4a2b]/20 to-transparent" />

            <div className="absolute inset-y-0 left-0 flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-12 text-white">
              <div className="space-y-4 max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                  Editors&apos; pick
                </p>
                <h3 className="text-3xl sm:text-5xl font-extrabold leading-tight drop-shadow-sm">
                  {current.title}
                </h3>
                <p className="text-base sm:text-lg leading-relaxed text-white/85">
                  {blurb}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/facts/${current.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#fef9ef] px-6 py-2 text-sm font-semibold text-[#2d4a2b] shadow-[0_6px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-[2px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                >
                  Read deep dive
                  <span aria-hidden className="text-lg">↗</span>
                </Link>
                <span className="text-xs uppercase tracking-[0.28em] text-white/65">
                  Swipe for more stories
                </span>
              </div>
            </div>
          </div>

          <aside className="hidden lg:flex flex-col gap-3 border-l-2 border-[#2d4a2b]/10 bg-[#f7fbe5] p-6">
            {topics.slice(0, 5).map((topic, i) => {
              const isActive = i === idx;
              const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
              return (
                <button
                  key={topic.id}
                  type="button"
                  aria-current={isActive}
                  onClick={() => setIdx(i)}
                  className={`group relative flex flex-1 items-center gap-4 rounded-2xl border-2 border-black px-3 py-3 text-left transition ${
                    isActive ? "bg-white shadow-[0_6px_0_rgba(0,0,0,0.25)]" : "bg-white/70 hover:bg-white"
                  }`}
                >
                  <span className="flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/20">
                    <Image
                      src={image}
                      alt={topic.heroImageAlt ?? topic.title}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="flex-1 space-y-1">
                    <span className={`text-xs font-semibold uppercase tracking-[0.22em] ${isActive ? "text-[#1f2d26]" : "text-[#3c4c3f]/70"}`}>
                      {i === 0 ? "Now reading" : "Up next"}
                    </span>
                    <span className={`block text-sm font-bold leading-snug ${isActive ? "text-[#1f2d26]" : "text-[#2d3a2f]"}`}>
                      {topic.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </aside>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {topics.map((t, i) => (
          <button
            key={t.id}
            aria-label={`Show slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${i === idx ? "bg-[#4a6b47]" : "bg-[#c6d1be]"}`}
          />
        ))}
      </div>
    </PageContainer>
  );
}
