"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type TrendingProduct = {
  slug: string;
  title: string;
  blurb: string;
  image: string;
};

const TRENDING_PRODUCTS: TrendingProduct[] = [
  {
    slug: "1004-centella-ampoule",
    title: "SKIN1004 Centella Ampoule",
    blurb: "Single-ingredient centella serum that calms flare-ups fast.",
    image: "/img/facts_img/centella_ampoule.jpg",
  },
  {
    slug: "ingu-lotus-cleansing-milk",
    title: "Ingu Lotus Micellar Milk",
    blurb: "Milky first cleanser that leaves a soft cushiony finish.",
    image: "/img/facts_img/ingu_lotus.jpg",
  },
  {
    slug: "laglace-toner-pad",
    title: "Laglace Toner Pad",
    blurb: "Dual-texture pads for brightening and hydrating in one step.",
    image: "/img/facts_img/laglace_toner.jpg",
  },
  {
    slug: "curecode-double-barrier-cream",
    title: "Curecode Double Barrier Cream",
    blurb: "Ceramide-rich recovery cream ideal after actives.",
    image: "/img/facts_img/curecode_barrier.jpg",
  },
  {
    slug: "beauty-of-joseon-relief-sun",
    title: "BOJ Relief Sun SPF50+",
    blurb: "Dewy chemical sunscreen with rice ferment and probiotics.",
    image: "/img/facts_img/boj_relief_sun.jpg",
  },
  {
    slug: "ingu-purple-rice-lip-mask",
    title: "Ingu Purple Rice Lip Mask",
    blurb: "Overnight lip treatment with purple rice antioxidants.",
    image: "/img/facts_img/ingu_lip_mask.jpg",
  },
  {
    slug: "laroche-posay-cicaplast-baume-b5-plus",
    title: "La Roche-Posay Cicaplast Baume B5+",
    blurb: "Pharmacy classic soothing balm upgraded with prebiotics.",
    image: "/img/facts_img/cicaplast_baume.jpg",
  },
];

export default function TrendingSkincare() {
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(
    () => (showAll ? TRENDING_PRODUCTS : TRENDING_PRODUCTS.slice(0, 6)),
    [showAll]
  );

  const toggle = () => setShowAll((prev) => !prev);

  return (
    <section className="px-6 pt-16">
      <div className="relative">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Trending Skincare
          </h2>
          <p className="mt-2 text-gray-700 md:text-lg">
            Editor-reviewed favourites making waves across Thai beauty feeds.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <Link
              key={item.slug}
              href={`/facts/${item.slug}`}
              className="group relative block overflow-hidden rounded-[22px] border-2 border-black bg-white/70 shadow-[6px_8px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-1"
              aria-label={`Read review for ${item.title}`}
            >
              <div className="relative h-56 w-full">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                  <h3 className="text-lg font-bold leading-snug md:text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/90 md:text-base">
                    {item.blurb}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {TRENDING_PRODUCTS.length > 6 && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 font-semibold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
            >
              {showAll ? "Show less" : "Read more"}
              <span aria-hidden className="text-lg">{showAll ? "▲" : "▼"}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
