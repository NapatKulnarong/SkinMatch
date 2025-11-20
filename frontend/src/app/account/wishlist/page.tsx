"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import SiteFooter from "@/components/SiteFooter";
import { getAuthToken } from "@/lib/auth-storage";
import { WishlistPanel } from "../page";

export default function WishlistViewAllPage() {
  const router = useRouter();
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const storedToken = getAuthToken();
    if (!storedToken) {
      router.replace("/login");
    } else {
      setAuthTokenState(storedToken);
    }
    setCheckingToken(false);
  }, [router]);

  if (checkingToken) {
    return (
      <main className="min-h-screen bg-[#d3cbe0] flex items-center justify-center">
        <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6DB1] mx-auto mb-4" />
          <p className="text-base font-semibold text-gray-800">Preparing your wishlist…</p>
          <p className="text-sm text-gray-600 mt-2">Please wait a moment</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#d3cbe0]">
        <PageContainer className="pt-36 md:pt-28 pb-16 lg:px-8">
          <header className="mt-4 flex flex-col gap-4 rounded-[32px] border-2 border-dashed border-black bg-white/80 px-6 py-6 shadow-[4px_6px_0_rgba(0,0,0,0.2)] sm:mt-0 sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-700/70">
                Wishlist Library
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
                All Wishlist Products
              </h1>
              <p className="mt-3 text-gray-800/75 sm:text-lg">
                Every product you save lives here. Manage the list, open their details, or go shop them.
              </p>
            </div>
            <Link
              href="/account"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-[#f5f5ff] px-5 py-2 font-semibold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] sm:w-auto"
            >
              ← Back to account
            </Link>
          </header>
          <div className="mt-6 sm:mt-8">
            <WishlistPanel token={authToken} variant="full" title="All Wishlist Products" />
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
