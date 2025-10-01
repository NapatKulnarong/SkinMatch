"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Session = { name: string; email: string; createdAt: number };

export default function AccountPage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sm_session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  // Fallbacks so the page looks good even without a session
  const displayName = session?.name ?? "Napat Kulnarong";
  const displayEmail = session?.email ?? "pattrick.ts";

  return (
    <main className="min-h-screen bg-[#d3cbe0]">
      {/* navbar spacer */}
      <div className="pt-40" />

      <section className="max-w-10xl mx-auto px-6 md:px-8 pb-10">
        {/* 12-col grid to match your composition */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT: profile card */}
          <aside className="col-span-12 md:col-span-3">
            <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
              <div className="relative rounded-xl border-2 border-black overflow-hidden">
                <Image
                  src="/img/member_3.png"
                  alt={displayName}
                  width={600}
                  height={760}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>

              <div className="mt-3">
                <p className="font-extrabold text-[15px] leading-tight text-gray-900">
                  {displayName}
                </p>
                <Link
                  href="#"
                  className="text-[13px] text-[#3970b7] underline underline-offset-2"
                >
                  {displayEmail}
                </Link>
              </div>

              <Link
                href="/account/settings"
                className="mt-3 inline-flex w-full items-center justify-center rounded-[10px] border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
              >
                Profile Settings
              </Link>
            </div>
          </aside>

          {/* TOP RIGHT: match history panel */}
          <div className="col-span-12 md:col-span-9">
            <Panel title="Match History" />
          </div>

          {/* BOTTOM LEFT: large match history panel */}
          <div className="col-span-12 md:col-span-8">
            <Panel title="Match History" tall />
          </div>

          {/* BOTTOM RIGHT: wishlist panel */}
          <div className="col-span-12 md:col-span-4">
            <Panel title="Wishlist" tall />
          </div>
        </div>
      </section>
    </main>
  );
}

/* --------------------------- little panel helper -------------------------- */

function Panel({ title, tall = false }: { title: string; tall?: boolean }) {
  return (
    <div
      className={[
        "relative rounded-2xl border-2 border-black bg-white",
        "shadow-[6px_8px_0_rgba(0,0,0,0.25)]",
        tall ? "h-[420px]" : "h-[220px]",
      ].join(" ")}
    >
      <span
        className="
          absolute left-4 top-3 inline-block rounded-lg border-2 border-black
          bg-[#efefef] px-3 py-1 text-[12px] font-semibold text-gray-800
          shadow-[0_2px_0_rgba(0,0,0,0.2)]
        "
      >
        {title}
      </span>
      {/* blank content for now */}
    </div>
  );
}