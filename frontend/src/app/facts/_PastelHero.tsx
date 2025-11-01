// app/facts/_PastelHero.tsx
import Image from "next/image";

type PastelHeroProps = {
  cover: string; // heroImageUrl or fallback
  title: string;
  subtitle?: string | null;
};

export default function PastelHero({ cover, title, subtitle }: PastelHeroProps) {
  return (
    <section
      className="
        mx-auto
        max-w-4xl
        w-full
        rounded-[16px]
        border-2 border-black
        shadow-[8px_10px_0_rgba(0,0,0,0.4)]
        bg-gradient-to-br from-[#5f5f5f] to-[#cfcfcf]
        overflow-hidden
        mb-8
      "
    >
      <div className="relative w-full min-h-[260px] md:min-h-[300px]">
        {/* hero image */}
        <Image
          src={cover}
          alt={subtitle || title}
          fill
          className="object-cover object-center opacity-80"
          sizes="(max-width: 768px) 100vw, 800px"
        />

        {/* gradient overlay so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

        {/* text block */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          <h1 className="text-white font-extrabold text-2xl leading-snug md:text-3xl md:leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
            {title}
          </h1>

          {subtitle ? (
            <p className="text-white/90 text-base md:text-lg font-medium mt-3 max-w-[46ch] drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
