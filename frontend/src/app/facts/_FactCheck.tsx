"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";

type FactCheckTopic = {
  slug: string;
  title: string;
  blurb: string;
  image: string;
};

const FACT_CHECK_TOPICS: FactCheckTopic[] = [
  {
    slug: "silicone-myth",
    title: "Silicone-free marketing myths",
    blurb: "Dimethicone sits on top of skin and is not the villain marketing claims it is.",
    image: "/img/facts_img/silicone_myth.jpg",
  },
  {
    slug: "pores-open-close",
    title: "Do pores open and close?",
    blurb: "Temperature changes soften sebum, but pores do not have hinges.",
    image: "/img/facts_img/pores_truth.jpg",
  },
  {
    slug: "detoxifying-sweat",
    title: "Can sweat detox skin?",
    blurb: "Sweat cools you down; your liver and kidneys handle detoxing duties.",
    image: "/img/facts_img/detox_sweat.jpg",
  },
  {
    slug: "natural-label-safe",
    title: "Is natural always safer?",
    blurb: "Plant-based does not guarantee gentle; focus on testing and packaging.",
    image: "/img/facts_img/natural_label.jpg",
  },
  {
    slug: "purging-vs-breakout",
    title: "Purging vs breakout confusion",
    blurb: "Where pimples show up and how long they last tells you what is happening.",
    image: "/img/facts_img/purging_breakout.jpg",
  },
  {
    slug: "drying-alcohols",
    title: "Are all alcohols bad?",
    blurb: "Fatty alcohols soothe and support the barrier while thin alcohols evaporate fast.",
    image: "/img/facts_img/drying_alcohol.jpg",
  },
  {
    slug: "overnight-results-myth",
    title: "Overnight results promises",
    blurb: "True skin change takes a full cell cycle, not a single night.",
    image: "/img/facts_img/overnight_results.jpg",
  },
];

export default function FactCheck() {
  const [showAll, setShowAll] = useState(false);
  const visibleTopics = useMemo(
    () => (showAll ? FACT_CHECK_TOPICS : FACT_CHECK_TOPICS.slice(0, 6)),
    [showAll]
  );

  const handleToggle = () => setShowAll((prev) => !prev);

  return (
    <PageContainer as="section" className="pt-16">
      <div className="relative">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Fact Check
          </h2>
          <p className="mt-2 text-gray-700 md:text-lg">
            Bust the biggest skincare myths with science-backed breakdowns.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTopics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/facts/${topic.slug}`}
              className="group relative block overflow-hidden rounded-[22px] border-2 border-black bg-white/70 shadow-[6px_8px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-1"
              aria-label={`Read about ${topic.title}`}
            >
              <div className="relative h-56 w-full">
                <Image
                  src={topic.image}
                  alt=""
                  fill
                  priority={false}
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

                <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                  <h3 className="text-lg font-bold leading-snug md:text-xl">
                    {topic.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/90 md:text-base">
                    {topic.blurb}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {FACT_CHECK_TOPICS.length > 6 && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={handleToggle}
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
