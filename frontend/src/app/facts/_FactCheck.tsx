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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTopicsBySection("fact_check", 12)
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

  const visibleTopics = useMemo(() => topics.slice(0, 6), [topics]);
  const showViewAll = topics.length > 6;

  if (loading) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-12">
        <div className="h-64 rounded-[26px] border-2 border-black bg-white/50 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.2)] animate-pulse" />
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
        <EmptyTimelineState />
      </PageContainer>
    );
  }

  return (
    <PageContainer as="section" id={sectionId} className="pt-6 lg:pt-3">
      <div className="sm:rounded-[32px] sm:border-2 sm:border-dashed sm:border-black sm:bg-white/50 sm:p-8 sm:shadow-[4px_6px_0_rgba(0,0,0,0.18)]">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl md:text-4xl font-extrabold text-[#102320]">
              Fact Check
            </h2>
            <p className="hidden sm:block mt-2 text-[#102320]/70 md:text-lg">
              Bust the biggest skincare myths with science-backed breakdowns.
            </p>
          </div>
          <div className="flex gap-2 text-xs uppercase tracking-[0.32em] text-[#3c4c3f]/70">
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
              Verified by our experts
            </span>
          </div>
        </div>

        <div className="lg:pt-1 flex snap-x snap-mandatory sm:snap-none gap-3 lg:gap-4 overflow-x-auto pb-4 lg:pb-6 ps-1 pe-4 sm:pe-6">
          {visibleTopics.map((topic) => {
            const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
            const description =
              topic.subtitle || topic.excerpt || "We break down the science.";
            const verdict = topic.title.toLowerCase().includes("myth")
              ? "Myth"
              : "Verified";
            const verdictColor =
              verdict === "Verified"
                ? "bg-[#d6f0d1] text-[#134620]"
                : "bg-[#fde2e2] text-[#8b1c1c]";

            return (
              <article
                key={topic.slug}
                className="flex-none w-[255px] lg:w-[360px] snap-start overflow-hidden rounded-[26px] border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-1.5"
              >
                <Link href={`/facts/${topic.slug}`} className="flex h-full flex-col">
                  <div className="relative h-40 overflow-hidden sm:h-48">
                    <Image
                      src={image}
                      alt={topic.heroImageAlt ?? topic.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                    <span
                      className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${verdictColor}`}
                    >
                      {verdict}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-4 p-5 text-[#102320]">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#102320]/60">
                        Myth vs Fact
                      </p>
                      <h3 className="text-lg font-bold leading-tight">{topic.title}</h3>
                      <p className="text-sm leading-relaxed text-[#102320]/75 line-clamp-3">
                        {description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[#102320]/60">
                      <span>
                        {new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads
                      </span>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#102320]">
                        Read <span aria-hidden>↗</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}

          {showViewAll && (
            <div className="flex-none w-[255px] lg:w-[360px] snap-start rounded-[26px] border-2 border-dashed border-black bg-white/80 p-5 text-center shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.18)] flex flex-col justify-between gap-4">
              <div className="space-y-2 text-[#102320]">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#3c4c3f]/70">
                  Need more?
                </p>
                <h3 className="text-xl font-bold">See every Fact Check breakdown</h3>
                <p className="text-sm text-[#102320]/70">
                  Explore the full archive of myths we&apos;ve debunked with science-backed receipts.
                </p>
              </div>
              <Link
                href="/facts/fact-check"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-[#fdf0dc] px-5 py-2 font-semibold text-[#102320] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]"
              >
                Browse Fact Checks <span aria-hidden>↗</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function EmptyTimelineState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[26px] border-2 border-dashed border-black bg-white/70 p-10 text-center shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
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
