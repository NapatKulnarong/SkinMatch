"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageContainer from "@/components/PageContainer";
import { fetchTopicsBySection } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";

const FALLBACK_IMAGE = "/img/facts_img/serum_texture.jpg";
const PALETTE = [
  "from-[#e5f4ff] via-[#f0f9ff] to-white",
  "from-[#fef5ec] via-[#fff3f3] to-white",
  "from-[#eef9f1] via-[#f4fff6] to-white",
  "from-[#f5f5ff] via-[#f0f0ff] to-white",
];

type IngredientSpotlightProps = {
  sectionId?: string;
};

export default function IngredientSpotlight({ sectionId }: IngredientSpotlightProps) {
  const [topics, setTopics] = useState<FactTopicSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchTopicsBySection("ingredient_spotlight", 10)
      .then((data) => {
        if (!active) return;
        setTopics(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load ingredient spotlight", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const spotlight = useMemo(() => topics.slice(0, 8), [topics]);
  const displayed = spotlight;

  return (
    <PageContainer as="section" id={sectionId} className="pt-6 lg:pt-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#0f1f17] md:text-4xl">
            Ingredient Spotlight
          </h2>
          <p className="hidden sm:block mt-2 text-[#0f1f17]/70 md:text-lg">
            Swipe through the actives our community can’t stop talking about.
          </p>
        </div>

        <div className="flex gap-2 text-xs uppercase tracking-[0.32em] text-[#3c4c3f]/70">
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
            Ingredients that work
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-dashed border-[#3c4c3f]/60 bg-white/60 px-3 py-1 font-semibold">
            Good match, good result
          </span>
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="lg:pt-1 flex snap-x snap-mandatory gap-3 lg:gap-4 overflow-x-auto pb-4 ps-1 pe-4 sm:pe-6">
          {loading && spotlight.length === 0
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-[220px] min-w-[240px] rounded-[24px] border-2 border-black bg-white/60 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[4px_6px_0_rgba(0,0,0,0.2)] animate-pulse"
                />
              ))
            : displayed.map((topic, index) => {
                const image = topic.heroImageUrl ?? FALLBACK_IMAGE;
                const description = topic.subtitle || topic.excerpt || "Daily deep dive";
                const palette = PALETTE[index % PALETTE.length];
                const tags = buildTagHints({
                  title: topic.title ?? "",
                  description,
                  slug: topic.slug ?? "",
                });

                return (
                  <article
                    key={topic.slug}
                    className={`relative min-w-[260px] snap-start overflow-hidden rounded-[26px] border-2 border-black bg-gradient-to-br ${palette} shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1`}
                  >
                    <Link href={`/facts/${topic.slug}`} className="flex h-full flex-col">
                      <div className="relative h-36 overflow-hidden">
                        <Image
                          src={image}
                          alt={topic.heroImageAlt ?? topic.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 60vw, 320px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-4 p-4 text-[#0f1f17]">
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold leading-tight">{topic.title}</h3>
                          <p className="text-sm leading-relaxed text-[#0f1f17]/70 line-clamp-2">
                            {description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full border border-dashed border-[#0f1f17]/60 bg-white/70 px-3 py-1 text-[10px] lg:text-[11px] text-black/60 font-semibold uppercase tracking-[0.28em]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
        </div>
      </div>
    </PageContainer>
  );
}

/* ----------------------------- Tag Engine ----------------------------------

Deterministic rules that turn (title + description + slug) into 1–2 concise tags.
Add synonyms to the rule lists to support more ingredients in the future.

----------------------------------------------------------------------------- */

type BuildInput = { title: string; description: string; slug: string };

// Human-friendly labels you actually show in UI
const TAG_LABELS = {
  // ingredients
  "RETINOID": "RETINOID",
  "AHA": "AHA",
  "BHA": "BHA",
  "NIACINAMIDE": "NIACINAMIDE",
  "HYALURONIC-ACID": "HYALURONIC-ACID",
  "VITAMIN-C": "VITAMIN-C",
  "CICA": "CICA",
  "SQUALANE": "SQUALANE",
  "PANTHENOL": "PANTHENOL",
  "TRANEXAMIC-ACID": "TRANEXAMIC ACID",
  "AZELAIC-ACID": "AZELAIC ACID",
  "ALLANTOIN": "ALLANTOIN",
  "BAKUCHIOL": "BAKUCHIOL",

  // benefits / content type
  "FADING": "FADING",
  "BRIGHTENING": "BRIGHTENING",
  "TEXTURE": "TEXTURE",
  "HYDRATION": "HYDRATION",
  "BARRIER-SUPPORTING": "BARRIER-SUPPORTING",
  "SOOTHING": "SOOTHING",
  "ANTI-ACNE": "ANTI-ACNE",
  "ANTI-AGING": "ANTI-AGING",
  "HOW": "HOW",
} as const;

type TagKey = keyof typeof TAG_LABELS;

type Rule = { tag: TagKey; patterns: RegExp[]; score: number };

// Utility to build word-boundary regex
const W = (w: string) => new RegExp(`\\b${w}\\b`, "i");

// Ingredient rules (easy to extend)
const INGREDIENT_RULES: Rule[] = [
  { tag: "RETINOID", score: 5, patterns: [W("retinol"), W("retinal"), /retinoid/i, /tretinoin/i, /vitamin\s*a\b/i] },
  { tag: "AHA", score: 4, patterns: [W("aha"), W("glycolic"), W("lactic"), W("mandelic")] },
  { tag: "BHA", score: 4, patterns: [W("bha"), W("salicylic")] },
  { tag: "NIACINAMIDE", score: 4, patterns: [W("niacinamide"), /vitamin\s*b3/i] },
  { tag: "HYALURONIC-ACID", score: 5, patterns: [/hyaluronic/i, /sodium hyaluronate/i, /\bha\b/i] },
  { tag: "VITAMIN-C", score: 4, patterns: [/vitamin\s*c/i, /ascorbic/i, /tetrahexyldecyl/i] },
  { tag: "CICA", score: 3, patterns: [/centella/i, /\bcica\b/i, /madecassoside/i, /asiaticoside/i] },
  { tag: "SQUALANE", score: 3, patterns: [/squalane?/i] },
  { tag: "PANTHENOL", score: 3, patterns: [/panthenol/i, /vitamin\s*b5/i] },
  { tag: "TRANEXAMIC-ACID", score: 4, patterns: [/tranexamic/i] },
  { tag: "AZELAIC-ACID", score: 4, patterns: [/azelaic/i] },
  { tag: "ALLANTOIN", score: 3, patterns: [/allantoin/i] },
  { tag: "BAKUCHIOL", score: 3, patterns: [/bakuchiol/i] },
];

// Benefit/content rules
const BENEFIT_RULES: Rule[] = [
  { tag: "FADING", score: 3, patterns: [/dark spot/i, /hyperpigment/i, /melasma/i, /\beven tone\b/i, /\bfade/i] },
  { tag: "BRIGHTENING", score: 2, patterns: [/brighten/i, /radiance/i, /\bglow\b/i, /dull/i] },
  { tag: "TEXTURE", score: 2, patterns: [/texture/i, /smooth/i, /refine/i, /pores?/i] },
  { tag: "HYDRATION", score: 3, patterns: [/hydrate/i, /plump/i, /moistur/i, /humectant/i] },
  { tag: "BARRIER-SUPPORTING", score: 3, patterns: [/barrier/i, /repair/i, /ceramide/i, /tewl/i] },
  { tag: "SOOTHING", score: 2, patterns: [/calm/i, /soothe/i, /redness/i, /irritat/i, /sensitive/i] },
  { tag: "ANTI-ACNE", score: 2, patterns: [/acne/i, /pimple/i, /comed/i, /blackhead/i, /sebum/i] },
  { tag: "ANTI-AGING", score: 2, patterns: [/fine lines?/i, /wrinkles?/i, /firm/i, /elasticity/i, /collagen/i] },
  { tag: "HOW", score: 2, patterns: [/^how\b/i, /\bhow to\b/i, /\bguide\b/i, /\broutine\b/i, /\bsteps?\b/i] },
];

const PRIORITY: TagKey[] = [
  // prefer concrete ingredient first, then benefit
  "RETINOID","AHA","BHA","HYALURONIC-ACID","NIACINAMIDE","VITAMIN-C","AZELAIC-ACID",
  "TRANEXAMIC-ACID","CICA","SQUALANE","PANTHENOL","ALLANTOIN","BAKUCHIOL",
  "FADING","HYDRATION","BARRIER-SUPPORTING","ANTI-ACNE","TEXTURE","SOOTHING",
  "BRIGHTENING","ANTI-AGING","HOW",
];

function scoreRules(text: string, rules: Rule[], acc: Map<TagKey, number>) {
  for (const r of rules) {
    for (const p of r.patterns) {
      if (p.test(text)) acc.set(r.tag, (acc.get(r.tag) ?? 0) + r.score);
    }
  }
}

function rankAndPick(scores: Map<TagKey, number>, max = 2): TagKey[] {
  if (!scores.size) return [];
  const ranked = [...scores.entries()].sort((a, b) => {
    const d = b[1] - a[1];
    if (d !== 0) return d;
    return PRIORITY.indexOf(a[0]) - PRIORITY.indexOf(b[0]);
  }).map(([k]) => k);

  // avoid near-duplicate families (e.g., HYDRATION + HYALURONIC-ACID) if we only show 2
  const families: Record<string, TagKey[]> = {
    hydration: ["HYDRATION","HYALURONIC-ACID"],
    bright: ["BRIGHTENING","VITAMIN-C"],
    antiacne: ["ANTI-ACNE","BHA"],
    texture: ["TEXTURE","AHA","RETINOID"],
  };

  const chosen: TagKey[] = [];
  const used = new Set<string>();
  for (const tag of ranked) {
    const fam = Object.entries(families).find(([, list]) => list.includes(tag))?.[0];
    if (fam && used.has(fam)) continue;
    if (fam) used.add(fam);
    chosen.push(tag);
    if (chosen.length >= max) break;
  }
  return chosen;
}

function buildTagHints(input: BuildInput, max = 2): string[] {
  const { title, description, slug } = input;
  const text = `${title}\n${description}\n${slug}`.toLowerCase().normalize("NFKD");

  const scores = new Map<TagKey, number>();
  scoreRules(text, INGREDIENT_RULES, scores);
  scoreRules(text, BENEFIT_RULES, scores);

  const picked = rankAndPick(scores, max);
  return picked.map((k) => TAG_LABELS[k]);
}