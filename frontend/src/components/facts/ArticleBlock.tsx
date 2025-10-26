"use client";

import FactRichText from "./FactRichText";
import type { FactContentBlock } from "@/lib/types";

export default function ArticleBlock({
  block,
  isLast,
}: {
  block: FactContentBlock;
  isLast: boolean;
}) {
  return (
    <section className={isLast ? "" : "mb-10"}>
      {block.heading ? (
        <h2 className="text-base md:text-lg font-extrabold text-gray-900 mb-3">
          {block.heading}
        </h2>
      ) : null}

      {block.text ? (
        <FactRichText text={block.text} />
      ) : null}

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
