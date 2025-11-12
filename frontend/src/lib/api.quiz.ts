import { getAuthToken } from "./auth-storage";
import { resolveApiBase, resolveMediaUrl } from "./apiBase";

type RawChoice = {
  id: string;
  label: string;
  value: string;
  order: number;
};

type RawQuestion = {
  id: string;
  key: string;
  text: string;
  is_multi: boolean;
  order: number;
  choices: RawChoice[];
};

type RawSession = {
  id: string;
  started_at: string;
};

type RawProfile = {
  id: string;
  session_id: string | null;
  created_at: string;
  primary_concerns: string[];
  secondary_concerns: string[];
  eye_area_concerns: string[];
  skin_type: string | null;
  sensitivity: string | null;
  pregnant_or_breastfeeding: boolean | null;
  ingredient_restrictions: string[];
  budget: string | null;
  is_latest: boolean;
};

type RawRecommendation = {
  product_id: string;
  slug: string;
  brand: string;
  product_name: string;
  category: string;
  rank: number;
  score: number;
  price_snapshot: number | null;
  currency: string;
  image_url?: string | null;
  product_url?: string | null;
  ingredients: string[];
  rationale: Record<string, string[]>;
  brand_name?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
};

type RawSummaryIngredient = {
  name?: string | null;
  reason?: string | null;
};

type RawFinalizeSummary = {
  primary_concerns?: string[] | null;
  top_ingredients?: string[] | null;
  ingredients_to_prioritize?: RawSummaryIngredient[] | null;
  ingredients_caution?: RawSummaryIngredient[] | null;
  category_breakdown?: Record<string, number> | null;
  generated_at?: string | null;
  score_version?: string | null;
};

type RawFinalize = {
  session_id: string;
  completed_at: string;
  requires_auth: boolean;
  profile: RawProfile | null;
  result_summary: {
    summary: RawFinalizeSummary;
    recommendations: RawRecommendation[];
    strategy_notes?: string[] | null;
  };
};

type RawHistoryItem = {
  session_id: string | null;
  completed_at: string;
  profile_id: string | null;
  primary_concerns?: string[] | null;
  budget?: string | null;
  profile?: RawProfile | null;
  result_summary?: {
    summary?: RawFinalizeSummary | null;
    recommendations?: RawRecommendation[] | null;
    strategy_notes?: string[] | null;
  } | null;
  answer_snapshot?: Record<string, unknown> | null;
};

type RawMatchPick = {
  product_id: string;
  slug: string;
  brand: string;
  product_name: string;
  category: string;
  rank: number;
  score: number;
  price_snapshot: number | null;
  currency: string;
  ingredients: string[];
  rationale: Record<string, string[]>;
  image_url?: string | null;
  product_url?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
};

type RawSessionDetail = {
  session_id: string;
  started_at: string;
  completed_at: string | null;
  picks: RawMatchPick[];
  profile: RawProfile | null;
};

type RawFeedbackHighlight = {
  id: string;
  created_at: string;
  rating?: number | string | null;
  message: string;
  display_name: string;
  initials: string;
  location?: string | null;
  badge?: string | null;
};

type RawHistoryDetail = {
  session_id: string | null;
  completed_at: string;
  profile: RawProfile | null;
  summary: RawFinalizeSummary | null;
  recommendations: RawRecommendation[] | null;
  strategy_notes?: string[] | null;
  answer_snapshot: Record<string, unknown>;
};

type RawProductDetailIngredient = {
  name: string;
  inci_name?: string | null;
  highlight?: boolean;
  order?: number | null;
};

type RawProductDetail = {
  product_id: string;
  slug: string;
  brand: string;
  product_name: string;
  category: string;
  category_label?: string | null;
  summary?: string | null;
  description?: string | null;
  hero_ingredients?: string[] | null;
  ingredients?: RawProductDetailIngredient[] | null;
  concerns?: string[] | null;
  skin_types?: string[] | null;
  restrictions?: string[] | null;
  price?: number | null;
  currency: string;
  average_rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
  product_url?: string | null;
  affiliate_url?: string | null;
};


export type QuizChoice = {
  id: string;
  label: string;
  value: string;
  order: number;
};

export type QuizQuestion = {
  id: string;
  key: string;
  text: string;
  isMulti: boolean;
  order: number;
  choices: QuizChoice[];
};

