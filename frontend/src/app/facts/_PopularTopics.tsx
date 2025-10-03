"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Topic = {
  id: string;
  slug: string;
  title: string;
  image: string; // /public/img/...
  clicks: number;
};

async function getTopTopics(): Promise<Topic[]> {
  const data: Topic[] = [
    { id: "1", slug: "do-sheet-masks-help", title: "Do sheet mask actually help your skin?", image: "/img/facts_img/sheet_mask.jpg", clicks: 8243 },
    { id: "2", slug: "retinol-beginners", title: "Retinol for beginners", image: "/img/facts_img/retinol.jpg", clicks: 7712 },
    { id: "3", slug: "spf-everyday", title: "Why SPF is a daily essential", image: "/img/facts_img/spf.jpg", clicks: 6940 },
    { id: "4", slug: "vitamin-c-myths", title: "Vitamin C myths (and what really works)", image: "/img/facts_img/vitc.jpg", clicks: 5129 },
    { id: "5", slug: "double-cleansing", title: "Double cleansing: who actually needs it?", image: "/img/facts_img/double_cleanse.jpg", clicks: 4982 },
  ];
  await new Promise((r) => setTimeout(r, 150));
  return data.slice(0, 5);
}

export default function PopularTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    getTopTopics().then(setTopics);
  }, []);

  useEffect(() => {
    if (topics.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % topics.length), 6000);
    return () => clearInterval(t);
  }, [topics.length]);

  const current = useMemo(() => topics[idx], [topics, idx]);
  if (!current) return null;

  return (
    <section className="px-6 pt-16">
      {/* Card wrapper must be relative so the badge can anchor to its corner */}
      <div className="relative">
        {/* Corner badge that sits on the card’s top-left corner */}
<div
  className="
    absolute -top-7 left-0 z-20
    rounded-full border-2 border-black bg-[#F8D7B6]
    px-6 py-2.5 text-[17px] font-bold text-gray-700
    shadow-[4px_6px_0_rgba(0,0,0,0.35)]
  "
>
  Popular Topics
</div>

        {/* Feature card */}
        <div
          className="
            relative rounded-[28px] border-2 border-black overflow-hidden
            bg-white/70 shadow-[8px_10px_0_rgba(0,0,0,0.35)]
          "
        >
          {/* Image */}
          <div className="relative h-[420px] md:h-[480px]">
            <Image
              src={current.image}
              alt={current.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          </div>

          {/* Headline + button (black text like your mock) */}
          <div className="absolute inset-0 flex">
            <div className="flex flex-col justify-between p-6 md:p-10 w-full">
              <div className="max-w-[60%] md:max-w-[55%]">
                <h3 className="text-black text-4xl md:text-6xl font-extrabold leading-tight">
                  {current.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/facts/${current.slug}`}
                  className="
                    inline-flex items-center gap-2 rounded-full
                    border-2 border-black bg-white px-5 py-2
                    font-semibold text-gray-900
                    shadow-[0_6px_0_rgba(0,0,0,0.35)]
                    hover:-translate-y-[1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]
                    active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10
                  "
                >
                  Read
                  <span aria-hidden className="text-lg">➜</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {topics.map((t, i) => (
          <button
            key={t.id}
            aria-label={`Show slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === idx ? "bg-gray-800" : "bg-gray-400 hover:bg-gray-500"
            }`}
          />
        ))}
      </div>
    </section>
  );
}