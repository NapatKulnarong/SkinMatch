// frontend/src/app/account/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
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
  normalizeStoredProfile,
} from "@/lib/auth-storage";
import {
  fetchQuizHistory,
  deleteQuizHistory,
  type QuizHistoryItem,
} from "@/lib/api.quiz";

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
  const [authToken, setAuthTokenState] = useState<string | null>(() => getAuthToken());

  useEffect(() => {
    const initializeAccount = async () => {
      try {
        setLoading(true);
        setError(null);
        
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

        if (tokenFromQuery) {
          console.log("Storing token from query");
          setAuthToken(tokenFromQuery);
          setAuthTokenState(tokenFromQuery);
        } else if (storedToken) {
          console.log("Refreshing stored token timestamp");
          setAuthToken(storedToken);
          setAuthTokenState(storedToken);
        }

        const cachedProfile = getStoredProfile();
        if (cachedProfile) {
          console.log("Using cached profile");
          setProfile(cachedProfile);
        }

        console.log("Fetching fresh profile...");
        const freshProfile = normalizeStoredProfile(await fetchProfile(tokenToUse));
        console.log("Fresh profile received:", freshProfile);

        setProfile(freshProfile);
        saveProfile(freshProfile);
        setAuthTokenState(tokenToUse);

        if (tokenFromQuery) {
          console.log("Cleaning OAuth callback URL");
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

        clearSession();

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

  const avatarSrc = useMemo(() => {
    const url = profile?.avatar_url?.trim();
    if (url) return url;
    return "/img/avatar_placeholder.png";
  }, [profile]);

  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarSrc]);

  const handleLogout = () => {
    console.log("🚪 Logging out...");
    clearSession();
    setProfile(null);
    setAuthTokenState(null);
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
      <PageContainer className="pt-28 pb-16 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">My Account</h1>
          <p className="text-base text-gray-700">Manage your profile and view your skincare journey</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border-2 border-[#c89b9b] bg-[#f5e6e6] p-5 shadow-[4px_6px_0_rgba(0,0,0,0.15)]">
            <p className="text-sm font-semibold text-[#8b4949]">{error}</p>
            <p className="mt-1 text-xs text-[#8b4949]/80">Redirecting to login...</p>
          </div>
        )}

        <section className="grid grid-cols-12 gap-6">
          {/* LEFT PROFILE CARD */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="flex flex-col rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#f5f0ff] p-6 shadow-[6px_8px_0_rgba(0,0,0,0.25)] h-full">
              {/* Avatar */}
              <div className="relative mx-auto w-[240px] h-[240px] flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-black bg-[#e8dff5] shadow-[4px_6px_0_rgba(0,0,0,0.2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={avatarSrc}
                    src={avatarError ? "/img/avatar_placeholder.png" : avatarSrc}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                </div>
              </div>

              {/* Profile Info */}
              <div className="mt-6 space-y-2 text-center flex-shrink-0">
                <h2 className="text-3xl font-extrabold leading-tight text-gray-900">
                  {displayName}
                </h2>
                {profile?.username && (
                  <p className="text-base font-semibold text-[#7C6DB1]">
                    {profile.username}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-auto pt-6 flex flex-col gap-3 flex-shrink-0">
                <Link
                  href="/account/settings"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-5 py-3 text-sm font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Profile Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#e8dcd4] px-5 py-3 text-sm font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT: MATCH HISTORY WITH MASCOT */}
          <div className="col-span-12 lg:col-span-8 relative">
            {/* Matchy Mascot - Positioned on top center of the Match History box */}
            <div className="absolute -top-46 left-1/2 -translate-x-110 z-20 pointer-events-none">
              <Image
                src="/img/mascot/matchy_5.png"
                alt="Matchy mascot"
                width={200}
                height={200}
                className="w-[180px] sm:w-[300px] drop-shadow-[0_8px_12px_rgba(0,0,0,0.15)]"
                priority
              />
            </div>
            
            <MatchHistoryPanel token={authToken} />
          </div>

          {/* SECOND ROW - Recent Activity */}
          <div className="col-span-12 lg:col-span-7">
            <Panel title="Recent Activity" tall emptyMessage="Your recent skincare activity will appear here." />
          </div>

          {/* SECOND ROW - Wishlist */}
          <div className="col-span-12 lg:col-span-5">
            <Panel title="Wishlist" tall emptyMessage="Save your favorite products here." />
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
  emptyMessage,
  children,
  headerAction,
}: {
  title: string;
  tall?: boolean;
  full?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
  headerAction?: ReactNode;
}) {
  const heightClass = full ? "min-h-[500px]" : tall ? "min-h-[380px]" : "min-h-[220px]";
  return (
    <div
      className={[
        "relative rounded-3xl border-2 border-black bg-white",
        "shadow-[6px_8px_0_rgba(0,0,0,0.25)] h-full",
        heightClass,
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b-2 border-black/10 px-6 py-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {headerAction}
      </header>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
          {children ? (
            <div className="h-full">{children}</div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-2xl bg-[#f5f0ff] p-6 border-2 border-black/5">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#d3cbe0] flex items-center justify-center">
                  <svg className="h-6 w-6 text-[#7C6DB1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">{emptyMessage ?? `${title} content will appear here.`}</p>
                <p className="mt-1 text-xs text-gray-500">Check back later for updates</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchHistoryPanel({ token }: { token: string | null }) {
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setHistory([]);
      setLoading(false);
      setError("Sign in to view your match history.");
      return () => {
        cancelled = true;
      };
    }

    const loadHistory = async () => {
      try {
        setLoading(true);
        const items = await fetchQuizHistory(token);
        if (cancelled) return;
        setHistory(items);
        setError(null);
        setActionError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load quiz history", err);
        setError(err instanceof Error ? err.message : "Failed to load match history");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleDelete = async (item: QuizHistoryItem, key: string) => {
    if (!token) {
      setActionError("Please sign in again to manage your matches.");
      return;
    }

    const identifier = item.profileId ?? item.sessionId;
    if (!identifier) {
      setActionError("This legacy match can't be deleted automatically yet.");
      return;
    }

    setActionError(null);
    setDeletingKeys(prev => new Set(prev).add(key));

    try {
      await deleteQuizHistory(identifier, token);
      const refreshed = await fetchQuizHistory(token);
      setHistory(refreshed);
    } catch (err) {
      console.error("Failed to delete quiz history item", err);
      const message = err instanceof Error ? err.message : "Failed to delete match";
      setActionError(message);
    } finally {
      setDeletingKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const visibleHistory = history.slice(0, 6);

  if (loading) {
    return (
      <Panel title="Match History" full>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#7C6DB1]" />
            <p className="text-sm font-semibold text-gray-700">Loading your matches…</p>
          </div>
        </div>
      </Panel>
    );
  }

  if (error && !visibleHistory.length) {
    return (
      <Panel title="Match History" full>
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
          <div className="rounded-full bg-[#f5e6e6] p-4">
            <svg className="h-8 w-8 text-[#c89b9b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">{error}</p>
            <p className="mt-2 text-sm text-gray-600">
              {token ? "Try refreshing the page" : "Please log in again"}
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  if (!visibleHistory.length) {
    return (
      <Panel title="Match History" full>
        <div className="flex h-full flex-col items-center justify-center text-center px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#e8dff5] to-[#d3cbe0] p-8 mb-6 border-2 border-black/5">
            <svg className="h-20 w-20 mx-auto text-[#7C6DB1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-3">Begin Your Journey</h3>
          <p className="text-base text-gray-700 max-w-md mb-8">
            Take your first quiz to discover personalized skincare recommendations crafted just for you.
          </p>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-gradient-to-r from-[#c8e6d7] to-[#b5d4c8] px-8 py-4 text-base font-bold text-gray-900 shadow-[0_6px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[2px] hover:shadow-[0_10px_0_rgba(0,0,0,0.25)] active:translate-y-[1px] active:shadow-[0_4px_0_rgba(0,0,0,0.25)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Take Your First Quiz
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel 
      title="Match History" 
      full
      headerAction={
        <button
          onClick={() => setEditMode(!editMode)}
          className={`inline-flex items-center gap-1.5 rounded-full border-2 border-black px-4 py-1.5 text-xs font-bold transition shadow-[0_3px_0_rgba(0,0,0,0.2)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.15)] ${
            editMode 
              ? 'bg-[#c8e6d7] text-[#2d5f4d]' 
              : 'bg-white text-gray-900'
          }`}
        >
          {editMode ? (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Done</span>
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </>
          )}
        </button>
      }
    >
      <div className="h-full overflow-y-auto pr-2">
        {actionError && (
          <div className="mb-4 rounded-2xl border-2 border-[#f0c0c0] bg-[#fbecec] px-4 py-3 text-sm font-semibold text-[#8b4949]">
            {actionError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
          {visibleHistory.map((item, index) => {
            const key = item.sessionId ?? item.profileId ?? `${item.completedAt}-${index}`;
            const completedDate = new Date(item.completedAt);
            const dateLabel = completedDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeLabel = completedDate.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });
            
            const primary = item.primaryConcerns.length
              ? item.primaryConcerns.map(capitalizeLabel).join(" & ")
              : "General Skincare";
            
            const budgetLabel = item.budget ? formatBudgetLabel(item.budget) : null;
            const profileLink = item.profileId ? `/account/match/${item.profileId}` : null;
            const isDeleting = deletingKeys.has(key);

            const concernStyles: Record<string, { gradient: string; badge: string; accent: string; border: string }> = {
              'acne': { 
                gradient: 'from-[#fef6f6] via-[#fdf0f0] to-[#fcebeb]', 
                badge: 'bg-[#ffe8e8] text-[#b05555] border-[#ffd4d4]',
                accent: 'bg-[#e88888]',
                border: 'border-[#ffc9c9]'
              },
              'breakout': { 
                gradient: 'from-[#fef6f6] via-[#fdf0f0] to-[#fcebeb]', 
                badge: 'bg-[#ffe8e8] text-[#b05555] border-[#ffd4d4]',
                accent: 'bg-[#e88888]',
                border: 'border-[#ffc9c9]'
              },
              'blackhead': { 
                gradient: 'from-[#fafafa] via-[#f5f5f5] to-[#f0f0f0]', 
                badge: 'bg-[#eeeeee] text-[#666666] border-[#e0e0e0]',
                accent: 'bg-[#999999]',
                border: 'border-[#d9d9d9]'
              },
              'aging': { 
                gradient: 'from-[#fefaf5] via-[#fdf6ee] to-[#fcf2e8]', 
                badge: 'bg-[#fff0dc] text-[#b38855] border-[#ffe5c4]',
                accent: 'bg-[#d4a574]',
                border: 'border-[#ffdeb8]'
              },
              'wrinkle': { 
                gradient: 'from-[#fefaf5] via-[#fdf6ee] to-[#fcf2e8]', 
                badge: 'bg-[#fff0dc] text-[#b38855] border-[#ffe5c4]',
                accent: 'bg-[#d4a574]',
                border: 'border-[#ffdeb8]'
              },
              'dryness': { 
                gradient: 'from-[#f5fbfe] via-[#eff8fd] to-[#e8f4fc]', 
                badge: 'bg-[#e0f2fe] text-[#5588b0] border-[#c4e3fc]',
                accent: 'bg-[#74a8d4]',
                border: 'border-[#b8d9f5]'
              },
              'hydration': { 
                gradient: 'from-[#f5fbfe] via-[#eff8fd] to-[#e8f4fc]', 
                badge: 'bg-[#e0f2fe] text-[#5588b0] border-[#c4e3fc]',
                accent: 'bg-[#74a8d4]',
                border: 'border-[#b8d9f5]'
              },
              'hyperpigmentation': { 
                gradient: 'from-[#faf7fe] via-[#f5f0fd] to-[#f0eafc]', 
                badge: 'bg-[#ede5ff] text-[#8855b0] border-[#ddc9ff]',
                accent: 'bg-[#a874d4]',
                border: 'border-[#d1b8f5]'
              },
              'pigment': { 
                gradient: 'from-[#faf7fe] via-[#f5f0fd] to-[#f0eafc]', 
                badge: 'bg-[#ede5ff] text-[#8855b0] border-[#ddc9ff]',
                accent: 'bg-[#a874d4]',
                border: 'border-[#d1b8f5]'
              },
              'sensitivity': { 
                gradient: 'from-[#fef7fa] via-[#fdf0f5] to-[#fceaf0]', 
                badge: 'bg-[#ffe5f0] text-[#b05588] border-[#ffc9dc]',
                accent: 'bg-[#d474a8]',
                border: 'border-[#f5b8d1]'
              },
              'default': { 
                gradient: 'from-[#f9f7fe] via-[#f3f0fc] to-[#edeafa]', 
                badge: 'bg-[#e9e2ff] text-[#6b5b9b] border-[#d4c9f0]',
                accent: 'bg-[#9b88c8]',
                border: 'border-[#c8b8e5]'
              },
            };

            const firstConcern = item.primaryConcerns[0]?.toLowerCase() || 'default';
            const matchedKey = Object.keys(concernStyles).find(key => firstConcern.includes(key)) || 'default';
            const style = concernStyles[matchedKey];

            if (profileLink) {
              return (
                <div key={key} className="relative">
                  <Link
                    href={profileLink}
                    className={`group relative rounded-3xl border-2 ${style.border} bg-gradient-to-br ${style.gradient} p-6 shadow-[0_6px_0_rgba(0,0,0,0.15)] transition-all hover:-translate-y-2 hover:shadow-[0_10px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_4px_0_rgba(0,0,0,0.12)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7C6DB1]/40 flex flex-col block`}
                    prefetch
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`rounded-2xl border-2 ${style.badge} px-4 py-2.5 shadow-sm`}>
                        <p className="text-xs font-black uppercase tracking-wider">
                          {dateLabel}
                        </p>
                        <p className="text-[10px] font-semibold opacity-70 mt-0.5">{timeLabel}</p>
                      </div>
                      <div className={`rounded-full ${style.accent} p-2 shadow-sm transition-transform group-hover:translate-x-1 group-hover:scale-110`}>
                        <svg 
                          className="h-4 w-4 text-white" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>

                    <h3 className="mb-4 text-xl font-black leading-tight text-gray-900 min-h-[3.5rem] line-clamp-2">
                      {primary}
                    </h3>

                    <div className="mb-4 h-[30px] flex items-center">
                      {budgetLabel ? (
                        <div className="inline-flex items-center gap-2 rounded-full border-2 border-black/10 bg-white/70 px-4 py-1.5 shadow-sm backdrop-blur-sm">
                          <svg className="h-3.5 w-3.5 text-[#8b7d6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-bold text-gray-700">{budgetLabel}</span>
                        </div>
                      ) : (
                        <div className="h-[30px]"></div>
                      )}
                    </div>
                  </Link>

                  {editMode && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        void handleDelete(item, key);
                      }}
                      disabled={isDeleting}
                      className={`absolute -top-3 -right-3 z-10 rounded-full border-2 border-black bg-[#f5e6e6] p-2.5 shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:bg-[#fdd] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0 active:shadow-[0_2px_0_rgba(0,0,0,0.15)] ${
                        isDeleting ? "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_4px_0_rgba(0,0,0,0.2)]" : ""
                      }`}
                      aria-label="Delete match"
                    >
                      <svg
                        className={`h-5 w-5 text-[#8b4949] ${isDeleting ? "animate-pulse" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div key={key} className="relative">
                <div className="relative rounded-3xl border-2 border-dashed border-black/20 bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] p-6 opacity-50">
                  <div className="mb-4">
                    <div className="inline-block rounded-2xl border-2 border-[#c8c8c8] bg-[#d9d9d9] px-4 py-2.5">
                      <p className="text-xs font-black uppercase tracking-wider text-gray-600">
                        {dateLabel}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{timeLabel}</p>
                    </div>
                  </div>

                  <h3 className="mb-3 text-xl font-black leading-tight text-gray-600 line-clamp-2">
                    {primary}
                  </h3>

                  <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-[#c8c8c8] bg-[#d9d9d9] px-4 py-3">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs font-bold text-gray-600">
                      Legacy Match (Unavailable)
                    </span>
                  </div>
                </div>

                {editMode && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDelete(item, key);
                    }}
                    disabled={isDeleting}
                    className={`absolute -top-3 -right-3 z-10 rounded-full border-2 border-black bg-[#f5e6e6] p-2.5 shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:bg-[#fdd] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0 active:shadow-[0_2px_0_rgba(0,0,0,0.15)] ${
                      isDeleting ? "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_4px_0_rgba(0,0,0,0.2)]" : ""
                    }`}
                    aria-label="Delete match"
                  >
                    <svg
                      className={`h-5 w-5 text-[#8b4949] ${isDeleting ? "animate-pulse" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
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

function formatBudgetLabel(value: string | null) {
  if (!value) return "Not provided";
  if (value === "mid") return "Mid-range";
  if (value === "premium") return "Premium / Luxury";
  return capitalizeLabel(value);
}

function capitalizeLabel(text: string) {
  if (!text) return "";
  return text
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}