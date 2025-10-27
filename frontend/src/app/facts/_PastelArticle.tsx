"use client";

import Image from "next/image";
import type { FactContentBlock } from "@/lib/types";

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
  const paragraphs = (block.text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="mb-10 last:mb-0">
      {/* Heading */}
      {block.heading ? (
        <h2 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          {block.heading}
        </h2>
      ) : null}

      {/* Body text */}
      {paragraphs.map((para, idx) => (
        <p
          key={idx}
          className="text-gray-800 leading-relaxed md:text-base mb-4"
        >
          {para}
        </p>
      ))}

      {/* Image frame */}
      {block.imageUrl ? (
        <FigureImage
          src={block.imageUrl}
          alt={block.imageAlt ?? block.heading ?? ""}
        />
      ) : null}
    </section>
  );
}

function FigureImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-10">
      <img
        src={src}
        alt={alt}
        className="
          w-full
          h-auto
          rounded-[16px]
          border-2 border-black
          shadow-[6px_8px_0_rgba(0,0,0,0.25)]
          object-contain
        "
      />
      {alt ? (
        <figcaption className="mt-3 text-center text-sm text-gray-600">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}
