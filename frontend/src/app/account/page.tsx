// frontend/src/app/account/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import SiteFooter from "@/components/SiteFooter";
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
  fetchProductDetail,
  type QuizHistoryItem,
  type ProductDetail,
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
        <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6DB1] mx-auto mb-4"></div>
          <p className="text-base font-semibold text-gray-800">Loading your account…</p>
          <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#d3cbe0]">
      <PageContainer className="pt-48 sm:pt-30 pb-16 lg:px-8">
        {/* Header Section */}
        <div className="hidden sm:block mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">My Account</h1>
          <p className="text-base text-gray-700">Manage your profile and view your skincare journey</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border-2 border-[#c89b9b] bg-[#f5e6e6] p-5 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[4px_6px_0_rgba(0,0,0,0.15)]">
            <p className="text-sm font-semibold text-[#8b4949]">{error}</p>
            <p className="mt-1 text-xs text-[#8b4949]/80">Redirecting to login...</p>
          </div>
        )}

        <section className="grid grid-cols-12 gap-6 sm:gap-8">
          {/* LEFT PROFILE CARD */}
          <aside className="col-span-12 lg:col-span-3 -mt-4 sm:mt-0">
            <div className="flex flex-row items-start gap-4 lg:flex-col lg:justify-between rounded-3xl border-2 border-black bg-gradient-to-br from-white to-[#f5f0ff] p-5 shadow-[4px_4px_0_rgba(0,0,0,0.35)] 
                           sm:shadow-[6px_8px_0_rgba(0,0,0,0.25)] h-full md:min-h-[190px] lg:h-full">
              {/* Avatar */}
              <div className="relative w-24 h-24 md:w-42 md:h-42 lg:w-[240px] lg:h-[240px] flex-shrink-0 lg:flex-shrink-0">
                <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-black bg-[#e8dff5]">
                  <Image
                    key={avatarSrc}
                    src={avatarError ? "/img/avatar_placeholder.png" : avatarSrc}
                    alt={displayName}
                    fill
                    className="object-cover"
                    onError={() => setAvatarError(true)}
                    sizes="240px"
                    unoptimized
                  />
                </div>
              </div>

              {/* Right: Name + Buttons (on mobile) */}
              <div className="flex flex-col flex-1 w-full lg:flex-shrink-0 lg:justify-end">
                {/* Profile Info */}
                <div className="space-y-1 text-left">
                  <h2 className="text-lg md:text-3xl lg:text-2xl font-extrabold leading-tight text-gray-900">
                    {displayName}
                  </h2>
                  {profile?.username && (
                    <p className="text-xs md:text-lg lg:text-base font-medium text-[#7C6DB1]">
                      {profile.username}
                    </p>
                  )}
                </div>
                {/* Action Buttons */}
                <div className="pt-3 md:pt-11 lg:pt-6 flex flex-row lg:flex-col gap-2 lg:gap-3 w-full">
                  <Link
                    href="/account/settings"
                    className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#e8dcd4] px-4 py-2 lg:py-3 text-xs lg:text-sm font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT: MATCH HISTORY WITH MASCOT */}
          <div className="col-span-12 lg:col-span-9 relative">
            {/* Matchy Mascot - Positioned on top center of the Match History box */}
            <div className="hidden lg:block absolute -top-46 left-1/2 -translate-x-110 z-20 pointer-events-none">
              <Image
                src="/img/mascot/matchy_hourglass.png"
                alt="Matchy mascot"
                width={200}
                height={200}
                className="w-[180px] sm:w-[300px] drop-shadow-[0_8px_12px_rgba(0,0,0,0.15)]"
                priority
              />
            </div>
            
            <MatchHistoryPanel token={authToken} />
          </div>

          {/* SECOND ROW - Wishlist */}
          <div className="col-span-12 lg:col-span-12 relative mt-4 sm:mt-0">
            <WishlistPanel token={authToken} />
            <div className="hidden lg:block absolute -top-[184px] -right-[30px] sm:-right-[50px] z-20 pointer-events-none">
              <Image
                src="/img/mascot/matchy_heart.png"
                alt="Matchy mascot"
                width={200}
                height={200}
                className="w-[180px] sm:w-[300px] drop-shadow-[0_8px_12px_rgba(0,0,0,0.15)]"
                priority
              />
            </div>
          </div>
        </section>
      </PageContainer>
      </main>
      <SiteFooter />
    </>
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
        "shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.25)] h-full",
        heightClass,
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b-2 border-black/10 px-6 py-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {headerAction}
      </header>
      <div className="flex h-full flex-col">
      <div className="flex-1 overflow-visible px-6 pb-6 pt-4">
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
          className={`inline-flex items-center gap-1.5 rounded-full border-2 border-black px-4 py-1.5 md:py-2 lg:py-1.5 text-xs font-bold 
                    transition shadow-[0_3px_0_rgba(0,0,0,0.2)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] 
                    active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.15)] ${
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
      <div className="h-full overflow-y-auto pr-[8px]">
        {actionError && (
          <div className="mb-4 rounded-2xl border-2 border-[#f0c0c0] bg-[#fbecec] px-4 py-3 text-sm font-semibold text-[#8b4949]">
            {actionError}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-3 sm:mt-4 mr-1">
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
                    className={`group relative rounded-xl sm:rounded-3xl border-2 ${style.border} bg-gradient-to-br ${style.gradient} p-3 sm:p-4 
                              shadow-[0_6px_0_rgba(0,0,0,0.15)] transition-all hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-[0_8px_0_rgba(0,0,0,0.18)] 
                              active:translate-y-0 active:shadow-[0_4px_0_rgba(0,0,0,0.12)] focus:outline-none focus-visible:ring-4 
                              focus-visible:ring-[#7C6DB1]/40 flex flex-col block aspect-square sm:aspect-auto`}
                    prefetch
                  >
                    <div className="mb-1.5 sm:mb-2 flex items-start justify-between">
                      {/* Date badge */}
                      <div className={`rounded-2xl border-2 ${style.badge} px-2.5 py-1.5 shadow-sm`}>
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
                          {dateLabel}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-semibold opacity-70 mt-0.5">{timeLabel}</p>
                      </div>
                      <div className={`hidden sm:block rounded-full ${style.accent} p-2 shadow-sm transition-transform group-hover:translate-x-1 group-hover:scale-110`}>
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

                    <h3 className="mb-2 sm:mb-3 text-base sm:text-xl font-black leading-tight text-gray-900 min-h-[2.4rem] sm:min-h-[3.5rem] line-clamp-2">
                      {primary}
                    </h3>

                    {/* Budget section */}
                    <div className="mt-auto mb-0.5 sm:mb-1 h-[26px] sm:h-[30px] flex items-center">
                      {budgetLabel ? (
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border-2 border-black/10 bg-white/70 px-3 sm:px-4 py-1.5 shadow-sm backdrop-blur-sm">
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#8b7d6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-[10px] sm:text-xs font-bold text-gray-700">{budgetLabel}</span>
                        </div>
                      ) : (
                        <div className="h-[26px] sm:h-[30px]"></div>
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

const WISHLIST_LIMITS = {
  mobile: 6,
  medium: 12,
  large: 12,
} as const;

const getWishlistVisibilityClasses = (index: number) => {
  if (index < WISHLIST_LIMITS.mobile) {
    return "";
  }
  if (index < WISHLIST_LIMITS.medium) {
    return "hidden md:block";
  }
  if (index < WISHLIST_LIMITS.large) {
    return "hidden md:hidden lg:block";
  }
  return "hidden";
};

type WishlistPanelProps = {
  token: string | null;
  variant?: "preview" | "full";
  title?: string;
};

export function WishlistPanel({ token, variant = "preview", title = "Wishlist" }: WishlistPanelProps) {
  const [items, setItems] = useState<import("@/lib/api.wishlist").WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [activeProduct, setActiveProduct] = useState<import("@/lib/api.wishlist").WishlistProduct | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [productDetailError, setProductDetailError] = useState<string | null>(null);
  const detailCacheRef = useRef<Record<string, ProductDetail>>({});
  const currentDetailRequestRef = useRef<string | null>(null);
  const limitDisplay = variant === "preview";
  const isFullVariant = variant === "full";

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setItems([]);
      setLoading(false);
      setError("Sign in to view your wishlist.");
      return () => { cancelled = true; };
    }

    const load = async () => {
      try {
        setLoading(true);
        const { fetchWishlist } = await import("@/lib/api.wishlist");
        const data = await fetchWishlist(token);
        if (cancelled) return;
        setItems(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load wishlist", err);
        setError(err instanceof Error ? err.message : "Failed to load wishlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const handleRemove = async (productId: string) => {
    if (!token) return;
    setRemoving(prev => new Set(prev).add(productId));
    try {
      const { removeFromWishlist, fetchWishlist } = await import("@/lib/api.wishlist");
      await removeFromWishlist(productId, token);
      const refreshed = await fetchWishlist(token);
      setItems(refreshed);
    } catch (err) {
      console.error("Failed to remove from wishlist", err);
    } finally {
      setRemoving(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleShowProductDetails = useCallback(
    async (item: import("@/lib/api.wishlist").WishlistProduct) => {
      if (!item?.id) {
        return;
      }

      setActiveProduct(item);
      setProductDetailError(null);
      currentDetailRequestRef.current = item.id;

      const cached = detailCacheRef.current[item.id];
      if (cached) {
        setProductDetail(cached);
        setProductDetailLoading(false);
        return;
      }

      setProductDetail(null);
      setProductDetailLoading(true);

      try {
        const data = await fetchProductDetail(item.id);
        detailCacheRef.current[item.id] = data;
        if (currentDetailRequestRef.current === item.id) {
          setProductDetail(data);
        }
      } catch (err) {
        if (currentDetailRequestRef.current === item.id) {
          const message =
            err instanceof Error
              ? err.message
              : "We couldn't load this product right now. Please try again.";
          setProductDetailError(message);
        }
      } finally {
        if (currentDetailRequestRef.current === item.id) {
          setProductDetailLoading(false);
        }
      }
    },
    []
  );

  const handleCloseProductDetails = useCallback(() => {
    currentDetailRequestRef.current = null;
    setActiveProduct(null);
    setProductDetail(null);
    setProductDetailError(null);
    setProductDetailLoading(false);
  }, []);

  const handleRetryProductDetails = useCallback(() => {
    if (activeProduct) {
      void handleShowProductDetails(activeProduct);
    }
  }, [activeProduct, handleShowProductDetails]);

  if (loading) {
    return (
      <Panel title={title} tall={!isFullVariant} full={isFullVariant}>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#7C6DB1]" />
            <p className="text-sm font-semibold text-gray-700">Loading your wishlist…</p>
          </div>
        </div>
      </Panel>
    );
  }

  if (error && !items.length) {
    return (
      <Panel title={title} tall={!isFullVariant} full={isFullVariant}>
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
          <p className="text-base font-bold text-gray-900">{error}</p>
        </div>
      </Panel>
    );
  }

  if (!items.length) {
    return (
      <Panel
        title={title}
        tall={!isFullVariant}
        full={isFullVariant}
        emptyMessage="Save your favorite products here."
        headerAction={
          <button
            onClick={() => setEditMode(!editMode)}
            className={`inline-flex items-center gap-1.5 rounded-full border-2 border-black px-4 py-1.5 text-xs font-bold transition shadow-[0_3px_0_rgba(0,0,0,0.2)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.15)] ${
              editMode ? 'bg-[#c8e6d7] text-[#2d5f4d]' : 'bg-white text-gray-900'
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
      />
    );
  }

  const hasMoreThanMobile = limitDisplay && items.length > WISHLIST_LIMITS.mobile;
  const hasMoreThanMedium = limitDisplay && items.length > WISHLIST_LIMITS.medium;
  const hasMoreThanLarge = limitDisplay && items.length > WISHLIST_LIMITS.large;
  const shouldShowViewAll = hasMoreThanMobile || hasMoreThanMedium || hasMoreThanLarge;

  // Determine the appropriate visibility class based on item count
  // Show button at breakpoints where items are hidden due to limits
  const getViewAllVisibilityClass = () => {
    if (!shouldShowViewAll) return "";
    
    // If more than 12 items: items 7-12 are hidden on mobile, items 13+ are hidden on all preview sizes
    // Show button on all breakpoints (mobile needs it for items 7-12, medium+ needs it for items 13+)
    if (items.length > WISHLIST_LIMITS.large) {
      return ""; // Show on all breakpoints
    }
    // If 7-12 items: items 7-12 are hidden on mobile only, visible on medium+
    // Show button on mobile only
    return "md:hidden";
  };

  const viewAllButtonClassName =
    "inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-4 py-1.5 text-xs font-bold text-gray-900 shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:bg-[#f5f4ff] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.15)]";

  return (
    <Panel
      title={title}
      tall={!isFullVariant}
      full={isFullVariant}
      headerAction={
        <button
          onClick={() => setEditMode(!editMode)}
          className={`inline-flex items-center gap-1.5 rounded-full border-2 border-black px-4 py-1.5 md:py-2 lg:py-1.5 text-xs font-bold transition shadow-[0_3px_0_rgba(0,0,0,0.2)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.15)] ${
            editMode ? 'bg-[#c8e6d7] text-[#2d5f4d]' : 'bg-white text-gray-900'
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
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pr-2 items-stretch">
        {items.map((p, index) => {
          const visibilityClass = limitDisplay ? getWishlistVisibilityClasses(index) : "";
          const cardClassName = ["relative h-full", visibilityClass].filter(Boolean).join(" ");
          return (
            <div key={p.id} className={cardClassName} data-testid="wishlist-card">
              <div className="h-full flex flex-col rounded-2xl border-2 border-black/80 sm:border-black/80 bg-white shadow-[0_6px_0_rgba(0,0,0,0.15)] overflow-hidden">
                <div className="flex sm:block h-36 sm:h-auto relative">
                  <div className="w-32 h-full sm:w-auto sm:h-auto sm:aspect-[4/3] bg-[#f7f5ff] border-r-2 border-black/80 sm:border-r-0 sm:border-b-2 z-0">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={320}
                        height={320}
                        className="h-full w-full object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#7C6DB1] font-bold">No Image</div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 flex-1 relative pb-14 sm:pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">{p.brand}</p>
                        <h4 className="text-sm sm:text-base font-extrabold text-gray-900 line-clamp-2">{p.name}</h4>
                      </div>
                    </div>
                    <div className="mt-1 sm:mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{p.currency} {Number(p.price).toFixed(2)}</span>
                    </div>
                    <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:border-t border-black/10 pt-2 sm:pt-3 sm:static absolute bottom-3 right-3 z-10 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => handleShowProductDetails(p)}
                        className="inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-3 py-1.5 text-[10px] font-bold text-[#1f2d26] shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#f5f4ff] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                      >
                        Details
                      </button>
                      {p.productUrl && (
                        <a
                          href={p.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#B9375D] px-3 py-1.5 text-[10px] font-bold text-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a72f52] hover:shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                        >
                          Shop
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {editMode && (
                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={removing.has(p.id)}
                    className={`absolute -top-3 -right-3 z-10 rounded-full border-2 border-black bg-[#f5e6e6] p-2.5 shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:bg-[#fdd] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0 active:shadow-[0_2px_0_rgba(0,0,0,0.15)] ${
                      removing.has(p.id) ? "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_4px_0_rgba(0,0,0,0.2)]" : ""
                    }`}
                    aria-label="Remove from wishlist"
                  >
                    <svg
                      className={`h-5 w-5 text-[#8b4949] ${removing.has(p.id) ? "animate-pulse" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {shouldShowViewAll && (
        <div className="mt-6 flex justify-center">
          <Link
            href="/account/wishlist"
            className={`${viewAllButtonClassName} ${getViewAllVisibilityClass()}`}
          >
            View all
          </Link>
        </div>
      )}
      {activeProduct && (
        <WishlistProductDetailModal
          product={activeProduct}
          detail={productDetail}
          loading={productDetailLoading}
          error={productDetailError}
          onClose={handleCloseProductDetails}
          onRetry={handleRetryProductDetails}
        />
      )}
    </Panel>
  );
}

type WishlistProductDetailModalProps = {
  product: import("@/lib/api.wishlist").WishlistProduct;
  detail: ProductDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
};

function WishlistProductDetailModal({
  product,
  detail,
  loading,
  error,
  onClose,
  onRetry,
}: WishlistProductDetailModalProps) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const previous = typeof document !== "undefined" ? document.body.style.overflow : "";
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = previous;
      }
    };
  }, []);

  const display = detail ?? null;
  const imageUrl = display?.imageUrl ?? product.image ?? null;
  const brand = display?.brand ?? product.brand;
  const name = display?.productName ?? product.name;
  const categoryLabel =
    display?.categoryLabel ?? capitalizeLabel(display?.category ?? product.category);
  const priceLabel = formatPriceLabel(
    display?.price ?? product.price,
    display?.currency ?? product.currency
  );
  const rating = display?.averageRating ?? null;
  const reviewCount = display?.reviewCount ?? null;
  const heroIngredients = display?.heroIngredients ?? [];
  const ingredientDetails = display?.ingredients ?? [];
  const concerns = display?.concerns ?? [];
  const skinTypes = display?.skinTypes ?? [];
  const restrictions = display?.restrictions ?? [];
  const affiliateUrl =
    display?.affiliateUrl ?? display?.productUrl ?? product.productUrl ?? null;

  const ingredientPreview = ingredientDetails.slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${brand} ${name}`}
        className="relative flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border-2 border-black bg-white shadow-[8px_10px_0_rgba(0,0,0,0.25)]"
      >
        <div className="flex-1 overflow-y-auto">
          <div className="grid min-h-full gap-5 px-5 pb-6 pt-8 md:grid-cols-[220px,1fr] md:pt-8">
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.18)] 
                            transition hover:-translate-y-0.5 hover:bg-[#f7f7f7] hover:shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                  aria-label="Close product details"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative overflow-hidden rounded-2xl border-2 border-black/10 bg-[#f7f7f7] pb-[85%]">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={`${brand} ${name}`}
                    fill
                    unoptimized
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 60vw, 220px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-xs font-semibold text-[#7a628c]">
                    Image coming soon
                  </div>
                )}
              </div>

              {affiliateUrl && (
                <a
                  href={affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#B9375D] px-4 py-2 text-sm 
                            font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a72f52] 
                            hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)]"
                >
                  Shop with affiliate
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M12.293 2.293a1 1 0 011.414 0l4 4A1 1 0 0117 8h-3v7a1 1 0 11-2 0V7a1 1 0 011-1h2.586L12.293 3.707a1 1 0 010-1.414z" />
                    <path d="M5 4a3 3 0 00-3 3v7a3 3 0 003 3h7a3 3 0 003-3v-1a1 1 0 112 0v1a5 5 0 01-5 5H5a5 5 0 01-5-5V7a5 5 0 015-5h1a1 1 0 110 2H5z" />
                  </svg>
                </a>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B9375D]">{brand}</p>
                <h2 className="text-2xl font-extrabold leading-tight text-[#1f2d26]">{name}</h2>
                <p className="text-sm font-semibold text-[#3C3D37] text-opacity-70">{categoryLabel}</p>
                {(rating || priceLabel) && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#1f2d26]">
                    {rating ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-black/20 bg-[#fff3c4] px-3 py-1 font-semibold">
                        <svg className="h-4 w-4 text-[#f59e0b]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 8.72c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {rating.toFixed(1)}
                        <span className="text-xs text-[#3C3D37] text-opacity-60">({reviewCount ?? 0})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#3C3D37] text-opacity-60">No reviews yet</span>
                    )}
                    {priceLabel && (
                      <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-[#1f2d26]">
                        {priceLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {display?.summary && (
                <p className="text-sm leading-relaxed text-[#3C3D37] text-opacity-80">{display.summary}</p>
              )}

              {display?.description && (
                <div className="rounded-2xl border border-[#d7d7d7] bg-[#fafafa] p-4 text-sm leading-relaxed text-[#3C3D37]">
                  {display.description}
                </div>
              )}

              {heroIngredients.length ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1f2d26] uppercase tracking-[0.12em]">
                    Hero ingredients
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {heroIngredients.map((ingredient) => (
                      <span
                        key={ingredient}
                        className="inline-flex items-center rounded-full border border-black/10 bg-[#fce8ef] px-3 py-1 text-xs font-semibold text-[#B9375D]"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {ingredientPreview.length ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1f2d26] uppercase tracking-[0.12em]">
                    Ingredient highlights
                  </h3>
                  <ul className="mt-3 grid gap-2 text-sm text-[#3C3D37] text-opacity-80 sm:grid-cols-2">
                    {ingredientPreview.map((ingredient, index) => (
                      <li key={`${ingredient.name}-${ingredient.order ?? index}`} className="flex items-start gap-2">
                        <span
                          className={`mt-1 inline-flex h-2 w-2 rounded-full ${
                            ingredient.highlight ? "bg-[#B9375D]" : "bg-[#3C3D37]/40"
                          }`}
                          aria-hidden
                        />
                        <div>
                          <p className="font-semibold text-[#1f2d26]">{ingredient.name}</p>
                          {ingredient.inciName && (
                            <p className="text-xs uppercase tracking-[0.12em] text-[#3C3D37] text-opacity-50">
                              {ingredient.inciName}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(concerns.length || skinTypes.length || restrictions.length) && (
                <div className="space-y-3">
                  {concerns.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">Targets</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {concerns.map((concern) => (
                          <span
                            key={concern}
                            className="rounded-full border border-black/10 bg-[#e6f5f0] px-3 py-1 font-semibold text-[#1f2d26]"
                          >
                            {concern}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {skinTypes.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">
                        Skin type fit
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {skinTypes.map((skinType) => (
                          <span
                            key={skinType}
                            className="rounded-full border border-black/10 bg-[#fff3c4] px-3 py-1 font-semibold text-[#1f2d26]"
                          >
                            {capitalizeLabel(skinType)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {restrictions.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2d26]">
                        Preferences met
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {restrictions.map((restriction) => (
                          <span
                            key={restriction}
                            className="rounded-full border border-black/10 bg-[#e8e5ff] px-3 py-1 font-semibold text-[#33308a]"
                          >
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {error ? (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="shrink-0 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {loading && !detail ? (
                <p className="text-xs font-semibold text-[#3C3D37] text-opacity-60">
                  Fetching product details…
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPriceLabel(price: number | null, currency?: string) {
  if (typeof price !== "number") return null;
  if (!currency || price <= 0) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return null;
  }
}

function AccountFallback() {
  return (
    <main className="min-h-screen bg-[#d3cbe0] flex items-center justify-center">
      <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6DB1] mx-auto mb-4"></div>
        <p className="text-base font-semibold text-gray-800">Loading your account…</p>
      </div>
    </main>
  );
}

function formatBudgetLabel(value: string | null) {
  if (!value) return "Not provided";
  if (value === "mid") return "Mid-range";
  if (value === "premium") return "Premium";
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
