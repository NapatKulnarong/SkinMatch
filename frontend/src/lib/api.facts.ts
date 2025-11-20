// lib/api.facts.ts
import type {
  FactContentBlock,
  FactTopicDetail,
  FactTopicSummary,
  SkinFactSection,
} from "@/lib/types";
import { getAuthToken } from "@/lib/auth-storage";
import { resolveApiBase, resolveMediaUrl } from "@/lib/apiBase";

type RawFactTopicSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  section: SkinFactSection;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  view_count?: number;
};

type RawFactContentBlock = {
  order: number;
  content?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
};

type RawFactTopicDetail = RawFactTopicSummary & {
  updated_at: string;
  content_blocks: RawFactContentBlock[];
};

const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK === "1";

const mapSummary = (raw: RawFactTopicSummary): FactTopicSummary => ({
  id: raw.id,
  slug: raw.slug,
  title: raw.title,
  subtitle: raw.subtitle ?? null,
  excerpt: raw.excerpt ?? null,
  section: raw.section,
  heroImageUrl: resolveMediaUrl(raw.hero_image_url, { keepBackendOrigin: true }),
  heroImageAlt: raw.hero_image_alt ?? null,
  viewCount: raw.view_count ?? 0,
});

const mapBlock = (raw: RawFactContentBlock): FactContentBlock => ({
  order: raw.order,
  content: raw.content ?? null,
  imageUrl: resolveMediaUrl(raw.image_url, { keepBackendOrigin: true }),
  imageAlt: raw.image_alt ?? null,
});

const mapDetail = (raw: RawFactTopicDetail): FactTopicDetail => {
  const summary = mapSummary(raw as RawFactTopicSummary);

  return {
    ...summary,
    updatedAt: raw.updated_at,
    contentBlocks: Array.isArray(raw.content_blocks)
      ? raw.content_blocks.map(mapBlock)
      : [],
  };
};


export async function fetchPopularTopics(
  limit = 5
): Promise<FactTopicSummary[]> {
  if (shouldUseMock) {
    const { popularTopicsMock } = await import("@/mocks/facts.mock");
    await new Promise((r) => setTimeout(r, 150));
    return popularTopicsMock.slice(0, limit);
  }

  const base = resolveApiBase();
  const res = await fetch(`${base}/facts/topics/popular?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load popular topics");
  }
  const data: RawFactTopicSummary[] = await res.json();
  return data.map(mapSummary);
}

export async function fetchTopicsBySection(
  section: SkinFactSection,
  limit = 6,
  offset = 0,
  sessionId?: string | null
): Promise<FactTopicSummary[]> {
  if (shouldUseMock) {
    const { sectionTopicsMock } = await import("@/mocks/facts.mock");
    await new Promise((r) => setTimeout(r, 120));
    return sectionTopicsMock[section]?.slice(offset, offset + limit) ?? [];
  }

  const base = resolveApiBase();
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (sessionId) {
    params.append("session_id", sessionId);
  }
  const token = getAuthToken();
  const res = await fetch(
    `${base}/facts/topics/section/${section}?${params.toString()}`,
    {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to load topics for section ${section}`);
  }
  const data: RawFactTopicSummary[] = await res.json();
  return data.map(mapSummary);
}

export async function fetchFactTopicDetail(
  slug: string
): Promise<FactTopicDetail | null> {
  if (shouldUseMock) {
    const { topicDetailMock } = await import("@/mocks/facts.mock");
    await new Promise((r) => setTimeout(r, 120));
    if (topicDetailMock.slug === slug) return topicDetailMock;
    return null;
  }

  const base = resolveApiBase();
  const res = await fetch(`${base}/facts/topics/${slug}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to load topic");
  }

  const data: RawFactTopicDetail = await res.json();
  return mapDetail(data);
}

export async function fetchRecommendedTopics(
  limit = 4,
  sessionId?: string | null
): Promise<FactTopicSummary[]> {
  if (shouldUseMock) {
    // fall back to a blend of knowledge + popular when mocking
    const [section, popular] = await Promise.all([
      (async () => {
        const { sectionTopicsMock } = await import("@/mocks/facts.mock");
        await new Promise((r) => setTimeout(r, 80));
        return (sectionTopicsMock["knowledge"] ?? []).slice(0, limit);
      })(),
      (async () => {
        const { popularTopicsMock } = await import("@/mocks/facts.mock");
        await new Promise((r) => setTimeout(r, 80));
        return popularTopicsMock.slice(0, limit);
      })(),
    ]);
    const combined = [...section, ...popular];
    const deduped = combined.filter(
      (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i
    );
    return deduped.slice(0, limit);
  }

  const base = resolveApiBase();
  const token = getAuthToken();
  
  // Build query params
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  
  // Add session_id for anonymous users (only if no token)
  if (!token && sessionId) {
    params.append("session_id", sessionId);
  }
  
  const url = `${base}/facts/topics/recommended?${params.toString()}`;
  console.log("[fetchRecommendedTopics] Requesting:", url, { 
    sessionId, 
    hasToken: !!token,
    isAnonymous: !token 
  });
  
  const res = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (res.status === 401) {
    // Not logged in and no valid session -> return empty array
    console.log("[fetchRecommendedTopics] 401 Unauthorized, returning empty array");
    return [];
  }
  
  if (!res.ok) {
    console.error("[fetchRecommendedTopics] Failed with status:", res.status);
    throw new Error("Failed to load recommended topics");
  }
  
  const data: RawFactTopicSummary[] = await res.json();
  console.log("[fetchRecommendedTopics] Received topics:", data.length);
  
  return data.map(mapSummary);
}
