import Image from "next/image";
import Link from "next/link";
import { BeakerIcon } from "@heroicons/react/24/solid";

import Navbar from "@/components/Navbar";
import PageContainer from "@/components/PageContainer";
import SiteFooter from "@/components/SiteFooter";
import { SkincareSearchBar } from "@/components/SkincareSearchBar";
import {
  fetchTopSkincareProducts,
  searchSkincareProducts,
  type SkincareProductSummary,
} from "@/lib/api.products";
import { TopProductsSlider } from "./_TopProductsSlider";
import { TrendingSkincareHub } from "./_TrendingSkincareHub";

type SearchParamsShape = Record<string, string | string[] | undefined> | URLSearchParams;
type AwaitableSearchParams =
  | Promise<SearchParamsShape>
  | SearchParamsShape
  | undefined;

type PageProps = {
  searchParams?: AwaitableSearchParams;
};

const isPromise = <T,>(value: unknown): value is Promise<T> =>
  typeof value === "object" &&
  value !== null &&
  "then" in value &&
  typeof (value as { then?: unknown }).then === "function";

export const metadata = {
  title: "Skincare Hub | SkinMatch",
  description:
    "Explore community-loved skincare, see our top 5 products, and read or write reviews in the SkinMatch Skincare Hub.",
};

export default async function SkincareHubPage({ searchParams }: PageProps) {
  const resolvedSearchParams = isPromise<SearchParamsShape>(searchParams)
    ? await searchParams
    : searchParams;
  const queryParam =
    resolvedSearchParams instanceof URLSearchParams
      ? resolvedSearchParams.getAll("q")
      : resolvedSearchParams?.q;
  const queryValue = Array.isArray(queryParam)
    ? queryParam[0] ?? ""
    : queryParam ?? "";
  const query = queryValue.trim();

  let topProducts: SkincareProductSummary[] = [];
  let searchResults: SkincareProductSummary[] = [];
  let searchError: string | null = null;

  try {
    topProducts = await fetchTopSkincareProducts(5);
  } catch (error) {
    console.warn("Failed to load top skincare products", error);
  }

  if (query) {
    try {
      const response = await searchSkincareProducts(query, { limit: 12 });
      searchResults = response.results;
    } catch (error) {
      if (error instanceof Error) {
        searchError = error.message;
      } else {
        searchError =
          "We couldn't complete that search. Please try again in a moment.";
      }
    }
  }

  const hasSearchResults = searchResults.length > 0;

  return (
    <main className="min-h-screen bg-[#e5e9f0] text-[#1f2d26]">
      <Navbar />
      <PageContainer className="pt-40 sm:pt-32 pb-16 space-y-6 md:space-y-7 lg:space-y-10">
        <section className="rounded-[32px] border-2 border-black bg-[#f5f9ff] p-6 lg:p-10 lg:py-6 shadow-[5px_6px_0_rgba(0,0,0,0.25)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="space-y-6">
              <div className="space-y-3 lg:space-y-5">
                <p className="hidden lg:block text-[12px] font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60">
                  Your new skincare control center
                </p>
                <h1 className="flex items-center gap-2 text-xl sm:text-3xl lg:text-4xl font-black text-[#1f2d26]">
                  <BeakerIcon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-[#1f2d26] flex-shrink-0" />
                  <span>Discover the Skincare Hub</span>
                </h1>
                <p className="text-base text-[#1f2d26]/70 max-w-xl md:max-w-none">
                  Search by product, compare reviews, and shop smarter. The hub
                  blends ingredient intelligence with real community feedback so
                  you can trust every addition to your routine.
                </p>
              </div>
              <div className="max-w-xl md:max-w-none">
                <SkincareSearchBar
                  initialQuery={queryValue}
                  buttonLabel="Search hub"
                  suggestionLabel="Popular picks"
                  showHelperHint={false}
                  variant="pill"
                />
              </div>
            </div>
            <div className="hidden lg:flex lg:items-center lg:justify-center ps-13">
              <Image
                src="/img/mascot/matchy_research.png"
                alt="Matchy Lab"
                width={550}
                height={550}
                className="w-auto h-auto max-w-[480px] object-contain"
                unoptimized
              />
            </div>
          </div>
        </section>

        <section
          id="top-picks"
          className="space-y-5 rounded-[28px] border-2 border-black bg-[#f5f9ff] p-5 lg:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)]"
        >
          <div className="space-y-2">
            <p className="hidden lg:block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60">
              Community pulse
            </p>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-[#1f2d26]">
              Top 5 skincare based on user reviews
            </h2>
            <p className="text-sm text-[#1f2d26]/70">
              Refreshed with every review so you always see what the SkinMatch
              community is loving most right now.
            </p>
          </div>
          {topProducts.length ? (
            <TopProductsSlider products={topProducts} />
          ) : (
            <div className="mt-3 rounded-2xl border-2 border-dashed border-black/30 bg-white px-4 py-6 text-sm text-[#1f2d26]/70">
              We&apos;re gathering the latest reviews. Check back soon for fresh
              favorites or use the search above to explore the catalog.
            </div>
          )}
        </section>

        <TrendingSkincareHub />

        <section
          id="reviews"
          className="grid gap-6 rounded-[28px] border-2 border-black bg-gradient-to-br from-[#e8f4ff] to-[#d6e8f5] p-5 lg:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)] lg:grid-cols-2"
        >
          <div className="space-y-3">
            <p className="hidden lg:block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60">
              Read / write product reviews
            </p>
            <h2 className="text-xl lg:text-2xl font-black text-[#1f2d26]">
              Share your experience with the community
            </h2>
            <p className="hidden lg:block text-sm text-[#1f2d26]/70">
              Every product page now includes a dedicated review panel. Rate a
              product, leave a detailed note, or update your take anytime as
              your routine evolves.
            </p>
            <ul className="ml-1 space-y-2 text-sm text-[#1f2d26] font-medium lg:font-normal">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#1f2d26]" />
                Search any product to open its detail page.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#1f2d26]" />
                Sign in to leave a personal review.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#1f2d26]" />
                Shop the formula directly from the detail page.
              </li>
            </ul>
          </div>
          <div className="rounded-[24px] border-2 border-black bg-white p-4 shadow-[0_4px_0_rgba(0,0,0,0.2)]">
            <h3 className="text-lg font-bold text-[#1f2d26]">
              Why reviews matter here
            </h3>
            <p className="mt-2 text-sm text-[#1f2d26]/70">
              Reviews help refine recommendations for everyone. Each submission
              updates the averages you see in the Top 5 list and highlights how
              products perform on real skin types.
            </p>
            <div className="mt-4 rounded-2xl border border-dashed border-black/20 bg-[#e8f4ff] px-4 py-3 text-sm text-[#1f2d26]/70">
              Tip: mention your skin type, routine, or how long you used the
              product to help others understand your results.
            </div>
          </div>
        </section>
      </PageContainer>
      <SiteFooter />
    </main>
  );
}
