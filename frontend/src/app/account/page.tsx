// frontend/src/app/account/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { fetchProfile } from "@/lib/api.auth";
import {
  clearSession,
  getAuthToken,
  getStoredProfile,
  saveProfile,
  setAuthToken,
  StoredProfile,
} from "@/lib/auth-storage";

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountFallback />}> 
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAccount = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check for token in URL first (Google OAuth callback)
        const tokenFromQuery = searchParams.get("token");
        const storedToken = getAuthToken();
        const tokenToUse = tokenFromQuery || storedToken;

        const paramSnapshot = Object.fromEntries(searchParams.entries()) as Record<string, string>;
        console.log("Account initialization:", {
          hasTokenFromQuery: !!tokenFromQuery,
          hasStoredToken: !!storedToken,
          tokenToUse: !!tokenToUse,
          currentPath: window.location.pathname,
          searchParams: paramSnapshot,
        });

        if (!tokenToUse) {
          console.log("No token found, redirecting to login");
          router.replace("/login");
          return;
        }

        // If we have a token from query, store it
        if (tokenFromQuery) {
          console.log("Storing token from query");
          setAuthToken(tokenFromQuery);
        }

        // Try to get cached profile first for immediate display
        const cachedProfile = getStoredProfile();
        if (cachedProfile) {
          console.log("Using cached profile");
          setProfile(cachedProfile);
        }

        // Fetch fresh profile from API
        console.log("Fetching fresh profile...");
        const freshProfile = await fetchProfile(tokenToUse);
        console.log("Fresh profile received:", freshProfile);
        
        setProfile(freshProfile);
        saveProfile(freshProfile);

        // If we came from OAuth callback, clean the URL but don't redirect
        if (tokenFromQuery) {
          console.log("Cleaning OAuth callback URL");
          // Replace current URL without the token parameter but stay on /account
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('token');
          newUrl.searchParams.delete('provider');
          newUrl.searchParams.delete('status');
          window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
          console.log("URL cleaned, staying on account page");
        }

      } catch (err: unknown) {
        console.error("Account initialization failed:", err);
        
        const errorMessage = err instanceof Error ? err.message : "Failed to load your profile";
          setError(`${errorMessage}. Please try logging in again.`);

        // Clear invalid session
        clearSession();

        // Show error for a moment before redirecting
        setTimeout(() => {
          console.log("Redirecting to login due to error");
          router.replace("/login");
        }, 3000);

      } finally {
        setLoading(false);
      }
    };

    initializeAccount();
  }, [router, searchParams]);

  const displayName = useMemo(() => {
    if (!profile) return "SkinMatch Member";
    const parts = [profile.first_name, profile.last_name].filter(
      (part): part is string => Boolean(part && part.trim())
    );
    if (parts.length) return parts.join(" ");
    return profile.username || "SkinMatch Member";
  }, [profile]);
  const displayEmail = profile?.email ?? "hello@skinmatch.app";

  // Default avatar logic
  const avatarSrc = useMemo(() => {
    const url = profile?.avatar_url?.trim();
    if (url) return url;
    return "/img/avatar_placeholder.png";
  }, [profile]);

  const handleLogout = () => {
    console.log("🚪 Logging out...");
    clearSession();
    setProfile(null);
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#d3cbe0] flex items-center justify-center">
        <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6DB1] mx-auto mb-4"></div>
          <p className="text-base font-semibold text-gray-800">Loading your account…</p>
          <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#d3cbe0]">
      <PageContainer className="pt-32 pb-10 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <p className="mt-1 text-xs text-red-600">Redirecting to login...</p>
          </div>
        )}

        {/* Equal-height first row via auto-rows-fr, and make children h-full */}
        <section className="grid grid-cols-12 items-stretch gap-6 auto-rows-fr">
          {/* LEFT PROFILE CARD */}
          <aside className="col-span-12 md:col-span-3">
            <div className="flex h-full flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
              <div className="relative overflow-hidden rounded-xl border-2 border-black">
                <Image
                  src={avatarSrc}
                  alt={displayName}
                  width={600}
                  height={760}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>

              <div className="mt-3">
                <p className="text-[15px] font-extrabold leading-tight text-gray-900">
                  {displayName}
                </p>

                {/* Profile info display - only show available fields */}
                {profile && (
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {profile.username && <div>{profile.username}</div>}
                    {profile.date_of_birth && (
                      <div>DOB: {new Date(profile.date_of_birth).toLocaleDateString()}</div>
                    )}
                    {profile.gender && <div>Gender: {profile.gender}</div>}
                  </div>
                )}
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

          {/* RIGHT: MATCH HISTORY (same height as profile card) */}
          <div className="col-span-12 md:col-span-9">
            <Panel title="Match History" full />
          </div>

          {/* SECOND ROW */}
          <div className="col-span-12 md:col-span-8">
            <Panel title="Recent Activity" tall />
          </div>

          <div className="col-span-12 md:col-span-4">
            <Panel title="Wishlist" tall />
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

function Panel({
  title,
  tall = false,
  full = false,
}: {
  title: string;
  tall?: boolean;
  full?: boolean;
}) {
  const heightClass = full ? "h-full" : tall ? "h-[420px]" : "h-[220px]";
  return (
    <div
      className={[
        "relative rounded-2xl border-2 border-black bg-white",
        "shadow-[6px_8px_0_rgba(0,0,0,0.25)]",
        heightClass,
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
      
      {/* Placeholder content */}
      <div className="pt-16 px-4 text-center text-gray-500">
        <p className="text-sm">{title} content will appear here</p>
        <p className="text-xs mt-2">No data available yet</p>
      </div>
    </div>
  );
}

function AccountFallback() {
  return (
    <main className="min-h-screen bg-[#d3cbe0] flex items-center justify-center">
      <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6DB1] mx-auto mb-4"></div>
        <p className="text-base font-semibold text-gray-800">Loading your account…</p>
      </div>
    </main>
  );
}
