"use client";

import { ReactNode } from "react";
import { mixWithWhite, usePastelColor } from "@/lib/usePastelColor";

type PastelArticleProps = {
  cover: string;
  children: ReactNode;
};

export default function PastelArticle({ cover, children }: PastelArticleProps) {
  const tint = usePastelColor(cover, "#f5f5f5");
  const surface = mixWithWhite(tint, 0.75);

  return (
    <section className="mt-10 px-6 md:px-8">
      <article
        className="mx-auto max-w-4xl px-6 md:px-8 py-10 md:py-12 rounded-[26px]"
        style={{
          backgroundColor: surface,
          transition: "background-color 200ms ease",
        }}
      >
        {children}
      </article>
    </section>
  );
}
