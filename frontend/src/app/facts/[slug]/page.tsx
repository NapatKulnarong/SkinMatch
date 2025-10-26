import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import PastelHero from "../_PastelHero";
import { fetchFactTopicDetail, fetchTopicsBySection } from "@/lib/api.facts";
import type { FactContentBlock, FactTopicSummary } from "@/lib/types";

const FALLBACK_COVER = "/img/facts_img/sheet_mask.jpg";

type Params = { params: { slug: string } };

export default async function FactTopicPage({ params }: Params) {
  const topic = await fetchFactTopicDetail(params.slug);
  if (!topic) {
    notFound();
  }

  const related = await fetchRelatedTopics(topic.slug, topic.section);
  const cover = topic.heroImageUrl ?? FALLBACK_COVER;

  return (
    <main className="bg-[#dbe9ea] min-h-screen pb-16">
      <div className="mx-auto w-full max-w-5xl px-4 pt-32 md:pt-32">
        {/* HERO CARD */}
        <PastelHero
          cover={cover}
          title={topic.title}
          subtitle={topic.subtitle || topic.excerpt || ""}
        />

        {/* ARTICLE CARD */}
        <article
          className="
            mx-auto
            max-w-3xl
            rounded-[8px]
            border-2 border-black
            bg-white/70
            shadow-[6px_8px_0_rgba(0,0,0,0.35)]
            p-6
            md:p-8
          "
        >
          {topic.contentBlocks.map((block, idx) => (
            <ArticleBlock
              key={idx}
              block={block}
              isLast={idx === topic.contentBlocks.length - 1}
            />
          ))}

          <p className="mt-10 text-xs text-gray-600">
            Updated{" "}
            {new Date(topic.updatedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </p>
        </article>

        {/* RELATED */}
        {related.length ? (
          <section className="mx-auto max-w-4xl mt-12">
            <h2 className="text-xl font-extrabold text-gray-900 mb-4">
              Keep exploring
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/facts/${item.slug}`}
                  className="
                    group
                    rounded-[16px]
                    border-2 border-black
                    bg-white
                    shadow-[6px_8px_0_rgba(0,0,0,0.25)]
                    overflow-hidden
                    transition
                    hover:-translate-y-1
                  "
                >
                  <div className="relative h-40 w-full">
                    <Image
                      src={item.heroImageUrl ?? FALLBACK_COVER}
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
                      <p className="mt-1 text-sm text-white/90 line-clamp-2">
                        {item.subtitle ||
                          item.excerpt ||
                          "Read the full story."}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

/* ─────────────────────────────
   ARTICLE BLOCK RENDERER
   (Heading, paragraph, optional image)
────────────────────────────── */
function ArticleBlock({
  block,
  isLast,
}: {
  block: FactContentBlock;
  isLast: boolean;
}) {
  const paragraphs = (block.text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className={isLast ? "" : "mb-10"}>
      {block.heading ? (
        <h2 className="text-base md:text-lg font-extrabold text-gray-900 mb-3">
          {block.heading}
        </h2>
      ) : null}

      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="text-gray-800 leading-relaxed text-sm md:text-base mb-4"
        >
          {para}
        </p>
      ))}

      {block.imageUrl ? (
        <figure className="my-6">
          <img
            src={block.imageUrl}
            alt={block.imageAlt ?? block.heading ?? ""}
            className="
              w-full h-auto
              rounded-[12px]
              border-2 border-black
              shadow-[6px_8px_0_rgba(0,0,0,0.25)]
              bg-white
            "
          />
          {block.imageAlt ? (
            <figcaption className="mt-2 text-center text-xs text-gray-600">
              {block.imageAlt}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
    </section>
  );
}

async function fetchRelatedTopics(
  currentSlug: string,
  section: FactTopicSummary["section"]
): Promise<FactTopicSummary[]> {
  try {
    const topics = await fetchTopicsBySection(section, 4);
    return topics.filter((t) => t.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}
