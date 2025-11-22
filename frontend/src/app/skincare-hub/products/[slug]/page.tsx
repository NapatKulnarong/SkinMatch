import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, SparklesIcon, ShoppingBagIcon } from "@heroicons/react/24/solid";

import Navbar from "@/components/Navbar";
import PageContainer from "@/components/PageContainer";
import SiteFooter from "@/components/SiteFooter";
import { ProductReviewSection } from "./ProductReviewSection";
import { fetchIngredientBenefit } from "@/lib/api.ingredients";
import { fetchProductDetailBySlug, type ProductDetail } from "@/lib/api.quiz";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type IngredientBenefitMap = Record<string, string | null>;

const currencyCache = new Map<string, Intl.NumberFormat>();
const formatCurrency = (value: number, currency: string) => {
  const key = currency || "USD";
  if (!currencyCache.has(key)) {
    currencyCache.set(
      key,
      new Intl.NumberFormat("en-US", { style: "currency", currency: key })
    );
  }
  return currencyCache.get(key)!.format(value);
};

const formatRating = (rating: number | null) => {
  if (typeof rating !== "number") {
    return null;
  }
  return rating.toFixed(1);
};

const getIngredientBenefit = (ingredient: string): string | null => {
  const lower = ingredient.toLowerCase();
  const benefitMap: Record<string, string> = {
    "ceramide": "Strengthens skin barrier and locks in moisture",
    "ceramides": "Strengthens skin barrier and locks in moisture",
    "hyaluronic acid": "Provides deep hydration and plumps skin",
    "sodium hyaluronate": "Provides deep hydration and plumps skin",
    "panthenol": "Soothes irritation and repairs skin barrier",
    "niacinamide": "Brightens tone, refines pores, and strengthens barrier",
    "vitamin c": "Brightens skin and provides antioxidant protection",
    "ascorbic acid": "Brightens skin and provides antioxidant protection",
    "retinol": "Reduces fine lines and improves skin texture",
    "retinoid": "Reduces fine lines and improves skin texture",
    "salicylic acid": "Exfoliates pores and prevents breakouts",
    "bha": "Exfoliates pores and prevents breakouts",
    "glycolic acid": "Exfoliates surface cells for smoother texture",
    "aha": "Exfoliates surface cells for smoother texture",
    "peptide": "Supports collagen production and firmness",
    "peptides": "Supports collagen production and firmness",
    "centella asiatica": "Calms inflammation and promotes healing",
    "cica": "Calms inflammation and promotes healing",
    "snail mucin": "Hydrates and repairs damaged skin",
    "snail secretion": "Hydrates and repairs damaged skin",
    "tranexamic acid": "Reduces hyperpigmentation and dark spots",
    "arbutin": "Brightens skin and fades dark spots",
    "kojic acid": "Lightens pigmentation and evens skin tone",
    "azelaic acid": "Reduces acne and fades post-inflammatory marks",
    "tea tree": "Fights bacteria and calms breakouts",
    "mangosteen": "Fights acne bacteria and reduces inflammation",
    "alpha mangosteen": "Fights acne bacteria and reduces inflammation",
    "squalane": "Provides lightweight hydration without greasiness",
    "glycerin": "Attracts and retains moisture in skin",
    "vitamin e": "Protects against free radical damage",
    "tocopherol": "Protects against free radical damage",
    "allantoin": "Soothes and promotes skin healing",
    "licorice root": "Brightens and calms inflammation",
    "green tea": "Provides antioxidant protection and calms skin",
    "rice extract": "Brightens and softens skin texture",
    "rice milk": "Brightens and softens skin texture",
    "lotus": "Purifies and brightens skin",
    "squalene": "Provides lightweight hydration without greasiness",
  };

  // Try exact match first
  if (benefitMap[lower]) {
    return benefitMap[lower];
  }

  // Try partial match
  for (const [key, value] of Object.entries(benefitMap)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }

  return null;
};

