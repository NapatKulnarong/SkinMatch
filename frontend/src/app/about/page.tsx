// frontend/src/app/about/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { EnvelopeIcon } from "@heroicons/react/24/solid";
import { FaGithub, FaInstagram } from "react-icons/fa";
import PageContainer from "@/components/PageContainer";
import SiteFooter from "@/components/SiteFooter";

type Member = {
  id: number;
  name: string;
  role: string;
  img: string;
  cardBg: string;
  thumbBg: string;
};

const TEAM: Member[] = [
  {
    id: 1,
    name: "Napat Kulnarong",
    role: "AS Frontend Developer (UI/UX + React)",
    img: "/img/members/member_1.png",
    cardBg: "#D7EBF4",
    thumbBg: "#B9D7E5",
  },
  {
    id: 2,
    name: "Nisara Ploysuttipol",
    role: "AS Database Engineer (Data Modeling + Integration)",
    img: "/img/members/member_2.png",
    cardBg: "#DDD3EE",
    thumbBg: "#C6B7E0",
  },
  {
    id: 3,
    name: "Pakorn Fudulyawajananont",
    role: "AS Backend Developer (API + Business Logic)",
    img: "/img/members/member_3.png",
    cardBg: "#F3E6D8",
    thumbBg: "#E7CDB5",
  },
  {
    id: 4,
    name: "Thitirat Somsupangsri",
    role: "AS DevOps & QA Engineer (Deployment + Testing)",
    img: "/img/members/member_4.png",
    cardBg: "#E1F0E5",
    thumbBg: "#CFE5D7",
  },
];

/** Per-member contacts (keyed by name so layout order doesn’t matter) */
const CONTACTS_BY_NAME: Record<
  string,
  { email: string; github: string; instagram: string }
> = {
  "Napat Kulnarong": {
    email: "napat.kul@ku.th",
    github: "NapatKulnarong",
    instagram: "pattrick.ts",
  },
  "Thitirat Somsupangsri": {
    email: "thitirat.som@ku.th",
    github: "ThitiratSomsupangsri",
    instagram: "talttr",
  },
  "Pakorn Fudulyawajananont": {
    email: "pakorn.f@ku.th",
    github: "PakornF",
    instagram: "fong_pf",
  },
  "Nisara Ploysuttipol": {
    email: "nisara.pl@ku.th",
    github: "fcxbsyo",
    instagram: "flixblessyou",
  },
};

export default function AboutPage() {
  return (
    <>
    <main className="min-h-screen bg-[#bcdcf6]">
      {/* Intro Letter */}
      <PageContainer as="section" className="pt-44 pb-14">
        <div
          className="relative w-full rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)]"
          style={{
            backgroundImage: "url('/bg/paper.png')",
            backgroundSize: "cover",
            backgroundRepeat: "repeat",
          }}
        >
          <Image
            src="/img/mascot/matchy_3.png"
            alt="Matchy mascot smiling"
            width={320}
            height={240}
            className="absolute -top-45 w-[240px] sm:w-[300px]"
            priority
          />
          <div className="relative p-10">
            <h2 className="text-3xl font-extrabold text-[#3B2F4A] mb-6">
              Message from our Team
            </h2>

            <p className="italic text-xl leading-relaxed mb-6 text-gray-800">
              Choosing skincare today can feel overwhelming. With endless products,
              confusing ingredient lists, and bold marketing claims, it’s hard to know
              what’s truly right for your skin. That’s why we created SkinMatch—to make
              skincare simple, safe, and stress-free.
            </p>

            <p className="italic text-xl leading-relaxed mb-6 text-gray-800">
              By analyzing ingredients and building personalized skin profiles,
              we help you understand what supports your skin and what may cause irritation.
              With this knowledge, you can create routines that fit your goals and explore products
              that are both effective and safe.
            </p>

            <p className="italic text-xl leading-relaxed mb-6 text-gray-800">
              Our mission is to help everyone feels confident that each skincare decision they make is the right match for their skin.
            </p>

            <p className="italic text-xl leading-relaxed font-semibold text-gray-800">
              Your Skin, Your Match, Your Best Care!
            </p>
          </div>
        </div>
      </PageContainer>

      {/* Team Grid */}
      <PageContainer as="section" className="pb-16 -mt-4">

        <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
          {TEAM.map((m) => (
            <TeamCard key={m.id} member={m} />
          ))}
        </div>
      </PageContainer>
    </main>
    <SiteFooter />
    </>
  );
}