export type QuizSession = {
  id: string;
  startedAt: string;
};

export type QuizProfile = {
  id: string;
  sessionId: string | null;
  createdAt: string;
  primaryConcerns: string[];
  secondaryConcerns: string[];
  eyeAreaConcerns: string[];
  skinType: string | null;
  sensitivity: string | null;
  pregnantOrBreastfeeding: boolean | null;
  ingredientRestrictions: string[];
  budget: string | null;
  isLatest: boolean;
};

export type QuizRecommendation = {
  productId: string;
  slug: string;
  brand: string;
  productName: string;
  category: string;
  rank: number;
  score: number;
  priceSnapshot: number | null;
  currency: string;
  imageUrl: string | null;
  productUrl: string | null;
  ingredients: string[];
  rationale: Record<string, string[]>;
  brandName: string | null;
  averageRating: number | null;
  reviewCount: number;
};

export type QuizSummaryIngredient = {
  name: string;
  reason: string;
};

export type QuizResultSummary = {
  primaryConcerns: string[];
  topIngredients: string[];
  ingredientsToPrioritize: QuizSummaryIngredient[];
  ingredientsCaution: QuizSummaryIngredient[];
  categoryBreakdown: Record<string, number>;
  generatedAt: string | null;
  scoreVersion: string | null;
};

export type QuizFinalize = {
  sessionId: string;
  completedAt: string;
  requiresAuth: boolean;
  profile: QuizProfile | null;
  summary: QuizResultSummary;
  strategyNotes: string[];
  recommendations: QuizRecommendation[];
};

export type QuizHistoryItem = {
  sessionId: string | null;
  completedAt: string;
  profileId: string | null;
  primaryConcerns: string[];
  budget: string | null;
  profile: QuizProfile | null;
  resultSummary: QuizResultSummary | null;
  strategyNotes: string[];
  recommendations: QuizRecommendation[];
  answerSnapshot: Record<string, unknown>;
};

export type QuizHistoryDetail = {
  sessionId: string | null;
  completedAt: string;
  profile: QuizProfile | null;
  summary: QuizResultSummary;
  strategyNotes: string[];
  recommendations: QuizRecommendation[];
  answerSnapshot: Record<string, unknown>;
};

export type QuizHistoryDeleteAck = {
  ok: boolean;
  wasLatest: boolean;
};

export type QuizMatchPick = {
  productId: string;
  slug: string;
  brand: string;
  productName: string;
  category: string;
  rank: number;
  score: number;
  priceSnapshot: number | null;
  currency: string;
  ingredients: string[];
  rationale: Record<string, string[]>;
  imageUrl: string | null;
  productUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
};

export type QuizSessionDetail = {
  sessionId: string;
  startedAt: string;
  completedAt: string | null;
  picks: QuizMatchPick[];
  profile: QuizProfile | null;
};

export type FeedbackHighlight = {
  id: string;
  createdAt: string;
  rating: number | null;
  message: string;
  displayName: string;
  initials: string;
  location: string | null;
  badge: string | null;
};

export type SubmitFeedbackPayload = {
  sessionId: string;
  rating: number;
  message?: string;
  metadata?: Record<string, string>;
};

export type ProductDetailIngredient = {
  name: string;
  inciName: string | null;
  highlight: boolean;
  order: number;
};

export type ProductDetail = {
  productId: string;
  slug: string;
  brand: string;
  productName: string;
  category: string;
  categoryLabel: string | null;
  summary: string | null;
  description: string | null;
  heroIngredients: string[];
  ingredients: ProductDetailIngredient[];
  concerns: string[];
  skinTypes: string[];
  restrictions: string[];
  price: number | null;
  currency: string;
  averageRating: number | null;
  reviewCount: number;
  imageUrl: string | null;
  productUrl: string | null;
  affiliateUrl: string | null;
};

const mapChoice = (raw: RawChoice): QuizChoice => ({
  id: raw.id,
  label: raw.label,
  value: raw.value,
  order: raw.order,
});

const mapQuestion = (raw: RawQuestion): QuizQuestion => ({
  id: raw.id,
  key: raw.key,
  text: raw.text,
  isMulti: Boolean(raw.is_multi),
  order: raw.order,
  choices: raw.choices.map(mapChoice),
});

const mapSession = (raw: RawSession): QuizSession => ({
  id: raw.id,
  startedAt: raw.started_at,
});

