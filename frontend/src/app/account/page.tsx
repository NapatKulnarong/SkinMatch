"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchProfile } from "@/lib/api.auth";
import {
  clearSession,
  getAuthToken,
  getStoredProfile,
  saveProfile,
  StoredProfile,
} from "@/lib/auth-storage";

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const cached = getStoredProfile();
    if (cached) setProfile(cached);

    fetchProfile(token)
      .then((data) => {
        setProfile(data);
        saveProfile(data);
      })
      .catch((err) => {
        console.error("Unable to load profile", err);
        setError("Session expired. Please log in again.");
        clearSession();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const displayName = profile?.username ?? "SkinMatch Member";
  const displayEmail = profile?.email ?? "hello@skinmatch.app";

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#d3cbe0]">
      <div className="pt-40" />

      <section className="max-w-10xl mx-auto px-6 md:px-8 pb-10">
        {loading && (
          <p className="mb-6 text-center text-sm font-semibold text-gray-700">
            Loading your profile…
          </p>
        )}
        {error && (
          <p className="mb-6 text-center text-sm font-semibold text-red-700">{error}</p>
        )}

        <div className="grid grid-cols-12 gap-6">
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
                <span className="text-[13px] text-[#3970b7]">{displayEmail}</span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/account/settings"
                  className="inline-flex w-full items-center justify-center rounded-[10px] border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
                >
                  Profile Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center rounded-[10px] border-2 border-black bg-[#f6d4d9] px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <div className="col-span-12 md:col-span-9">
            <Panel title="Match History" />
          </div>

          <div className="col-span-12 md:col-span-8">
            <Panel title="Match History" tall />
          </div>

          <div className="col-span-12 md:col-span-4">
            <Panel title="Wishlist" tall />
          </div>
        </div>
      </section>
    </main>
  );
}

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
    </div>
  );
}
