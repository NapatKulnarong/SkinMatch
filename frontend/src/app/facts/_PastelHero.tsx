"use client";

import Image from "next/image";
import { mixWithWhite, usePastelColor } from "@/lib/usePastelColor";

type PastelHeroProps = {
  cover: string;
  title: string;
};

export default function PastelHero({ cover, title }: PastelHeroProps) {
  const tint = usePastelColor(cover, "#f2f2f3");
  const surface = mixWithWhite(tint, 0.3);
  const overlayGradient = "linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.3), transparent)";

  return (
    <section className="mt-8 px-6 md:px-8">
      <div
        className="mx-auto max-w-4xl relative rounded-[28px] border-2 border-black overflow-hidden shadow-[8px_10px_0_rgba(0,0,0,0.35)]"
        style={{ backgroundColor: surface, transition: "background-color 200ms ease" }}
      >
        <div className="relative h-[420px] md:h-[480px] w-full">
          <Image
            src={cover}
            alt="Article cover"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
          />

          <div className="absolute inset-0" style={{ background: overlayGradient }} />

          <div className="absolute inset-0 flex items-end">
            <h1
              className="
                p-6 md:p-8 text-white drop-shadow-[0_1.5px_0_rgba(0,0,0,0.5)]
                text-3xl md:text-5xl font-extrabold leading-tight max-w-[80%]
              "
            >
              {title}
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}
