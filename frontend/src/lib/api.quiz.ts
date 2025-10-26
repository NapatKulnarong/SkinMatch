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

type RawFinalizeSummary = {
  primary_concerns?: string[] | null;
  top_ingredients?: string[] | null;
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
  };
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

export type QuizResultSummary = {
  primaryConcerns: string[];
  topIngredients: string[];
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
  recommendations: QuizRecommendation[];
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
  imageUrl: raw.image_url ?? null,
  productUrl: raw.product_url ?? null,
  ingredients: raw.ingredients ?? [],
  rationale: raw.rationale ?? {},
  brandName: raw.brand_name ?? raw.brand ?? null,
  averageRating: typeof raw.average_rating === "number" ? raw.average_rating : null,
  reviewCount: raw.review_count ?? 0,
});

const mapSummary = (raw: RawFinalizeSummary): QuizResultSummary => ({
  primaryConcerns: raw.primary_concerns ?? [],
  topIngredients: raw.top_ingredients ?? [],
  categoryBreakdown: raw.category_breakdown ?? {},
  generatedAt: raw.generated_at ?? null,
  scoreVersion: raw.score_version ?? null,
});

const mapFinalize = (raw: RawFinalize): QuizFinalize => ({
  sessionId: raw.session_id,
  completedAt: raw.completed_at,
  requiresAuth: Boolean(raw.requires_auth),
  profile: raw.profile ? mapProfile(raw.profile) : null,
  summary: mapSummary(raw.result_summary?.summary ?? {}),
  recommendations: (raw.result_summary?.recommendations ?? []).map(mapRecommendation),
});

export async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  const base = getApiBase();
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
  const base = getApiBase();
  const res = await fetch(`${base}/quiz/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
  const base = getApiBase();
  const res = await fetch(`${base}/quiz/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
  const base = getApiBase();
  const res = await fetch(`${base}/quiz/submit?session_id=${encodeURIComponent(sessionId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to finalize quiz session");
  }
  const data: RawFinalize = await res.json();
  return mapFinalize(data);
}