const mapProfile = (raw: RawProfile): QuizProfile => ({
  id: raw.id,
  sessionId: raw.session_id,
  createdAt: raw.created_at,
  primaryConcerns: raw.primary_concerns ?? [],
  secondaryConcerns: raw.secondary_concerns ?? [],
  eyeAreaConcerns: raw.eye_area_concerns ?? [],
  skinType: raw.skin_type ?? null,
  sensitivity: raw.sensitivity ?? null,
  pregnantOrBreastfeeding: raw.pregnant_or_breastfeeding ?? null,
  ingredientRestrictions: raw.ingredient_restrictions ?? [],
  budget: raw.budget ?? null,
  isLatest: Boolean(raw.is_latest),
});

const mapRecommendation = (raw: RawRecommendation): QuizRecommendation => ({
  productId: raw.product_id,
  slug: raw.slug,
  brand: raw.brand,
  productName: raw.product_name,
  category: raw.category,
  rank: raw.rank,
  score: Number(raw.score),
  priceSnapshot: raw.price_snapshot ?? null,
  currency: raw.currency,
  imageUrl: resolveMediaUrl(raw.image_url),
  productUrl: raw.product_url ?? null,
  ingredients: raw.ingredients ?? [],
  rationale: raw.rationale ?? {},
  brandName: raw.brand_name ?? raw.brand ?? null,
  averageRating: typeof raw.average_rating === "number" ? raw.average_rating : null,
  reviewCount: raw.review_count ?? 0,
});

const mapProductDetailIngredient = (
  raw: RawProductDetailIngredient
): ProductDetailIngredient => ({
  name: raw.name,
  inciName: raw.inci_name ?? null,
  highlight: Boolean(raw.highlight),
  order: typeof raw.order === "number" ? raw.order : 0,
});

const mapProductDetail = (raw: RawProductDetail): ProductDetail => {
  const heroIngredients =
    Array.isArray(raw.hero_ingredients) && raw.hero_ingredients.length
      ? raw.hero_ingredients
          .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
          .filter((item) => item.length > 0)
      : [];

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map(mapProductDetailIngredient).sort((a, b) => a.order - b.order)
    : [];

  const sanitizeList = (values?: string[] | null) =>
    Array.isArray(values)
      ? values
          .map((value) => (typeof value === "string" ? value.trim() : String(value).trim()))
          .filter((value) => value.length > 0)
      : [];

  return {
    productId: raw.product_id,
    slug: raw.slug,
    brand: raw.brand,
    productName: raw.product_name,
    category: raw.category,
    categoryLabel: raw.category_label ?? null,
    summary: raw.summary ?? null,
    description: raw.description ?? null,
    heroIngredients,
    ingredients,
    concerns: sanitizeList(raw.concerns),
    skinTypes: sanitizeList(raw.skin_types),
    restrictions: sanitizeList(raw.restrictions),
    price: typeof raw.price === "number" ? raw.price : null,
    currency: raw.currency,
    averageRating: typeof raw.average_rating === "number" ? raw.average_rating : null,
    reviewCount: typeof raw.review_count === "number" ? raw.review_count : 0,
    imageUrl: resolveMediaUrl(raw.image_url),
    productUrl: raw.product_url ?? null,
    affiliateUrl: raw.affiliate_url ?? raw.product_url ?? null,
  };
};

const mapFeedbackHighlight = (raw: RawFeedbackHighlight): FeedbackHighlight => {
  let rating: number | null = null;
  if (typeof raw.rating === "number") {
    rating = raw.rating;
  } else if (typeof raw.rating === "string" && raw.rating.trim()) {
    const parsed = Number(raw.rating);
    rating = Number.isNaN(parsed) ? null : parsed;
  }

  return {
    id: raw.id,
    createdAt: raw.created_at,
    rating,
    message: raw.message,
    displayName: raw.display_name,
    initials: raw.initials,
    location: raw.location ?? null,
    badge: raw.badge ?? null,
  };
};

const sanitizeSummaryList = (values?: string[] | null) =>
  Array.isArray(values)
    ? values
        .map((value) => (typeof value === "string" ? value.trim() : String(value).trim()))
        .filter((value) => value.length > 0)
    : [];

