"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/silicone_myth.jpg";

type FactCheckProps = {
  sectionId?: string;
};

export default function FactCheck({ sectionId }: FactCheckProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTopicsBySection("fact_check", 9)
      .then((data) => {
        if (!active) return;
        setTopics(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load fact-check topics", err);
        setError("We couldn't load Fact Check topics right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleTopics = useMemo(() => (showAll ? topics : topics.slice(0, 6)), [topics, showAll]);
  const hasMore = topics.length > 6;

  const toggle = () => setShowAll((prev) => !prev);

  if (loading) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="h-64 rounded-[26px] border-2 border-black bg-white/50 shadow-[6px_8px_0_rgba(0,0,0,0.2)] animate-pulse" />
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
        <EmptyTimelineState />
      </PageContainer>
    );
  }

  return (
    <PageContainer as="section" id={sectionId} className="pt-12">
      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#102320]">Fact Check</h2>
          <p className="mt-2 text-[#102320]/70 md:text-lg">
            Bust the biggest skincare myths with science-backed breakdowns.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#102320]/50">
          Verified by our experts
        </p>
      </div>

      <div className="relative pl-6 sm:pl-10">
        <div className="absolute left-2 sm:left-4 top-0 h-full w-0.5 bg-gradient-to-b from-[#102320]/30 via-[#102320]/15 to-transparent"/>

        <ul className="space-y-10 sm:space-y-12">
          {visibleTopics.map((topic, index) => {
            const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
            const description = topic.subtitle || topic.excerpt || "We break down the science.";
            const verdict = topic.title.toLowerCase().includes("myth") ? "Myth busted" : "Verified";
            const verdictColor = verdict === "Verified" ? "bg-[#d6f0d1] text-[#134620]" : "bg-[#fde2e2] text-[#8b1c1c]";

            return (
              <li key={topic.slug} className="relative ml-auto sm:pl-4">
                <span className="absolute -left-6 sm:-left-11 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-black 
                                bg-[#fef7e3] text-sm font-bold text-[#102320] shadow-[3px_4px_0_rgba(0,0,0,0.25)]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="rounded-[26px] border-2 border-black bg-white shadow-[8px_10px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1">
                  <div className="grid gap-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)]">
                    <div className="relative h-48 sm:h-full overflow-hidden rounded-t-[24px] sm:rounded-l-[24px] sm:rounded-tr-none">
                      <Image
                        src={image}
                        alt={topic.heroImageAlt ?? topic.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <span className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${verdictColor}`}>
                        {verdict}
                      </span>
                    </div>

                    <div className="flex flex-col gap-4 p-6 sm:p-8">
                      <div className="space-y-3">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#102320]/60">
                          Myth vs Fact
                        </p>
                        <h3 className="text-xl font-extrabold text-[#102320] md:text-2xl">
                          {topic.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#102320]/75 md:text-base">
                          {description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#102320]/60">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#102320]/15 bg-[#f3f6f4] px-3 py-1 font-semibold">
                          {new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#102320]/15 bg-[#f3f6f4] px-3 py-1 font-semibold">
                          Science backed
                        </span>
                      </div>

                      <div>
                        <Link
                          href={`/facts/${topic.slug}`}
                          className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#fdf7e6] px-5 py-2 text-sm font-semibold text-[#102320] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
                        >
                          Read the science
                          <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

        {topics.length > 4 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={!hasMore}
              onClick={() => hasMore && toggle()}
              className={`inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#fdf0dc] px-6 py-2 font-semibold text-[#102320] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 ${
                hasMore ? "hover:-translate-y-[1px]" : "cursor-not-allowed opacity-60"
              }`}
            >
              {hasMore ? (showAll ? "Show less" : "Show more") : "More coming soon"}
              <span aria-hidden className="text-lg">{hasMore ? (showAll ? "▲" : "▼") : "•"}</span>
            </button>
          </div>
        )}
    </PageContainer>
  );
}

function EmptyTimelineState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[26px] border-2 border-dashed border-black bg-white/70 p-10 text-center shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
      <p className="text-base font-semibold text-[#102320]">No Fact Check topics found yet.</p>
      <p className="text-sm text-[#102320]/70">
        We&apos;re lining up the most-requested myths. Tell us what to investigate next!
      </p>
      <Link
        href="mailto:hello@skinmatch.co"
        className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 text-sm font-semibold text-[#102320] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]"
      >
        Suggest a myth
      </Link>
    </div>
  );
}