const resolveHeroIngredientBenefits = async (
  ingredients: string[]
): Promise<IngredientBenefitMap> => {
  const benefits: IngredientBenefitMap = {};
  if (!ingredients.length) {
    return benefits;
  }

  const missingMap = new Map<string, string[]>();

  for (const name of ingredients) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const localBenefit = getIngredientBenefit(trimmed);
    if (localBenefit) {
      benefits[name] = localBenefit;
      continue;
    }

    const normalized = trimmed.toLowerCase();
    const mapped = missingMap.get(normalized) || [];
    mapped.push(name);
    missingMap.set(normalized, mapped);
  }

  if (!missingMap.size) {
    return benefits;
  }

  await Promise.all(
    Array.from(missingMap.values()).map(async (originalNames) => {
      const lookupName = originalNames[0];
      try {
        const response = await fetchIngredientBenefit(lookupName);
        const benefit = response.benefit?.trim() || null;
        originalNames.forEach((key) => {
          benefits[key] = benefit;
        });
      } catch (error) {
        originalNames.forEach((key) => {
          benefits[key] = null;
        });
      }
    })
  );

  return benefits;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const slug = (await params).slug;
  let product: ProductDetail;
  try {
    product = await fetchProductDetailBySlug(slug);
  } catch (error) {
    console.warn("Failed to load product by slug", slug, error);
    notFound();
  }

  const reviewCount = product.reviewCount ?? 0;
  const hasReviews = reviewCount > 0;
  const ratingLabel = hasReviews ? formatRating(product.averageRating) : null;
  const reviewLabel = hasReviews
    ? reviewCount === 1
      ? "1 review"
      : `${reviewCount} reviews`
    : "No reviews yet";
  const priceLabel =
    typeof product.price === "number"
      ? formatCurrency(product.price, product.currency)
      : null;
  const heroIngredients = product.heroIngredients;
  const heroBenefits = await resolveHeroIngredientBenefits(heroIngredients);
  const purchaseUrl = product.affiliateUrl || product.productUrl;

  return (
    <main className="min-h-screen bg-[#e5e9f0] text-[#1f2d26]">
      <Navbar />
      <PageContainer className="pt-40 md:pt-32 pb-16 space-y-7 lg:space-y-8">
        <Link
          href="/skincare-hub"
          className="hidden lg:inline-flex items-center gap-2 text-sm font-semibold text-[#1f2d26]/70 hover:text-[#1f2d26]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Skincare Hub
        </Link>

        <section className="rounded-[32px] border-2 border-black bg-[#f5f9ff] shadow-[5px_6px_0_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[0.85fr_1.15fr] lg:grid-cols-[0.7fr_1.3fr]">
            <div className="relative flex items-center justify-center rounded-t-[32px] md:rounded-bl-[30px] md:rounded-tr-none overflow-hidden h-full max-h-[280px] md:max-h-[380px] lg:max-h-[360px] md:border-r border-[#1f2d26]/20">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={`${product.brand} ${product.productName}`}
                  width={600}
                  height={600}
                  className="h-full w-full max-h-[200px] md:max-h-[340px] lg:max-h-[320px] object-contain bg-white"
                />
              ) : (
                <div className="flex h-full min-h-[200px] md:min-h-[300px] lg:min-h-[280px] w-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/20 bg-gradient-to-br from-[#e8f4ff] to-[#ffe9f4] text-sm md:text-lg font-bold text-[#1f2d26]">
                  {product.brand}
                </div>
              )}
            </div>
            <div className="space-y-4 md:space-y-5 lg:flex lg:flex-col lg:justify-between lg:space-y-0 p-4 md:p-6 lg:p-6">
              <div className="space-y-4 md:space-y-5 lg:space-y-5">
                <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60 border-t border-[#1f2d26]/20 pt-3 md:border-t-0 md:pt-0">
                  {product.categoryLabel || product.category}
                </p>
                <div className="-mt-3 md:-mt-4">
                  <h1 className="text-xl md:text-3xl font-black text-[#1f2d26] leading-tight">
                    <span className="block">{product.brand}</span>
                    <span className="block font-semibold text-[#1f2d26]/80">
                      {product.productName}
                    </span>
                  </h1>
                  {product.summary ? (
                    <p className="mt-2 text-sm md:text-base text-[#1f2d26]/70">{product.summary}</p>
                  ) : null}
                </div>
                
                {product.description ? (
                  <p className="text-xs md:text-sm text-[#1f2d26]/70 leading-relaxed">
                    {product.description}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 lg:mt-auto">
                {priceLabel ? (
                  <div className="rounded-lg border-2 border-dashed border-black bg-[#e8f4ff] px-4 py-3 md:px-5 md:py-4 min-h-[80px] md:min-h-[100px] flex flex-col justify-between">
                    <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60 mb-1">
                      Price snapshot
                    </p>
                    <p className="text-lg md:text-2xl font-black text-[#1f2d26] leading-tight">{priceLabel}</p>
                  </div>
                ) : null}
                <div className="rounded-lg border-2 border-dashed border-black bg-[#e8f4ff] px-4 py-3 md:px-5 md:py-4 min-h-[80px] md:min-h-[100px] flex flex-col justify-between">
                  <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60 mb-1">
                    Reviews ({product.reviewCount})
                  </p>
                  <p className="text-lg md:text-2xl font-black text-[#1f2d26] leading-tight">
                    {ratingLabel ? `${ratingLabel}/5` : "Not rated yet"}
                  </p>
                </div>
                {purchaseUrl ? (
                  <a
                    href={purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lg:col-span-1 col-span-2 flex items-center justify-center gap-2 rounded-full sm:rounded-lg border-2 border-black bg-[#a8c8e8] px-4 py-2 md:px-4 md:py-3 text-sm md:text-base font-semibold text-black shadow-[0_4px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5"
                  >
                    <ShoppingBagIcon className="h-4 w-4 md:h-5 md:w-5" />
                    Shop
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid items-start gap-5 lg:grid-cols-2">
          <div className="space-y-6 rounded-[28px] border-2 border-black bg-[#f5f9ff] p-5 md:p-8 shadow-[5px_6px_0_rgba(0,0,0,0.2)] h-full">
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#1f2d26]">Product overview</h2>
              <InfoList title="Best for concerns" items={product.concerns} />
              <InfoList title="Skin types" items={product.skinTypes} />
              <InfoList title="Notable tags" items={product.restrictions} />
            </div>
            {heroIngredients.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-[#1f2d26]">Hero ingredients</h2>
                  <span className="mt-1 text-xs font-semibold tracking-[0.2em] text-[#1f2d26]/50">
                    powered by Gemini AI
                  </span>
                </div>
                <div className="rounded-2xl border border-black/20 bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#e8f4ff] text-xs uppercase tracking-[0.2em] text-[#1f2d26]/60">
                      <tr>
                        <th className="px-4 py-3 text-left">Ingredient</th>
                        <th className="px-4 py-3 text-left">What it helps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heroIngredients.map((item) => {
                        const benefit = heroBenefits[item] ?? null;
                        return (
                        <tr key={item} className="border-t border-black/10 hover:bg-[#e8f4ff]/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#1f2d26]">{item}</td>
                          <td className="px-4 py-3 text-[#1f2d26]/70">
                            {benefit || "—"}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/20 bg-[#e8f4ff] p-5">
                <span className="inline-flex gap-2 text-xl text-[#1f2d26]">
                  <span><SparklesIcon className="w-6 h-6" /></span>
                  <span className="text-xl font-bold">Smart Review</span>
                </span>
                <div className="mt-3 rounded-2xl border border-black/20 border-dashed bg-white p-4">
                  <ul className="space-y-3">
                    <li className="text-sm text-[#1f2d26]/80 leading-relaxed">
                      {product.summary
                        ? product.summary
                        : "Balanced formula designed to handle day-to-day hydration and barrier support."}
                    </li>
                    {heroIngredients.slice(0, 3).map((ingredient) => (
                      <li key={ingredient} className="text-sm text-[#1f2d26]/80 leading-relaxed">
                        {ingredient} gets a nod for how it complements the rest of the actives without
                        overwhelming sensitive routines.
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-3 mr-1 text-xs text-[#1f2d26]/60 text-right">powered by Gemini AI</p>
              </div>
            </div>
          </div>
          <div className="md:pl-2 h-full">
            <div className="rounded-[28px] border-2 border-black bg-[#f5f9ff] p-4 md:p-6 shadow-[5px_6px_0_rgba(0,0,0,0.2)] h-full">
              <ProductReviewSection
                productId={product.productId}
                productName={`${product.brand} ${product.productName}`}
              />
            </div>
          </div>
        </section>
      </PageContainer>
      <SiteFooter />
    </main>
  );
}

type InfoListProps = {
  title: string;
  items: string[];
};

function InfoList({ title, items }: InfoListProps) {
  if (!items.length) {
    return null;
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-black/20 bg-[#e8f4ff] px-3 py-1 text-sm font-semibold text-[#1f2d26]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
