"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import PageContainer from "@/components/PageContainer";

type KnowledgeTopic = {
  slug: string;
  title: string;
  blurb: string;
  image: string;
};

const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  {
    slug: "green-tea-calm",
    title: "Green tea to calm stressed skin",
    blurb: "EGCG-rich leaves dial down redness and protect against pollution.",
    image: "/img/facts_img/green_tea.jpg",
  },
  {
    slug: "centella-sos",
    title: "Centella asiatica SOS",
    blurb: "Tiger grass compounds speed up barrier repair after irritation.",
    image: "/img/facts_img/centella.jpg",
  },
  {
    slug: "aloe-overnight-relief",
    title: "Aloe vera overnight relief",
    blurb: "Cooling polysaccharides drape skin in hydration while you sleep.",
    image: "/img/facts_img/aloe.jpg",
  },
  {
    slug: "squalane-skin-shield",
    title: "Plant squalane skin shield",
    blurb: "Featherweight lipids seal moisture without clogging pores.",
    image: "/img/facts_img/squalane.jpg",
  },
  {
    slug: "oatmeal-sos",
    title: "Colloidal oatmeal comfort",
    blurb: "Beta-glucans soothe itch and hold hydration in fragile skin.",
    image: "/img/facts_img/oatmeal.jpg",
  },
  {
    slug: "manuka-honey-fix",
    title: "Manuka honey moisture fix",
    blurb: "Sweet humectant care keeps blemish-prone skin balanced.",
    image: "/img/facts_img/manuka.jpg",
  },
  {
    slug: "turmeric-bright",
    title: "Turmeric glow guide",
    blurb: "Curcumin-powered serums fade stubborn spots and dullness.",
    image: "/img/facts_img/turmeric.jpg",
  },
  {
    slug: "jojoba-balance",
    title: "Jojoba oil balance",
    blurb: "Liquid wax esters soften dry areas while steadying shine.",
    image: "/img/facts_img/jojoba.jpg",
  },
];

export default function SkinKnowledge() {
  const [showAll, setShowAll] = useState(false);
  const visibleTopics = useMemo(
    () => (showAll ? KNOWLEDGE_TOPICS : KNOWLEDGE_TOPICS.slice(0, 6)),
    [showAll]
  );

  const handleToggle = () => setShowAll((prev) => !prev);

  return (
    <PageContainer as="section" className="pt-16">
      <div className="relative">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Skin Knowledge
          </h2>
          <p className="mt-2 text-gray-700 md:text-lg">
            Hand-picked ingredient guides to help you build smarter routines.
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

        {KNOWLEDGE_TOPICS.length > 6 && (
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
