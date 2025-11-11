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

const TIMELINE_EVENTS = [
  {
    date: "August 2025",
    title: "The Spark",
    description: "After countless skincare struggles and confusing ingredient lists, our team realized there had to be a better way. SkinMatch was born from a simple idea: make skincare personal and stress-free.",
    icon: "💡",
    color: "#FFE8D8",
  },
  {
    date: "September 2025",
    title: "Research & Planning",
    description: "We dove deep into dermatology research, interviewed skincare enthusiasts, and analyzed hundreds of ingredients to build our comprehensive database.",
    icon: "📚",
    color: "#D4F1E8",
  },
  {
    date: "October 2025",
    title: "Building the Foundation",
    description: "Development kicked off! Our team crafted the matching algorithm, designed the user experience, and built the infrastructure to support personalized skincare journeys.",
    icon: "⚙️",
    color: "#E8D8FF",
  },
  {
    date: "November 2025",
    title: "Testing & Refinement",
    description: "Beta testing with real users helped us fine-tune recommendations, improve the interface, and ensure our matches were truly helpful for diverse skin types.",
    icon: "🧪",
    color: "#FFD8E8",
  },
  {
    date: "End of November 2025",
    title: "Launch Day!",
    description: "SkinMatch went live! We're now helping people discover their perfect skincare matches and feel confident in every product choice they make.",
    icon: "🚀",
    color: "#D7EBF4",
  },
];

