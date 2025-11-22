"use client";

import FactRichText from "./FactRichText";
import type { FactContentBlock } from "@/lib/types";
import Image from "next/image";

export default function ArticleBlock({
  block,
  isLast,
}: {
  block: FactContentBlock;
  isLast: boolean;
}) {
  return (
    <section className={isLast ? "" : "mb-10"}>
      {block.content ? <FactRichText text={block.content} /> : null}

      {block.imageUrl ? (
        <figure className="my-6">
          <div
            className="
              w-full
              rounded-[12px]
              border-2 border-black
              shadow-[6px_8px_0_rgba(0,0,0,0.25)]
              bg-white
              overflow-hidden
            "
          >
            <Image
              src={block.imageUrl}
              alt={block.imageAlt ?? "Content image"}
              width={800}
              height={600}
              priority
              unoptimized={block.imageUrl.startsWith("http")}
              className="
                w-full
                h-auto
                object-contain
              "
            />
          </div>

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