const mapSummaryIngredients = (
  items?: RawSummaryIngredient[] | null
): QuizSummaryIngredient[] =>
  Array.isArray(items)
    ? items
        .map((item) => {
          if (!item) return null;
          const name = typeof item.name === "string" ? item.name.trim() : "";
          if (!name) return null;
          const reason =
            typeof item.reason === "string" ? item.reason.trim() : "";
          return {
            name,
            reason,
          };
        })
        .filter(
          (entry): entry is QuizSummaryIngredient =>
            Boolean(entry && entry.name.length)
        )
    : [];

const mapSummary = (raw: RawFinalizeSummary): QuizResultSummary => ({
  primaryConcerns: sanitizeSummaryList(raw.primary_concerns),
  topIngredients: sanitizeSummaryList(raw.top_ingredients),
  ingredientsToPrioritize: mapSummaryIngredients(raw.ingredients_to_prioritize),
  ingredientsCaution: mapSummaryIngredients(raw.ingredients_caution),
  categoryBreakdown: raw.category_breakdown ?? {},
  generatedAt: raw.generated_at ?? null,
  scoreVersion: raw.score_version ?? null,
});

const mapStrategyNotes = (notes?: string[] | null): string[] =>
  (notes ?? [])
    .map((note) => {
      if (!note) return "";
      if (typeof note === "string") {
        return note.trim();
      }
      return String(note).trim();
    })
    .filter((note) => Boolean(note.length));

const mapFinalize = (raw: RawFinalize): QuizFinalize => {
  const resultSummary = raw.result_summary ?? {};
  // Ensure we properly extract strategy_notes from the result_summary
  // The backend returns: { summary: {...}, recommendations: [...], strategy_notes: [...] }
  const strategyNotes = resultSummary.strategy_notes ?? null;
  
  return {
    sessionId: raw.session_id,
    completedAt: raw.completed_at,
    requiresAuth: Boolean(raw.requires_auth),
    profile: raw.profile ? mapProfile(raw.profile) : null,
    summary: mapSummary(resultSummary.summary ?? {}),
    strategyNotes: mapStrategyNotes(strategyNotes),
    recommendations: (resultSummary.recommendations ?? []).map(mapRecommendation),
  };
};

const mapHistoryItem = (raw: RawHistoryItem): QuizHistoryItem => {
  const summaryWrapper = raw.result_summary ?? null;
  return {
    sessionId: raw.session_id,
    completedAt: raw.completed_at,
    profileId: raw.profile_id,
    primaryConcerns: raw.primary_concerns ?? [],
    budget: raw.budget ?? null,
    profile: raw.profile ? mapProfile(raw.profile) : null,
    resultSummary: summaryWrapper?.summary ? mapSummary(summaryWrapper.summary) : null,
    strategyNotes: mapStrategyNotes(summaryWrapper?.strategy_notes),
    recommendations: (summaryWrapper?.recommendations ?? []).map(mapRecommendation),
    answerSnapshot: (raw.answer_snapshot ?? {}) as Record<string, unknown>,
  };
};

const mapHistoryDetail = (raw: RawHistoryDetail): QuizHistoryDetail => ({
  sessionId: raw.session_id,
  completedAt: raw.completed_at,
  profile: raw.profile ? mapProfile(raw.profile) : null,
  summary: mapSummary(raw.summary ?? {}),
  strategyNotes: mapStrategyNotes(raw.strategy_notes),
  recommendations: (raw.recommendations ?? []).map(mapRecommendation),
  answerSnapshot: raw.answer_snapshot ?? {},
});

const mapPick = (raw: RawMatchPick): QuizMatchPick => ({
  productId: raw.product_id,
  slug: raw.slug,
  brand: raw.brand,
  productName: raw.product_name,
  category: raw.category,
  rank: raw.rank,
  score: Number(raw.score),
  priceSnapshot: raw.price_snapshot ?? null,
  currency: raw.currency,
  ingredients: raw.ingredients ?? [],
  rationale: raw.rationale ?? {},
  imageUrl: raw.image_url ?? null,
  productUrl: raw.product_url ?? null,
  averageRating: typeof raw.average_rating === "number" ? raw.average_rating : null,
  reviewCount: raw.review_count ?? 0,
});

const mapSessionDetail = (raw: RawSessionDetail): QuizSessionDetail => ({
  sessionId: raw.session_id,
  startedAt: raw.started_at,
  completedAt: raw.completed_at ?? null,
  picks: raw.picks.map(mapPick),
  profile: raw.profile ? mapProfile(raw.profile) : null,
});

