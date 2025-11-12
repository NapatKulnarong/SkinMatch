import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlassIcon, SparklesIcon, StarIcon } from "@heroicons/react/24/solid";

import Navbar from "@/components/Navbar";
import PageContainer from "@/components/PageContainer";
import { TRENDING_INGREDIENTS } from "@/constants/ingredients";
import {
  fetchIngredientSearch,
  type IngredientSearchItem,
  type IngredientSummary,
  type IngredientSearchProduct,
} from "@/lib/api.ingredients";

const FALLBACK_PRODUCT_MESSAGE = "Preview coming soon";

const toTitleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatPrice = (price: number | null, currency: string) => {
  if (price === null) {
    return null;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(0)}`;
  }
};

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

export default async function IngredientSearchPage({ searchParams }: PageProps) {
  const resolvedSearchParams = isPromise<SearchParamsShape>(searchParams)
    ? await searchParams
    : searchParams;
  const searchParamValue =
    resolvedSearchParams instanceof URLSearchParams
      ? resolvedSearchParams.getAll("q")
      : resolvedSearchParams?.q;
  const queryValue = Array.isArray(searchParamValue)
    ? searchParamValue[0] ?? ""
    : searchParamValue ?? "";
  const query = queryValue.trim();

  let result: IngredientSearchItem[] = [];
  let error: string | null = null;

  if (query) {
    try {
      const response = await fetchIngredientSearch(query, { limit: 18 });
      result = response.results;
    } catch (err) {
      if (err instanceof Error) {
        error = err.message;
      } else {
        error = "Something went wrong while searching. Please try again.";
      }
    }
  }

  const isInitialState = !query;
  const hasResults = result.length > 0;

  return (
    <main className="min-h-screen bg-[#eef3de] text-[#1f2d26]">
      <Navbar />
      <PageContainer className="pt-24 pb-16 flex flex-col gap-8">
        <section className="rounded-[28px] border-2 border-black bg-gradient-to-br from-[#e7f5d9] to-[#f3f9e8] p-6 sm:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.22)]">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3f6b3a]/30 bg-[#3f6b3a]/10 px-3 py-1">
                <SparklesIcon className="h-3 w-3 text-[#3f6b3a]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#3f6b3a]">
                  Ingredient Library
                </span>
              </div>
              <h1 className="text-3xl font-black sm:text-4xl">
                Find products by ingredient
              </h1>
              <p className="text-sm sm:text-base text-[#1f2d26]/70">
                Search the SkinMatch catalog to see which formulas feature your hero ingredients, then explore routines that fit your skin goals.
              </p>
            </div>

            <form action="/ingredients" method="get" className="relative">
              <input
                type="text"
                name="q"
                defaultValue={queryValue}
                placeholder="Try niacinamide, vitamin C, salicylic acid..."
                className="w-full rounded-full border-2 border-black bg-white px-5 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-14 text-sm sm:text-base shadow-[0_4px_0_rgba(0,0,0,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3f6b3a]"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-[#3f6b3a] p-2 sm:p-2.5 text-white shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[2px] hover:shadow-[0_4px_0_rgba(0,0,0,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3f6b3a]"
              >
                <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-xs font-semibold text-[#1f2d26]/50">Trending picks:</span>
              {TRENDING_INGREDIENTS.map((item) => (
                <Link
                  key={item.name}
                  href={`/ingredients?q=${encodeURIComponent(item.name)}`}
                  className="rounded-full border border-black/20 bg-white px-3 py-1 text-[11px] font-semibold text-[#3f6b3a] transition hover:-translate-y-0.5 hover:shadow-[0_3px_0_rgba(0,0,0,0.15)]"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {isInitialState ? (
          <section className="mx-auto max-w-3xl rounded-[24px] border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_6px_0_rgba(0,0,0,0.18)] text-center">
            <h2 className="text-xl font-extrabold text-[#1f2d26]">Search by ingredient to get started</h2>
            <p className="mt-3 text-sm text-[#1f2d26]/70">
              You can use any INCI or common name. We&apos;ll surface the most relevant products and call out highlights such as hero ingredients, price points, and community ratings.
            </p>
            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              {TRENDING_INGREDIENTS.slice(0, 4).map((item) => (
                <Link
                  key={item.name}
                  href={`/ingredients?q=${encodeURIComponent(item.name)}`}
                  className="rounded-xl border-2 border-dashed border-[#3f6b3a]/40 bg-[#f4f9ee] px-4 py-3 transition hover:-translate-y-1 hover:border-[#3f6b3a] hover:shadow-[0_4px_0_rgba(0,0,0,0.15)]"
                >
                  <p className="text-sm font-bold text-[#2e4b2c]">{item.name}</p>
                  <p className="mt-1 text-xs text-[#2e4b2c]/70">{item.benefit}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : error ? (
          <section className="mx-auto max-w-3xl rounded-[24px] border-2 border-black bg-[#fde2e1] p-6 sm:p-8 shadow-[4px_6px_0_rgba(0,0,0,0.18)] text-center">
            <h2 className="text-xl font-extrabold text-[#821d30]">We couldn&apos;t complete that search</h2>
            <p className="mt-3 text-sm text-[#821d30]/80">{error}</p>
          </section>
        ) : !hasResults ? (
          <section className="mx-auto max-w-3xl rounded-[24px] border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_6px_0_rgba(0,0,0,0.18)] text-center">
            <h2 className="text-xl font-extrabold text-[#1f2d26]">
              We didn&apos;t find products mentioning “{query}”
            </h2>
            <p className="mt-3 text-sm text-[#1f2d26]/70">
              Try another spelling or explore one of the trending ingredients below.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {TRENDING_INGREDIENTS.map((item) => (
                <Link
                  key={item.name}
                  href={`/ingredients?q=${encodeURIComponent(item.name)}`}
                  className="rounded-full border border-black/10 bg-[#f4f4f4] px-3 py-1 text-xs font-semibold text-[#3f6b3a] hover:-translate-y-0.5 hover:shadow-[0_3px_0_rgba(0,0,0,0.12)]"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          result.map((item) => <IngredientResultSection key={item.ingredient.key} item={item} />)
        )}
      </PageContainer>
    </main>
  );
}

type SectionProps = {
  item: IngredientSearchItem;
};

function IngredientResultSection({ item }: SectionProps) {
  const { ingredient, products } = item;

  return (
    <section className="rounded-[24px] border-2 border-black bg-white p-6 sm:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)]">
      <header className="flex flex-col gap-3 border-b border-dashed border-[#1f2d26]/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black text-[#1f2d26]">{ingredient.commonName}</h2>
      </header>

      <div className="mt-6">
        <IngredientFacts ingredient={ingredient} />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </section>
  );
}

type IngredientFactsProps = {
  ingredient: IngredientSummary;
};

function IngredientFacts({ ingredient }: IngredientFactsProps) {
  const matchLabel =
    ingredient.productCount === 1
      ? "1 matching product"
      : `${ingredient.productCount} matching products`;

  return (
    <div className="rounded-[20px] border-2 border-dashed border-[#3f6b3a]/35 bg-[#f7fbe9] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3f6b3a]">
            Ingredient snapshot
          </p>
          <p className="text-sm text-[#1f2d26]/80">
            {ingredient.benefits || ingredient.helpsWith ||
              "We’re gathering more insights about this ingredient. Check back soon!"}
          </p>
          {ingredient.inciName && ingredient.inciName !== ingredient.commonName ? (
            <p className="text-xs text-[#1f2d26]/60">
              Also known as{" "}
              <span className="font-semibold text-[#1f2d26]">{ingredient.inciName}</span>
            </p>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-[#3f6b3a]/30 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e4b2c]">
          {matchLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IngredientFactBlock
          title="What it helps"
          value={ingredient.helpsWith}
          fallback="We’re collecting more success stories for this ingredient."
        />
        <IngredientFactBlock
          title="Avoid pairing with"
          value={ingredient.avoidWith}
          fallback="No major conflicts flagged yet."
        />
        <IngredientFactBlock
          title="Watch-outs"
          value={ingredient.sideEffects}
          fallback="No side effects reported so far."
        />
        <IngredientFactGroup
          title="Skin goals"
          items={ingredient.topConcerns}
          emptyLabel="We’re still mapping the best skin goals for this ingredient."
        />
        <IngredientFactGroup
          title="Common product types"
          items={ingredient.popularCategories}
          emptyLabel="No product category insights yet."
        />
      </div>
    </div>
  );
}

type IngredientFactGroupProps = {
  title: string;
  items: string[];
  emptyLabel: string;
};

function IngredientFactGroup({ title, items, emptyLabel }: IngredientFactGroupProps) {
  return (
    <div className="rounded-xl border border-[#3f6b3a]/15 bg-white/75 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2e4b2c]">
        {title}
      </p>
      {items.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#3f6b3a]/25 bg-[#eef7dd] px-2.5 py-0.5 text-[11px] font-semibold text-[#2e4b2c]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#1f2d26]/55">{emptyLabel}</p>
      )}
    </div>
  );
}

type IngredientFactBlockProps = {
  title: string;
  value: string | null;
  fallback: string;
};

function IngredientFactBlock({ title, value, fallback }: IngredientFactBlockProps) {
  return (
    <div className="rounded-xl border border-[#3f6b3a]/15 bg-white/75 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2e4b2c]">
        {title}
      </p>
      <p className="mt-2 text-xs text-[#1f2d26]/70 leading-relaxed whitespace-pre-line">
        {value?.trim() || fallback}
      </p>
    </div>
  );
}

type ProductCardProps = {
  product: IngredientSearchProduct;
};

function ProductCard({ product }: ProductCardProps) {
  const imageSrc = product.imageUrl ?? product.image ?? null;
  const priceLabel = formatPrice(product.price, product.currency);
  const ratingLabel =
    product.averageRating !== null
      ? `${product.averageRating.toFixed(1)} / 5`
      : null;
  const categoryLabel = toTitleCase(product.category);

  return (
    <article className="flex h-full flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_5px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:shadow-[4px_6px_0_rgba(0,0,0,0.25)]">
      {imageSrc ? (
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#f5f5f5]">
          <Image
            src={imageSrc}
            alt={`${product.brand} ${product.productName}`}
            fill
            unoptimized
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 320px"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-[#3f6b3a]/30 bg-[#f5f9ef] px-4 text-center text-[11px] font-semibold text-[#3f6b3a]">
          {FALLBACK_PRODUCT_MESSAGE}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 text-[#1f2d26]">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3f6b3a]">
          {product.brand}
        </p>
        <h3 className="text-base font-extrabold leading-tight line-clamp-2">
          {product.productName}
        </h3>
        <p className="text-xs font-semibold text-[#1f2d26]/60">{categoryLabel}</p>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {product.ingredientHighlight ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#f59e0b]/30 bg-[#fff7e6] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
              Hero ingredient
            </span>
          ) : null}
          {priceLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-[#e9f7e3] px-2 py-0.5 text-[10px] font-semibold text-[#2e4b2c]">
              {priceLabel}
            </span>
          ) : null}
        </div>

        {product.heroIngredients ? (
          <p className="text-[11px] leading-relaxed text-[#1f2d26]/70 line-clamp-2">
            <span className="font-semibold text-[#1f2d26]">Hero mix:</span>{" "}
            {product.heroIngredients}
          </p>
        ) : null}
      </div>

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-[#1f2d26]/15 pt-3 text-xs text-[#1f2d26]/70">
        {ratingLabel ? (
          <span className="inline-flex items-center gap-1">
            <StarIcon className="h-4 w-4 text-[#fbbf24]" />
            {ratingLabel}
            {product.reviewCount ? (
              <span className="text-[10px] text-[#1f2d26]/50">
                ({product.reviewCount} reviews)
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[10px] text-[#1f2d26]/50">
            Rating coming soon
          </span>
        )}
        {product.productUrl ? (
          <Link
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-black/20 bg-[#3f6b3a] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:shadow-[0_3px_0_rgba(0,0,0,0.18)]"
          >
            View
          </Link>
        ) : (
          <span className="text-[10px] text-[#1f2d26]/40">No shop link</span>
        )}
      </footer>
    </article>
  );
}