/* ------------------------------- Card ---------------------------------- */

function TeamCard({ member }: { member: Member }) {
  const [flipped, setFlipped] = useState(false);

  const { roleTitle, roleDetail } = useMemo(() => {
    const match = member.role.match(/^(.*?)(?:\s*\((.*)\))?$/);
    return {
      roleTitle: match?.[1] ?? member.role,
      roleDetail: match?.[2] ?? "",
    };
  }, [member.role]);

  // pull contacts for this member (fallback to Napat’s as default just in case)
  const contacts =
    CONTACTS_BY_NAME[member.name] ?? CONTACTS_BY_NAME["Napat Kulnarong"];

  return (
    <div className="relative [perspective:1200px]">
      <div
        className={`relative h-[320px] md:h-[300px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] p-4 sm:p-5 [backface-visibility:hidden] flex"
          style={{ background: member.cardBg }}
        >
          {/* photo tile with fixed ratio */}
          <div
            className="
              relative mr-5 shrink-0 rounded-2xl overflow-hidden
              aspect-[3/4] w-[34%] sm:w-[30%]
            "
            style={{ background: member.thumbBg }}
          >
            <Image
              src={member.img}
              alt={member.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 34vw, 30vw"
              style={{ objectPosition: "center top" }}
            />
          </div>

          {/* Text area */}
          <div className="relative flex-1 flex flex-col justify-end">
            {/* Contacts pill — inset matches card padding */}
            <button
              onClick={() => setFlipped(true)}
              className="
                absolute right-4 top-4 sm:right-5 sm:top-5
                inline-flex items-center gap-2 rounded-full
                border-2 border-black bg-white px-3 py-1.5 text-sm font-semibold text-gray-800
                shadow-[0_4px_0_rgba(0,0,0,0.25)]
                hover:translate-y-[-1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)]
                active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)]
              "
              aria-label={`Show contacts for ${member.name}`}
            >
              Contacts <span className="text-lg leading-none">→</span>
            </button>

            <div className="pr-28 pb-2">
              <h4 className="text-2xl font-extrabold text-gray-800">{member.name}</h4>
              <p className="mt-2 text-base font-semibold text-gray-700 leading-snug">
                {roleTitle}
                {roleDetail && (
                  <>
                    <br />
                    <span className="font-semibold text-gray-700">({roleDetail})</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between"
          style={{ background: member.cardBg }}
        >
          {/* Flip back */}
          <button
            onClick={() => setFlipped(false)}
            className="self-end inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:translate-y-[-1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)]"
            aria-label="Flip back"
          >
            ← Flip back
          </button>

          {/* Contact links */}
          <div className="flex flex-col gap-4">
            <a
              href={`mailto:${contacts.email}`}
              className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-4 py-2 font-bold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:bg-gray-100"
            >
              <EnvelopeIcon className="h-6 w-6 text-black" />
              {contacts.email}
            </a>

            <a
              href={`https://github.com/${contacts.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-4 py-2 font-bold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:bg-gray-100"
            >
              <FaGithub className="h-6 w-6 text-black" />
              {contacts.github}
            </a>

            <a
              href={`https://instagram.com/${contacts.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-4 py-2 font-bold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:bg-gray-100"
            >
              <FaInstagram className="h-6 w-6 text-black" />
              {contacts.instagram}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
