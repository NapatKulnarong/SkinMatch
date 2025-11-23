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
      <PageContainer as="section" id={sectionId} className="pt-12 sm:pt-16 lg:pt-20">
        <div className="rounded-[28px] border-2 border-black bg-white/60 shadow-[8px_10px_0_rgba(0,0,0,0.2)]">
          <div className="animate-pulse rounded-[28px] min-h-[280px] md:min-h-[240px]" />
        </div>
      </PageContainer>
    );
  }

  if (error || !current) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12 sm:pt-16 lg:pt-20">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error ?? "No popular topics found yet. Check back soon!"}
        </div>
      </PageContainer>
    );
  }

  const heroImage = current.heroImageUrl ?? FALLBACK_IMAGE;
  const blurb = current.subtitle || current.excerpt || "Discover the full story.";

  return (
    <PageContainer as="section" id={sectionId} className="pt-12 sm:pt-16 lg:pt-20">
      <div className="mb-5 flex flex-col gap-2 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
      </div>
      <div className="relative">
        <div className="relative overflow-hidden rounded-[22px] lg:rounded-[32px] border-2 border-black 
                       bg-gradient-to-br from-[#fff1d6] via-[#ffe9c8] to-[#f4f1df] shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[10px_12px_0_rgba(0,0,0,0.22)]">
        <div className="grid lg:grid-cols-[minmax(0,3fr)_300px] lg:items-stretch">
          <div className="relative w-full min-h-[240px] md:min-h-[260px] lg:h-full">
            <Image
              src={heroImage}
              alt={current.heroImageAlt ?? current.title}
              fill
              priority
              unoptimized={heroImage.startsWith("http")}
              className="object-cover w-full h-full"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2d4a2b]/85 via-[#2d4a2b]/20 to-transparent" />

            <div className="absolute inset-0 left-0 flex flex-col justify-between px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 text-white">
              <div className="space-y-3 max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                  Editors&apos; pick
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight drop-shadow-sm">
                  {current.title}
                </h3>
                <p className="text-sm md:text-lg lg:text-xl leading-relaxed text-white/85">
                  {blurb}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-shrink-0">
                <Link
                  href={`/facts/${current.slug}`}
                  className="inline-flex w-fit items-center justify-center gap-2 rounded-full border-2 border-black bg-[#fef9ef] px-5 py-1 md:py-2 lg:py-3 text-sm md:text-lg lg:text-xl font-semibold text-[#2d4a2b] 
                            shadow-[0_6px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-[2px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:w-auto"
                >
                  Read
                  <span aria-hidden className="text-lg">↗</span>
                </Link>
                
              </div>
            </div>
          </div>

          <aside className="hidden lg:flex flex-col gap-2 border-l-2 border-[#2d4a2b]/10 bg-black/10 p-4">
            {topics.slice(0, 5).map((topic, i) => {
              const isActive = i === idx;
              const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
              return (
                <button
                  key={topic.id}
                  type="button"
                  aria-current={isActive}
                  onClick={() => setIdx(i)}
                  className={`group relative flex items-center gap-3 rounded-2xl border-black px-3 py-2 text-left transition ${
                    isActive ? "border-2 bg-white shadow-[0_6px_0_rgba(0,0,0,0.25)]" : "border-0 bg-[#FFFAEC] hover:bg-white"
                  }`}
                >
                  <span className="flex h-18 w-18 shrink-0 overflow-hidden rounded-xl border border-black/20">
                    <Image
                      src={image}
                      alt={topic.heroImageAlt ?? topic.title}
                      width={56}
                      height={56}
                      unoptimized={image.startsWith("http")}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="flex-1 space-y-1">
                    
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
        <Image
          src="/img/mascot/matchy_hiding.png"
          alt="Matchy mascot smiling"
          width={640}
          height={480}
          className="hidden pointer-events-none absolute -left-[288px] -bottom-22 z-30 w-[320px] sm:w-[520px] lg:block"
          priority
          unoptimized
        />
      </div>

      {topics.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 lg:hidden" aria-label="Slide controls">
          
          <div className="flex items-center gap-2">
            {topics.map((topic, i) => {
              const isActive = i === idx;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Go to ${topic.title}`}
                  className={`h-2.5 w-5 rounded-full transition ${
                    isActive ? "bg-[#1c2b20]" : "bg-[#c8d5c1]"
                  }`}
                />
              );
            })}
          </div>
          
        </div>
      )}
    </PageContainer>
  );
}
