type RawIngredientSummary = {
  key: string;
  common_name: string;
  inci_name?: string | null;
  benefits?: string | null;
  helps_with?: string | null;
  avoid_with?: string | null;
  side_effects?: string | null;
  product_count?: number | null;
  popular_categories?: string[] | null;
  top_concerns?: string[] | null;
};

type RawIngredientProduct = {
  product_id: string;
  slug: string;
  brand: string;
  product_name: string;
  category: string;
  summary?: string | null;
  hero_ingredients?: string | null;
  ingredient_order: number;
  ingredient_highlight: boolean;
  price?: number | null;
  currency: string;
  average_rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
  image?: string | null;
  product_url?: string | null;
};

type RawIngredientResult = {
  ingredient: RawIngredientSummary;
  products: RawIngredientProduct[];
};

type RawIngredientSearchResponse = {
  query: string;
  results: RawIngredientResult[];
};

const getApiBase = () => {
  const baseFromClient = process.env.NEXT_PUBLIC_API_BASE || "/api";
  const isServer = typeof window === "undefined";

  if (isServer) {
    let fromEnv =
      process.env.INTERNAL_API_BASE ||
      process.env.API_BASE ||
      baseFromClient.replace(
        /^https?:\/\/localhost(:\d+)?/,
        (_match, port = ":8000") => `http://backend${port}`
      );

    if (fromEnv.startsWith("/")) {
      fromEnv = `http://backend:8000${fromEnv}`;
    }

    return fromEnv.replace(/\/+$/, "");
  }

  return baseFromClient.replace(/\/+$/, "");
};

export type IngredientSummary = {
  key: string;
  commonName: string;
  inciName: string | null;
  benefits: string | null;
  helpsWith: string | null;
  avoidWith: string | null;
  sideEffects: string | null;
  productCount: number;
  popularCategories: string[];
  topConcerns: string[];
};

export type IngredientSearchProduct = {
  productId: string;
  slug: string;
  brand: string;
  productName: string;
  category: string;
  summary: string | null;
  heroIngredients: string | null;
  ingredientOrder: number;
  ingredientHighlight: boolean;
  price: number | null;
  currency: string;
  averageRating: number | null;
  reviewCount: number;
  imageUrl: string | null;
  image: string | null;
  productUrl: string | null;
};

export type IngredientSearchItem = {
  ingredient: IngredientSummary;
  products: IngredientSearchProduct[];
};

export type IngredientSearchResponse = {
  query: string;
  results: IngredientSearchItem[];
};

const mapProduct = (raw: RawIngredientProduct): IngredientSearchProduct => ({
  productId: raw.product_id,
  slug: raw.slug,
  brand: raw.brand,
  productName: raw.product_name,
  category: raw.category,
  summary: raw.summary ?? null,
  heroIngredients: raw.hero_ingredients ?? null,
  ingredientOrder: raw.ingredient_order,
  ingredientHighlight: Boolean(raw.ingredient_highlight),
  price:
    typeof raw.price === "number" && Number.isFinite(raw.price)
      ? raw.price
      : null,
  currency: raw.currency,
  averageRating:
    typeof raw.average_rating === "number" && Number.isFinite(raw.average_rating)
      ? raw.average_rating
      : null,
  reviewCount: raw.review_count ?? 0,
  imageUrl: raw.image_url ?? null,
  image: raw.image ?? null,
  productUrl: raw.product_url ?? null,
});

const mapIngredient = (raw: RawIngredientSummary): IngredientSummary => ({
  key: raw.key,
  commonName: raw.common_name,
  inciName: raw.inci_name ?? null,
  benefits: raw.benefits ?? null,
  helpsWith: raw.helps_with ?? null,
  avoidWith: raw.avoid_with ?? null,
  sideEffects: raw.side_effects ?? null,
  productCount: raw.product_count ?? 0,
  popularCategories: Array.isArray(raw.popular_categories)
    ? raw.popular_categories.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [],
  topConcerns: Array.isArray(raw.top_concerns)
    ? raw.top_concerns.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [],
});

const mapResponse = (raw: RawIngredientSearchResponse): IngredientSearchResponse => ({
  query: raw.query,
  results: Array.isArray(raw.results)
    ? raw.results.map((item) => ({
        ingredient: mapIngredient(item.ingredient),
        products: Array.isArray(item.products)
          ? item.products.map(mapProduct)
          : [],
      }))
    : [],
});

type FetchOptions = {
  limit?: number;
  ingredientLimit?: number;
  signal?: AbortSignal;
};

export async function fetchIngredientSearch(
  query: string,
  options: FetchOptions = {}
): Promise<IngredientSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const params = new URLSearchParams({
    q: trimmed,
  });

  if (options.limit) {
    params.set("limit", String(options.limit));
  }
  if (options.ingredientLimit) {
    params.set("ingredient_limit", String(options.ingredientLimit));
  }

  const base = getApiBase();
  const res = await fetch(`${base}/quiz/ingredients/search?${params.toString()}`, {
    cache: "no-store",
    signal: options.signal,
  });

  if (res.status === 400) {
    const detail = await res.json().catch(() => ({}));
    const message =
      typeof detail?.detail === "string"
        ? detail.detail
        : "Ingredient query cannot be blank.";
    throw new Error(message);
  }

  if (!res.ok) {
    throw new Error("Failed to search ingredients.");
  }

  const payload = (await res.json()) as RawIngredientSearchResponse;
  return mapResponse(payload);
}