const VALUES = [
  {
    title: "Science-Backed",
    description: "Every recommendation is rooted in dermatological research and ingredient science.",
    icon: "🔬",
    color: "#d7ebf4",
  },
  {
    title: "User-First",
    description: "Your skin goals, sensitivities, and preferences guide everything we build.",
    icon: "🙋🏻",
    color: "#ddd3ee",
  },
  {
    title: "Transparency",
    description: "No hidden agendas. We tell you exactly what's in your products and why it matters.",
    icon: "🔍",
    color: "#f3e6d8",
  },
  {
    title: "Personalized",
    description: "One size doesn't fit all. Your unique skin profile deserves custom care.",
    icon: "✔️",
    color: "#e1f0e5",
  },
];

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen bg-[#bcdcf6]">
        {/* Intro Letter */}
        <PageContainer as="section" className="pt-45 sm:pt-44 pb-10 px-4">
          <div
            className="relative w-full rounded-2xl sm:rounded-3xl border-2 border-black shadow-[4px_6px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.35)]"
            style={{
              backgroundImage: "url('/bg/paper.png')",
              backgroundSize: "cover",
              backgroundRepeat: "repeat",
            }}
          >
            {/* Mascot for desktop */}
            <Image
              src="/img/mascot/matchy_3.png"
              alt="Matchy mascot smiling"
              width={320}
              height={240}
              className="hidden sm:block absolute -top-45 left-8 w-[240px] md:w-[300px]"
              priority
            />
            <div className="relative p-6 sm:p-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#3B2F4A] mb-4 sm:mb-6">
                Message from our Team
              </h2>

              <p className="italic text-base sm:text-xl leading-relaxed mb-4 sm:mb-6 text-gray-800">
              Choosing skincare can be overwhelming with endless products, confusing ingredient lists, 
              and bold marketing claims. SkinMatch simplifies, safely, and stress-free skincare.
              </p>

              <p className="italic text-base sm:text-xl leading-relaxed mb-4 sm:mb-6 text-gray-800">
              By analyzing ingredients and building personalized skin profiles, we help you understand what supports your skin 
              and what irritates it. This knowledge enables you to create effective and safe routines that fit your goals.
              </p>

              <p className="italic text-base sm:text-xl leading-relaxed mb-4 sm:mb-6 text-gray-800">
                Our mission is to help everyone feels confident that each skincare decision they make is the right match for their skin.
              </p>

              <p className="italic text-base sm:text-xl leading-relaxed font-semibold text-gray-800">
                Your Skin, Your Match, Your Best Care!
              </p>
            </div>
          </div>
        </PageContainer>

        {/* Our Values Section */}
        <PageContainer as="section" className="pb-12 sm:pb-16 px-4">
          <div className="lg:text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C3E50] mb-3">
              Our Values
            </h2>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">
              The principles that guide everything we do at SkinMatch
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, idx) => (
              <div
                key={idx}
                className="group rounded-2xl sm:rounded-3xl border-2 border-black shadow-[4px_6px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.35)] p-5 sm:p-6 text-center hover:-translate-y-1 hover:shadow-[6px_10px_0_rgba(0,0,0,0.35)] sm:hover:shadow-[8px_12px_0_rgba(0,0,0,0.35)] transition-all duration-200"
                style={{ background: value.color }}
              >
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-200 relative z-10">
                  {value.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-2 sm:mb-3">
                  {value.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>

        {/* Timeline Section */}
        <PageContainer as="section" className="pb-12 sm:pb-16 px-4">
          <div className="lg:text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C3E50] mb-3">
              Our Journey
            </h2>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto lg:px-4">
              From idea to launch: How SkinMatch came to life
            </p>
          </div>
          
          <div className="relative max-w-5xl mx-auto">
            {/* Vertical line for desktop only */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#2C3E50] transform -translate-x-1/2" />

            {/* Mobile: Simple stacked layout */}
            <div className="md:hidden space-y-6 relative">
              {TIMELINE_EVENTS.map((event, idx) => (
                <div key={idx} className="relative">
                  {/* Connecting line to next card */}
                  {idx < TIMELINE_EVENTS.length - 1 && (
                    <div className="absolute left-8 top-full h-6 w-0.5 bg-[#2C3E50] z-0" />
                  )}
                  
                  <div
                    className="rounded-2xl border-2 border-black shadow-[4px_6px_0_rgba(0,0,0,0.35)] p-5 pt-3 relative z-10"
                    style={{ 
                      background: event.color,
                      backgroundImage: "url('/bg/paper.png')",
                      backgroundSize: "cover",
                      backgroundRepeat: "repeat",
                    }}
                  >
                    {/* Header with step number and date */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-5xl font-extrabold text-gray-800/30">
                        {idx + 1}
                      </div>
                      <div className="inline-block text-xs font-bold text-gray-600 bg-white/70 px-3 py-1 rounded-full">
                        {event.date}
                      </div>
                    </div>
                    
                    {/* Title with emoji in front */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl relative z-10">{event.icon}</span>
                      <h3 className="text-xl font-extrabold text-gray-800">
                        {event.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Alternating layout */}
            <div className="hidden md:block space-y-12">
              {TIMELINE_EVENTS.map((event, idx) => (
                <div
                  key={idx}
                  className={`relative flex items-center ${
                    idx % 2 === 0 ? "flex-row" : "flex-row-reverse"
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-[#2C3E50] border-4 border-[#bcdcf6] z-10 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{idx + 1}</span>
                  </div>

                  {/* Connecting line from dot to card */}
                  <div 
                    className={`absolute top-1/2 h-0.5 bg-[#2C3E50] z-0 ${
                      idx % 2 === 0 
                        ? "left-[calc(50%-2.5rem)] right-[calc(50%+2.5rem)]" 
                        : "left-[calc(50%+2.5rem)] right-[calc(50%-2.5rem)]"
                    }`}
                  />

                  {/* Content card */}
                  <div className={`w-[calc(50%-2.5rem)] ${idx % 2 === 0 ? "pr-0" : "pl-0"}`}>
                    <div
                      className="group rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)] p-6 hover:-translate-y-1 hover:shadow-[8px_12px_0_rgba(0,0,0,0.35)] transition-all duration-200"
                      style={{ 
                        background: event.color,
                        backgroundImage: "url('/bg/paper.png')",
                        backgroundSize: "cover",
                        backgroundRepeat: "repeat",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-5xl shrink-0 group-hover:scale-110 transition-transform duration-200 relative z-10">
                          {event.icon}
                        </div>
                        <div className="flex-1">
                          <div className="inline-block text-sm font-bold text-gray-600 bg-white/70 px-3 py-1 rounded-full mb-3">
                            {event.date}
                          </div>
                          <h3 className="text-2xl font-extrabold text-gray-800 mb-3">
                            {event.title}
                          </h3>
                          <p className="text-base text-gray-700 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="w-[calc(50%-2.5rem)]" />
                </div>
              ))}
            </div>

            {/* End decoration - removed for desktop */}
          </div>
        </PageContainer>

        {/* Team Grid */}
        <PageContainer as="section" className="pb-12 sm:pb-16 px-4">
          <div className="lg:text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C3E50] mb-3">
              Meet the Team
            </h2>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">
              The passionate people behind SkinMatch
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2">
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

  const contacts =
    CONTACTS_BY_NAME[member.name] ?? CONTACTS_BY_NAME["Napat Kulnarong"];

  return (
    <div className="relative [perspective:1200px]">
      <div
        className={`relative min-h-[205px] sm:min-h-[280px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-black shadow-[4px_6px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.35)] p-3 sm:p-4 md:p-5 [backface-visibility:hidden] flex"
          style={{ background: member.cardBg }}
        >
          <div
            className="
              relative mr-3 sm:mr-5 shrink-0 rounded-xl sm:rounded-2xl overflow-hidden
              aspect-[3/4] w-[32%] sm:w-[30%] md:w-[28%]
            "
            style={{ background: member.thumbBg }}
          >
            <Image
              src={member.img}
              alt={member.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 640px) 36vw, (max-width: 768px) 34vw, 30vw"
              style={{ objectPosition: "center top" }}
            />
          </div>

          <div className="relative flex-1 flex flex-col">
            <div className="pr-2 sm:pr-10">
              <h4 className="text-lg sm:text-2xl lg:text-[2.4rem] font-extrabold text-gray-800 leading-tight">
                {member.name}
              </h4>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-base lg:text-lg font-semibold text-gray-700 leading-snug">
                {roleTitle}
                {roleDetail && (
                  <>
                    <br />
                    <span className="font-semibold text-gray-700">({roleDetail})</span>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => setFlipped(true)}
              className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-full border-2 border-black bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-[0_3px_0_rgba(0,0,0,0.25)] transition-all duration-150 sm:w-fit sm:px-3 sm:py-1.5 sm:text-sm lg:text-base sm:gap-2 sm:shadow-[0_4px_0_rgba(0,0,0,0.25)] lg:px-5 lg:py-2 hover:-translate-y-[1px] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] sm:hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(0,0,0,0.25)] sm:active:shadow-[0_2px_0_rgba(0,0,0,0.25)]"
              aria-label={`Show contacts for ${member.name}`}
            >
              Contacts <span className="text-base sm:text-lg lg:text-xl leading-none">→</span>
            </button>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-black shadow-[4px_6px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.35)] p-4 sm:p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between"
          style={{ background: member.cardBg }}
        >
          <button
            onClick={() => setFlipped(false)}
            className="self-end inline-flex items-center gap-1 sm:gap-2 rounded-full border-2 border-black bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:translate-y-[-1px] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] sm:hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(0,0,0,0.25)] sm:active:shadow-[0_2px_0_rgba(0,0,0,0.25)] transition-all duration-150"
            aria-label="Flip back"
          >
            ← Flip back
          </button>

          <div className="flex flex-col gap-2.5 sm:gap-4">
            <a
              href={`mailto:${contacts.email}`}
              className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border-2 border-black bg-white px-3 py-2 sm:px-4 text-xs sm:text-base font-bold text-gray-900 shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:bg-gray-100 active:shadow-[0_1px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] transition-all duration-150"
            >
              <EnvelopeIcon className="h-4 w-4 sm:h-6 sm:w-6 text-black shrink-0" />
              <span className="truncate">{contacts.email}</span>
            </a>

            <a
              href={`https://github.com/${contacts.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border-2 border-black bg-white px-3 py-2 sm:px-4 text-xs sm:text-base font-bold text-gray-900 shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:bg-gray-100 active:shadow-[0_1px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] transition-all duration-150"
            >
              <FaGithub className="h-4 w-4 sm:h-6 sm:w-6 text-black shrink-0" />
              <span className="truncate">{contacts.github}</span>
            </a>

            <a
              href={`https://instagram.com/${contacts.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border-2 border-black bg-white px-3 py-2 sm:px-4 text-xs sm:text-base font-bold text-gray-900 shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:bg-gray-100 active:shadow-[0_1px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] transition-all duration-150"
            >
              <FaInstagram className="h-4 w-4 sm:h-6 sm:w-6 text-black shrink-0" />
              <span className="truncate">{contacts.instagram}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
