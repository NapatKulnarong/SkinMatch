// src/app/facts/[slug]/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";

type Params = { params: { slug: string } };

// Central place to define per-topic content.
// Later, replace this with a fetch to your Django API by slug.
const ARTICLES: Record<
  string,
  {
    title: string;
    cover: string; // path in /public
    body: JSX.Element;
  }
> = {
  "do-sheet-masks-help": {
    title: "Do sheet masks really help your skin?",
    cover: "/img/facts_img/sheet_mask.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          Sheet Mask Text Extraction
        </h2>
        <p className="text-gray-700 mb-8">
          Here is the extracted text from the original summary, covering the
          theory, history, debate, and verdict on sheet masks:
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          The Theory Behind Sheet Masks
        </h3>
        <p className="text-gray-800 mb-6">
          "The theory behind sheet masks is simple: essences, serums, and skin
          treatments would be absorbed much better into the skin if they are
          left on for a longer period of time, with an{" "}
          <strong>occlusive barrier</strong> sort of trapping the moisture on
          the surface of the skin. Apparently, this idea has been around not
          just for years, but centuries! The very first patented version of a
          sheet mask was created by <strong>Helen Rowley in 1875</strong>... The
          rubber mask also served to confine 'unguents or other medical
          preparations to the skin of the face...'"
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Modern Masking and Routine
        </h3>
        <p className="text-gray-800 mb-6">
          "The sheet mask we use today started when{" "}
          <strong>
            Max Factor’s Japanese subsidiary (now known as SK-II) applied to
            patent
          </strong>{" "}
          a 'cosmetic face pack treatment' in 1982... Korean cosmetic corporate
          giant <strong>Amorepacific</strong> took the SK-II invention further
          with its own 2006 patent, making more specifications on sheet mask
          materials, as well as the ingredients for a the essence it soaks in...
          If you really want to get the full benefits of masking though, it’s
          prescribed as <strong>step seven in the 10-step Korean skin care
          routine</strong>. Yes, that means masking at least once per day, every
          day!"
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          The Debate on Effectiveness
        </h3>
        <p className="text-gray-800 mb-6">
          "On the other hand, not everyone thinks sheet masks are helpful, let
          alone necessary for daily skin care. Beauty guru{" "}
          <strong>Paula Begoun</strong>, for one, has been quoted as saying, 'I
          hate sheet masks. They’re a waste of time. Even a well-formulated one
          is a waste of time. Ingredients are going to penetrate based on their
          molecular size. Nothing else. Having that sheet on your face does not
          form enough of a barrier. It’s bullshit that the sheet helps
          ingredients absorb.'... And for busy people, putting on a sheet mask
          just takes too much time; why bother if they already have a skin care
          routine that works for them?"
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          The Verdict
        </h3>
        <p className="text-gray-800">
          "After everything, it’s really{" "}
          <strong>up to you and what works for your skin!</strong> I could see
          how someone with{" "}
          <strong>very dry skin can get relief with regular sheet masking</strong>
          . But I would also understand how someone like Paula Begoun... would
          see sheet masks as an unnecessary waste of time. Personally, I enjoy
          using sheet masks on days when I have drier skin than usual, or to
          help me relax after a stressful day... as with everything else in skin
          care, <strong>Your Mileage May Vary (YMMV)</strong>. There’s nothing
          wrong with incorporating sheet masks into your daily routine, but if
          you’re not on #TeamSheetMask there’s nothing bad about that, either."
        </p>
      </>
    ),
  },

  // --- Short placeholders for the rest (replace later with real content) ---
  "retinol-beginners": {
    title: "Retinol for beginners",
    cover: "/img/facts_img/placeholder.jpg",
    body: (
      <p className="text-gray-800">
        Intro to retinol: benefits, how to start, and common mistakes. (Content
        coming soon.)
      </p>
    ),
  },
  "spf-everyday": {
    title: "Why SPF is a daily essential",
    cover: "/img/facts_img/placeholder.jpg",
    body: (
      <p className="text-gray-800">
        Sunscreen basics, filters, and reapplication tips. (Content coming
        soon.)
      </p>
    ),
  },
  "vitamin-c-myths": {
    title: "Vitamin C myths (and what really works)",
    cover: "/img/facts_img/placeholder.jpg",
    body: (
      <p className="text-gray-800">
        Clearing up common Vitamin C misconceptions. (Content coming soon.)
      </p>
    ),
  },
  "double-cleansing": {
    title: "Double cleansing: who actually needs it?",
    cover: "/img/facts_img/placeholder.jpg",
    body: (
      <p className="text-gray-800">
        What double cleansing is and when to use it. (Content coming soon.)
      </p>
    ),
  },
};

export default function FactArticlePage({ params }: Params) {
  const { slug } = params;
  const article = ARTICLES[slug];

  if (!article) return notFound();

  return (
    <main className="min-h-screen bg-[#f2f2f3]">
      {/* navbar spacer */}
      <div className="pt-24" />

      {/* HERO (same width as article, lowered a bit, title overlaid) */}
      <section className="max-w-4xl mx-auto px-6 md:px-8 mt-8">
        <div
          className="
            relative rounded-[28px] border-2 border-black overflow-hidden
            bg-white/70 shadow-[8px_10px_0_rgba(0,0,0,0.35)]
          "
        >
          <div className="relative h-[420px] md:h-[480px] w-full">
            <Image
              src={article.cover}
              alt="Article cover"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
            />

            {/* Gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />

            {/* Overlaid title */}
            <div className="absolute inset-0 flex items-end">
              <h1
                className="
                  p-6 md:p-8 text-white drop-shadow-[0_1.5px_0_rgba(0,0,0,0.5)]
                  text-3xl md:text-5xl font-extrabold leading-tight max-w-[80%]
                "
              >
                {article.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLE */}
      <article className="max-w-4xl mx-auto px-6 md:px-8 py-10 md:py-12">
        <div className="prose prose-lg max-w-none prose-headings:font-extrabold prose-p:text-gray-800">
          {article.body}
        </div>

        <div className="mt-12">
          <a
            href="/facts"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 font-semibold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)]"
          >
            ← Back to Skin Facts
          </a>
        </div>
      </article>
    </main>
  );
}