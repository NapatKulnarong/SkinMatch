"use client";

/* eslint-disable @next/next/no-img-element */

type PastelHeroProps = {
  cover: string;
  title: string;
  subtitle?: string | null;
  coverAlt?: string | null;
};

export function PastelHero({ cover, title, subtitle, coverAlt }: PastelHeroProps) {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <div
        className="
          relative
          h-[180px] md:h-[200px]
          w-full
          overflow-hidden
          rounded-[12px] md:rounded-[10px]
          border-2 border-black
          bg-neutral-800 text-white
          shadow-[6px_8px_0_rgba(0,0,0,0.25)]
        "
      >
        {/* background image */}
        {cover ? (
          <>
            <img
              src={cover}
              alt={coverAlt || title}
              className="
                absolute inset-0
                h-full w-full
                object-cover
              "
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-600 to-neutral-300" />
        )}

        {/* text overlay */}
        <div className="relative z-10 flex h-full w-full flex-col justify-center p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-white drop-shadow">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm md:text-base text-white/90 drop-shadow">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
