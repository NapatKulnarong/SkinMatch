"use client";

import type { FactContentBlock } from "@/lib/types";
import Image from "next/image";
import FactRichText from "@/components/facts/FactRichText";

export type PastelArticleProps = {
  blocks: FactContentBlock[];
  updatedAt: string; // ISO string
};

export function PastelArticle({ blocks, updatedAt }: PastelArticleProps) {
  // sort by order just to be safe
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <article
      className="
        mx-auto w-full max-w-3xl
        rounded-[10px] border-2 border-black
        bg-[#eef3f3] text-gray-900
        shadow-[6px_8px_0_rgba(0,0,0,0.25)]
        p-5 md:p-6
      "
    >
      {sortedBlocks.map((block) => (
        <BlockSection key={block.order} block={block} />
      ))}

      <footer className="mt-10 text-xs text-gray-600">
        Updated {new Date(updatedAt).toLocaleDateString()}
      </footer>
    </article>
  );
}

function BlockSection({ block }: { block: FactContentBlock }) {
  return (
    <section className="mb-10 last:mb-0">
      {/* Content (markdown) */}
      {block.content ? (
        <div className="mb-4">
          <FactRichText text={block.content} />
        </div>
      ) : null}

      {/* Image frame */}
      {block.imageUrl ? (
        <FigureImage
          src={block.imageUrl}
          alt={block.imageAlt ?? ""}
        />
      ) : null}
    </section>
  );
}

function FigureImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-10">
      <div
        className="
          w-full
          rounded-[16px]
          border-2 border-black
          shadow-[6px_8px_0_rgba(0,0,0,0.25)]
          overflow-hidden
        "
      >
        <Image
          src={src}
          alt={alt}
          // you can tune these base dimensions; they just need to be defined
          width={800}
          height={600}
          priority
          unoptimized={src.startsWith("http")}
          className="h-auto w-full object-contain"
        />
      </div>

      {alt ? (
        <figcaption className="mt-3 text-center text-sm text-gray-600">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}
