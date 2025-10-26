import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PastelHero } from "../_PastelHero";
import { PastelArticle } from "../_PastelArticle";
import PastelLayout from "../_PastelLayout";

import {
  fetchFactTopicDetail,
  fetchTopicsBySection,
} from "@/lib/api.facts";

import type { FactTopicSummary } from "@/lib/types";

const DEFAULT_COVER = "/img/facts_img/sheet_mask.jpg";

type Params = { params: { slug: string } };

export default async function FactTopicPage({ params }: Params) {
  const topic = await fetchFactTopicDetail(params.slug);

  if (!topic) {
    notFound();
  }

  const cover = topic.heroImageUrl ?? DEFAULT_COVER;

  const related = await fetchRelatedTopics(topic.slug, topic.section);

  return (
    <PastelLayout cover={cover}>
      {/* HERO */}
      <PastelHero
        cover={cover}
        title={topic.title}
        subtitle={topic.subtitle ?? null}
        coverAlt={topic.heroImageAlt ?? topic.title}
      />

      {/* ARTICLE BODY */}
      <PastelArticle
        blocks={topic.contentBlocks}
        updatedAt={topic.updatedAt}
      />

      {/* RELATED */}
      {related.length ? (
        <section className="mt-12 px-6 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-2xl font-extrabold text-gray-900">
              Keep exploring
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/facts/${item.slug}`}
                  className="group overflow-hidden rounded-[20px] border-2 border-black bg-white/70 shadow-[6px_8px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-1"
                >
                  <div className="relative h-40 w-full">
                    <Image
                      src={item.heroImageUrl ?? DEFAULT_COVER}
                      alt={item.heroImageAlt ?? item.title}
                      fill
                      unoptimized={Boolean(item.heroImageUrl?.startsWith("http"))}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

                    <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                      <h3 className="text-base font-semibold leading-tight">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm text-white/90">
                        {item.subtitle ||
                          item.excerpt ||
                          "Read the full story."}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PastelLayout>
  );
}

async function fetchRelatedTopics(
  currentSlug: string,
  section: FactTopicSummary["section"]
): Promise<FactTopicSummary[]> {
  try {
    const topics = await fetchTopicsBySection(section, 4);
    return topics
      .filter((topic) => topic.slug !== currentSlug)
      .slice(0, 3);
  } catch (error) {
    console.warn("Unable to load related topics", error);
    return [];
  }
}
