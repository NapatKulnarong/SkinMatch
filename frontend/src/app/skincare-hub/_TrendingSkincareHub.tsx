"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";
import { getAuthToken } from "@/lib/auth-storage";
import { QUIZ_COMPLETED_EVENT, QUIZ_SESSION_STORAGE_KEY } from "@/app/quiz/_QuizContext";

const FALLBACK_IMAGE = "/img/facts_img/centella_ampoule.jpg";

type TrendingSkincareHubProps = {
  sectionId?: string;
};

export function TrendingSkincareHub({ sectionId }: TrendingSkincareHubProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const activeRef = useRef(true);

  const loadTopics = useCallback((providedSessionId?: string | null) => {
    activeRef.current = true;
    setLoading(true);
    setError(null);
    
    const token = getAuthToken();
    const isLoggedIn = Boolean(token);
    let sessionId: string | null | undefined = providedSessionId;
    
    if (!sessionId && !isLoggedIn && typeof window !== "undefined") {
      try {
        sessionId = window.localStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to read quiz session from localStorage", err);
      }
    }
    
    const sessionIdToUse = isLoggedIn ? undefined : sessionId;
    
    fetchTopicsBySection("trending", 12, 0, sessionIdToUse)
      .then((data) => {
        if (!activeRef.current) return;
        setTopics(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!activeRef.current) return;
        console.error("Failed to load trending skincare topics", err);
        setError("We couldn't load trending skincare stories right now.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadTopics();
    return () => {
      activeRef.current = false;
    };
  }, [loadTopics, pathname]);

  useEffect(() => {
    const handleQuizCompleted = (event: Event) => {
      let sessionId: string | null | undefined = undefined;
      if ("detail" in event) {
        const customEvent = event as CustomEvent<{ sessionId?: string }>;
        sessionId = customEvent.detail?.sessionId;
      }
      loadTopics(sessionId);
    };

    window.addEventListener(QUIZ_COMPLETED_EVENT, handleQuizCompleted);
    return () => {
      window.removeEventListener(QUIZ_COMPLETED_EVENT, handleQuizCompleted);
    };
  }, [loadTopics]);

  const visible = useMemo(() => topics.slice(0, 6), [topics]);
  const showViewAll = topics.length > 6;

  if (loading) {
    return (
      <section id={sectionId} className="space-y-5 rounded-[28px] border-2 border-black bg-[#fbfff9] p-5 lg:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)]">
        <div className="space-y-2">
          <p className="hidden lg:block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60">
            Editor picks
          </p>
          <h2 className="text-2xl font-black text-[#1f2d26]">
            Trending Skincare
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 w-[280px] flex-none rounded-[24px] border-2 border-black bg-white/50 shadow-[4px_4px_0_rgba(0,0,0,0.2)] animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id={sectionId} className="rounded-[28px] border-2 border-black bg-[#fbfff9] p-5 lg:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)]">
        <div className="rounded-2xl border-2 border-dashed border-black/30 bg-white px-4 py-6 text-sm text-[#1f2d26]/70 text-center">
          {error}
        </div>
      </section>
    );
  }

  if (!topics.length) {
    return (
      <section id={sectionId} className="rounded-[28px] border-2 border-black bg-[#f5f9ff] p-5 lg:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)]">
        <div className="rounded-2xl border-2 border-dashed border-black/30 bg-white px-4 py-6 text-sm text-[#1f2d26]/70 text-center">
          No trending skincare topics found yet.
        </div>
      </section>
    );
  }

  return (
    <section
      id={sectionId}
      className="space-y-5 rounded-[28px] border-2 border-black bg-[#f5f9ff] p-5 lg:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)]"
    >
      <div className="space-y-2">
        <p className="hidden lg:block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60">
          Editor picks
        </p>
        <h2 className="text-xl lg:text-2xl font-black text-[#1f2d26]">
          Trending Skincare
        </h2>
        <p className="text-sm text-[#1f2d26]/70">
          Editor-reviewed favourites making waves across Thai beauty feeds.
        </p>
      </div>

      <div className="flex snap-x snap-mandatory sm:snap-none gap-4 lg:gap-6 overflow-x-auto pb-4 lg:pb-6 ps-1 pe-4 sm:pe-6">
        {visible.map((item, index) => {
          const image = item.heroImageUrl ?? FALLBACK_IMAGE;
          const description = item.subtitle || item.excerpt || "See why it's trending.";
          const hypeScore = (item.viewCount ?? 0) + (index + 1) * 128;

          return (
            <article
              key={item.slug}
              className="mt-1 flex-none w-[280px] lg:w-[360px] snap-start overflow-hidden rounded-[24px] border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-1"
            >
              <Link href={`/facts/${item.slug}`} className="flex h-full flex-col">
                <div className="relative h-40 overflow-hidden sm:h-48">
                  <Image
                    src={image}
                    alt={item.heroImageAlt ?? item.title}
                    fill
                    priority={index < 2}
                    unoptimized={image.startsWith("http")}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 320px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
                    <p className="mt-1 text-sm text-white/85 line-clamp-2">{description}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4 p-5 text-[#1f2d26]">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[#1f2d26]/60">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f2d26]">
                      Read <span aria-hidden>→</span>
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}

        {showViewAll && (
          <div className="flex-none w-[280px] lg:w-[360px] snap-start rounded-[24px] border-2 border-dashed border-black/30 bg-white/80 p-5 text-center shadow-[4px_4px_0_rgba(0,0,0,0.2)] flex flex-col justify-between gap-4">
            <div className="space-y-2 text-[#1f2d26]">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#1f2d26]/60">
                Want more?
              </p>
              <h3 className="text-xl font-bold">See all Trending stories</h3>
              <p className="text-sm text-[#1f2d26]/70">
                Dive into every editor-picked launch and viral routine shaking up Thai beauty feeds.
              </p>
            </div>
            <Link
              href="/facts/trending"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-[#1f2d26] px-5 py-2 font-semibold text-white shadow-[0_4px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5"
            >
              Browse Trending <span aria-hidden>↗</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

