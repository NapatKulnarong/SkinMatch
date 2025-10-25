"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { fetchPopularTopics } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/sheet_mask.jpg";

export default function PopularTopics() {
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
      <PageContainer as="section" className="pt-16">
        <div className="relative">
          <div className="relative h-[420px] md:h-[480px] rounded-[28px] border-2 border-black bg-white/50 shadow-[8px_10px_0_rgba(0,0,0,0.2)] animate-pulse" />
        </div>
      </PageContainer>
    );
  }

  if (error || !current) {
    return (
      <PageContainer as="section" className="pt-16">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error ?? "No popular topics found yet. Check back soon!"}
        </div>
      </PageContainer>
    );
  }

  const heroImage = current.heroImageUrl ?? FALLBACK_IMAGE;
  const blurb = current.subtitle || current.excerpt || "Discover the full story.";

  return (
    <PageContainer as="section" className="pt-16">
      {/* Card wrapper must be relative so the badge can anchor to its corner */}
      <div className="relative">
        {/* Corner badge that sits on the card’s top-left corner */}
<div
  className="
    absolute -top-7 left-0 z-20
    rounded-full border-2 border-black bg-[#F8D7B6]
    px-6 py-2.5 text-[17px] font-bold text-gray-700
    shadow-[4px_6px_0_rgba(0,0,0,0.35)]
  "
>
  Popular Topics
</div>

        {/* Feature card */}
        <div
          className="
            relative rounded-[28px] border-2 border-black overflow-hidden
            bg-white/70 shadow-[8px_10px_0_rgba(0,0,0,0.35)]
          "
        >
          {/* Image */}
          <div className="relative h-[420px] md:h-[480px]">
            <Image
              src={heroImage}
              alt={current.title}
              fill
              priority
              unoptimized={heroImage.startsWith("http")}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          </div>

          {/* Headline + button (black text like your mock) */}
          <div className="absolute inset-0 flex">
            <div className="flex flex-col justify-between p-6 md:p-10 w-full">
              <div className="max-w-[60%] md:max-w-[55%]">
                <h3 className="text-black text-4xl md:text-6xl font-extrabold leading-tight">
                  {current.title}
                </h3>
              </div>

              <div className="mt-4 max-w-xl">
                <p className="text-base font-medium text-black/80 md:text-lg">
                  {blurb}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <Link
                  href={`/facts/${current.slug}`}
                  className="
                    inline-flex items-center gap-2 rounded-full
                    border-2 border-black bg-white px-5 py-2
                    font-semibold text-gray-900
                    shadow-[0_6px_0_rgba(0,0,0,0.35)]
                    hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]
                    active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10
                  "
                >
                  Read
                  <span aria-hidden className="text-lg">➜</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {topics.map((t, i) => (
          <button
            key={t.id}
            aria-label={`Show slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === idx ? "bg-gray-800" : "bg-gray-400 hover:bg-gray-500"
            }`}
          />
        ))}
      </div>
    </PageContainer>
  );
}