const withAuth = (headers: HeadersInit = {}): HeadersInit => {
  const token = getAuthToken();
  if (!token) return headers;
  if (headers instanceof Headers) {
    headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
};

export async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/questions`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load quiz questions");
  }
  const data: RawQuestion[] = await res.json();
  return data.map(mapQuestion);
}

export async function startQuizSession(): Promise<QuizSession> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/start`, {
    method: "POST",
    headers: {
      ...withAuth({ "Content-Type": "application/json" }),
    },
  });
  if (!res.ok) {
    throw new Error("Failed to start quiz session");
  }
  const data: RawSession = await res.json();
  return mapSession(data);
}

export async function submitQuizAnswer(
  sessionId: string,
  questionId: string,
  choiceIds: string[]
): Promise<void> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/answer`, {
    method: "POST",
    headers: {
      ...withAuth({ "Content-Type": "application/json" }),
    },
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      choice_ids: choiceIds,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to submit quiz answer");
  }
}

export async function finalizeQuizSession(sessionId: string): Promise<QuizFinalize> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/submit?session_id=${encodeURIComponent(sessionId)}`, {
    method: "POST",
    headers: {
      ...withAuth({ "Content-Type": "application/json" }),
    },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to finalize quiz session");
  }
  const data: RawFinalize = await res.json();
  return mapFinalize(data);
}

export async function fetchQuizHistory(token: string): Promise<QuizHistoryItem[]> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/history`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    return [];
  }
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to load quiz history");
  }

  const data: RawHistoryItem[] = await res.json();
  return data.map(mapHistoryItem);
}

export async function deleteQuizHistory(historyId: string, token: string): Promise<QuizHistoryDeleteAck> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/history/${encodeURIComponent(historyId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("That match is no longer available.");
  }
  if (res.status === 401) {
    throw new Error("Please sign in again to manage your matches.");
  }
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to delete match");
  }

  const data = (await res.json()) as { ok?: boolean; was_latest?: boolean };
  return {
    ok: Boolean(data?.ok),
    wasLatest: Boolean(data?.was_latest),
  };
}

export async function fetchQuizSessionDetail(sessionId: string): Promise<QuizSessionDetail> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/session/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: withAuth(),
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("We couldn't find that match session. Please refresh.");
  }
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to load match details");
  }

  const data: RawSessionDetail = await res.json();
  return mapSessionDetail(data);
}

export async function fetchQuizHistoryDetail(profileId: string): Promise<QuizHistoryDetail> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/history/profile/${encodeURIComponent(profileId)}`, {
    method: "GET",
    headers: withAuth(),
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("We couldn't find that match session. Please refresh.");
  }
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to load match details");
  }

  const data: RawHistoryDetail = await res.json();
  return mapHistoryDetail(data);
}

export async function fetchProductDetail(productId: string): Promise<ProductDetail> {
  if (!productId) {
    throw new Error("Product ID is required to load details.");
  }

  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/products/${encodeURIComponent(productId)}`, {
    method: "GET",
    headers: withAuth(),
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("This product is no longer available.");
  }
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to load product details.");
  }

  const data: RawProductDetail = await res.json();
  return mapProductDetail(data);
}

export async function emailQuizSummary(sessionId: string, email?: string): Promise<void> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/email-summary`, {
    method: "POST",
    headers: {
      ...withAuth({ "Content-Type": "application/json" }),
    },
    body: JSON.stringify({
      session_id: sessionId,
      email: email ?? null,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "We couldn't email your summary just yet.");
  }
}

export async function submitQuizFeedback(payload: SubmitFeedbackPayload): Promise<void> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/quiz/feedback`, {
    method: "POST",
    headers: {
      ...withAuth({ "Content-Type": "application/json" }),
    },
    body: JSON.stringify({
      session_id: payload.sessionId,
      rating: payload.rating,
      message: payload.message ?? "",
      metadata: payload.metadata ?? {},
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "We couldn't save your feedback just yet.");
  }
}

export async function fetchFeedbackHighlights(limit = 3): Promise<FeedbackHighlight[]> {
  const base = resolveApiBase();
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${base}/quiz/feedback/highlights?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to load community feedback.");
  }

  const data: RawFeedbackHighlight[] = await res.json();
  return data.map(mapFeedbackHighlight);
}
