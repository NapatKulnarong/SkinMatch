import { resolveApiBase } from "./apiBase";

type RawSkincareProductSummary = {
  product_id: string;
  slug: string;
  brand: string;
  product_name: string;
  category: string;
  category_label?: string | null;
  summary?: string | null;
  hero_ingredients?: string[] | null;
  price?: number | null;
  currency: string;
  average_rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
  product_url?: string | null;
};

type RawSuggestionResponse = {
  query: string;
  suggestions: RawSkincareProductSummary[];
};

type RawProductSearchResponse = {
  query: string;
  results: RawSkincareProductSummary[];
};

type RawProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  user_display_name: string;
  avatar_url?: string | null;
  rating?: number | null;
  comment: string;
  is_public: boolean;
  is_owner: boolean;
  is_anonymous?: boolean;
  created_at: string;
  updated_at: string;
};

export type SkincareProductSummary = {
  productId: string;
  slug: string;
  brand: string;
  productName: string;
  category: string;
  categoryLabel: string | null;
  summary: string | null;
  heroIngredients: string[];
  price: number | null;
  currency: string;
  averageRating: number | null;
  reviewCount: number;
  imageUrl: string | null;
  productUrl: string | null;
};

export type ProductSuggestionResponse = {
  query: string;
  suggestions: SkincareProductSummary[];
};

export type ProductSearchResponse = {
  query: string;
  results: SkincareProductSummary[];
};

export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  userDisplayName: string;
  avatarUrl: string | null;
  rating: number | null;
  comment: string;
  isPublic: boolean;
  isOwner: boolean;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductReviewPayload = {
  rating?: number | null;
  comment: string;
  isPublic?: boolean;
  anonymous?: boolean;
};

type FetchOptions = {
  limit?: number;
  signal?: AbortSignal;
};

const mapSummary = (raw: RawSkincareProductSummary): SkincareProductSummary => ({
  productId: raw.product_id,
  slug: raw.slug,
  brand: raw.brand,
  productName: raw.product_name,
  category: raw.category,
  categoryLabel: raw.category_label ?? null,
  summary: raw.summary ?? null,
  heroIngredients: Array.isArray(raw.hero_ingredients) ? raw.hero_ingredients : [],
  price: typeof raw.price === "number" ? raw.price : null,
  currency: raw.currency,
  averageRating:
    typeof raw.average_rating === "number" && Number.isFinite(raw.average_rating)
      ? raw.average_rating
      : 0,
  reviewCount: typeof raw.review_count === "number" ? raw.review_count : 0,
  imageUrl: raw.image_url ?? null,
  productUrl: raw.product_url ?? null,
});

const mapReview = (raw: RawProductReview): ProductReview => ({
  id: raw.id,
  productId: raw.product_id,
  userId: raw.user_id,
  userDisplayName: raw.user_display_name,
  avatarUrl: raw.avatar_url ?? null,
  rating: typeof raw.rating === "number" ? raw.rating : null,
  comment: raw.comment,
  isPublic: Boolean(raw.is_public),
  isOwner: Boolean(raw.is_owner),
  isAnonymous: Boolean(raw.is_anonymous),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

const buildUrl = (path: string, params?: URLSearchParams) => {
  const base = resolveApiBase();
  if (!params || Array.from(params.keys()).length === 0) {
    return `${base}${path}`;
  }
  return `${base}${path}?${params.toString()}`;
};

export async function fetchSkincareSuggestions(
  query: string,
  options: FetchOptions = {}
): Promise<ProductSuggestionResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", suggestions: [] };
  }

  const params = new URLSearchParams({ q: trimmed });
  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  const res = await fetch(buildUrl("/quiz/products/suggest", params), {
    cache: "no-store",
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error("We couldn't fetch product suggestions. Please try again.");
  }

  const data: RawSuggestionResponse = await res.json();
  return {
    query: data.query,
    suggestions: Array.isArray(data.suggestions)
      ? data.suggestions.map(mapSummary)
      : [],
  };
}

export async function searchSkincareProducts(
  query: string,
  options: FetchOptions = {}
): Promise<ProductSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const params = new URLSearchParams({ q: trimmed });
  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  const res = await fetch(buildUrl("/quiz/products/search", params), {
    cache: "no-store",
    signal: options.signal,
  });

  if (res.status === 400) {
    throw new Error("Please enter a product name to search.");
  }

  if (!res.ok) {
    throw new Error("We couldn't search for products right now. Please retry.");
  }

  const data: RawProductSearchResponse = await res.json();
  return {
    query: data.query,
    results: Array.isArray(data.results) ? data.results.map(mapSummary) : [],
  };
}

export async function fetchTopSkincareProducts(limit = 5): Promise<SkincareProductSummary[]> {
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const res = await fetch(buildUrl("/quiz/products/top", params), {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("We couldn't load the top skincare list. Please try again later.");
  }

  const data: RawSkincareProductSummary[] = await res.json();
  return Array.isArray(data) ? data.map(mapSummary) : [];
}

type ReviewFetchOptions = {
  limit?: number;
  token?: string;
  signal?: AbortSignal;
};

export async function fetchProductReviews(
  productId: string,
  options: ReviewFetchOptions = {}
): Promise<ProductReview[]> {
  const params = new URLSearchParams();
  if (options.limit) {
    params.set("limit", String(Math.max(1, Math.min(options.limit, 100))));
  }

  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(buildUrl(`/quiz/products/${productId}/reviews`, params), {
    cache: "no-store",
    signal: options.signal,
    headers,
  });

  if (!res.ok) {
    throw new Error("We couldn't load product reviews. Please try again.");
  }

  const data: RawProductReview[] = await res.json();
  return Array.isArray(data) ? data.map(mapReview) : [];
}

export async function submitProductReview(
  productId: string,
  payload: ProductReviewPayload,
  token: string
): Promise<ProductReview> {
  if (!token) {
    throw new Error("Authentication required to submit a review.");
  }

  const res = await fetch(buildUrl(`/quiz/products/${productId}/reviews`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    throw new Error("Please sign in to review this product.");
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const message =
      (detail && (detail.detail || detail.message)) ||
      "We couldn't save your review. Please try again.";
    throw new Error(message);
  }

  const data: RawProductReview = await res.json();
  return mapReview(data);
}

export async function deleteProductReview(productId: string, token: string): Promise<void> {
  if (!token) {
    throw new Error("Authentication required to remove a review.");
  }

  const res = await fetch(buildUrl(`/quiz/products/${productId}/reviews`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Please sign in to make changes to your review.");
  }

  if (res.status === 404) {
    return;
  }

  if (!res.ok) {
    throw new Error("We couldn't remove your review. Please try again.");
  }
}
