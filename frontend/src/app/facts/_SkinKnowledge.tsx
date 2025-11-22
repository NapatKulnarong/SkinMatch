"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";
import { getAuthToken } from "@/lib/auth-storage";
import { QUIZ_COMPLETED_EVENT, QUIZ_SESSION_STORAGE_KEY } from "@/app/quiz/_QuizContext";

const FALLBACK_IMAGE = "/img/facts_img/green_tea.jpg";
const PALETTE = [
  "from-[#e5f4ff] via-[#f0f9ff] to-white",
  "from-[#fef5ec] via-[#fff3f3] to-white",
  "from-[#eef9f1] via-[#f4fff6] to-white",
  "from-[#f5f5ff] via-[#f0f0ff] to-white",
];

type SkinKnowledgeProps = {
  sectionId?: string;
};

export default function SkinKnowledge({ sectionId }: SkinKnowledgeProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const activeRef = useRef(true);

  const loadTopics = useCallback((providedSessionId?: string | null) => {
    activeRef.current = true;
    setLoading(true);
    setError(null);
    
    // Get session_id for anonymous users
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
    
    fetchTopicsBySection("knowledge", 9, 0, sessionIdToUse)
      .then((data) => {
        if (!activeRef.current) return;
        setTopics(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!activeRef.current) return;
        console.error("Failed to load Skin Knowledge topics", err);
        setError("We couldn't load Skin Knowledge topics right now.");
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

  const visibleTopics = useMemo(() => topics.slice(0, 6), [topics]);
  const showViewAll = topics.length > 6;

  // Loading skeleton — matches Spotlight sizing
  if (loading) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[220px] rounded-[24px] border-2 border-black bg-white/60 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.18)] animate-pulse"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-16">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          {error}
        </div>
      </PageContainer>
    );
  }

  if (!topics.length) {
    return (
      <PageContainer as="section" id={sectionId} className="pt-16">
        <div className="rounded-[22px] border-2 border-dashed border-black bg-white/60 p-6 text-center text-gray-700 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          No Skin Knowledge topics found yet.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer as="section" id={sectionId} className="pt-6 lg:pt-3">
      <div className="sm:rounded-[32px] sm:border-2 sm:border-dashed sm:border-black sm:bg-white/50 sm:p-8 sm:shadow-[4px_6px_0_rgba(0,0,0,0.18)]">
      <div className="relative">
        {/* Header */}
        <div className="mb-4 md:mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl md:text-[28px] lg:text-3xl md:text-4xl font-extrabold text-[#122016]">
              Skin Knowledge
            </h2>
            <p className="text-[#1f2d26]/70 md:text-lg">
              Hand-picked ingredient guides to help you build smarter routines.
            </p>
            <div className="hidden sm:flex lg:hidden gap-2 text-xs uppercase tracking-[0.32em] text-[#3c4c3f]/70 mt-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
                Updated weekly
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
                Evidence based
              </span>
            </div>
          </div>
          <div className="hidden lg:flex gap-2 text-xs uppercase tracking-[0.32em] text-[#3c4c3f]/70 lg:mt-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
              Updated weekly
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
              Evidence based
            </span>
          </div>
        </div>

        {/* Cards — same style as Ingredient Spotlight */}
        <div className="lg:pt-1 flex snap-x snap-mandatory sm:snap-none gap-3 lg:gap-4 overflow-x-auto pb-4 lg:pb-6 ps-1 pe-4 sm:pe-6">
          {visibleTopics.map((topic, index) => {
            const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
            const description =
              topic.subtitle || topic.excerpt || "Read the full guide.";
            const isNew = (topic.viewCount ?? 0) > 1000;
            const palette = PALETTE[index % PALETTE.length];

            return (
              <Link
                key={topic.slug}
                href={`/facts/${topic.slug}`}
                aria-label={`Read about ${topic.title}`}
                className={`mt-1 group relative flex flex-none snap-start w-[255px] lg:w-[360px] flex-col overflow-hidden rounded-[26px] border-2 border-black bg-gradient-to-br ${palette}
                            shadow-none sm:min-w-0 sm:shadow-[6px_8px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1`}
              >
                {/* Image header with fade */}
                <div className="relative h-36 w-full overflow-hidden sm:h-56">
                  <Image
                    src={image}
                    alt={topic.heroImageAlt ?? topic.title}
                    fill
                    priority={false}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  {isNew && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
                      New
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="relative flex flex-1 flex-col justify-between gap-4 p-4 text-[#0f1f17]">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold leading-tight">
                      {topic.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#0f1f17]/70 line-clamp-2">
                      {description}
                    </p>
                  </div>

                  {/* Footer: reads chip (desktop) + mobile “Read” pill bottom-right */}
                  <div className="mt-auto flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#11224a]/50">
                    <span className="hidden sm:inline">
                      {new Intl.NumberFormat().format(topic.viewCount ?? 0)} reads
                    </span>

                    {/* Mobile-only oval button pinned bottom-right; plain text on >= sm */}
                    <span
                      className="
                        absolute bottom-3 right-3 sm:static
                        inline-flex items-center gap-1
                        text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.25em] text-[#11224a] transition
                        rounded-full border border-[#11224a] bg-white px-4 py-1.5
                        sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0
                      "
                    >
                      Read
                      <span aria-hidden className="hidden sm:inline">↗</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          {showViewAll && (
            <div className="flex-none w-[255px] lg:w-[360px] snap-start rounded-[26px] border-2 border-dashed border-black bg-white/80 p-5 text-center shadow-none sm:shadow-[6px_8px_0_rgba(0,0,0,0.18)] flex flex-col justify-between gap-4">
              <div className="space-y-2 text-[#122016]">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#3c4c3f]/70">Need more?</p>
                <h3 className="text-xl font-bold">See every Skin Knowledge guide</h3>
                <p className="text-sm text-[#1f2d26]/70">
                  Explore the full archive for ingredient explainers, pairings, and science-backed routines.
                </p>
              </div>
              <Link
                href="/facts/skin-knowledge"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-[#f0f6ed] px-5 py-2 font-semibold text-[#1f2d26] shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]"
              >
                Read more topics <span aria-hidden>↗</span>
              </Link>
            </div>
          )}
        </div>

      </div>
      </div>
    </PageContainer>
  );
}
