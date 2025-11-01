// lib/api.facts.ts
import type {
  FactContentBlock,
  FactTopicDetail,
  FactTopicSummary,
  SkinFactSection,
} from "@/lib/types";

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
  block_type: "heading" | "text" | "paragraph" | "image";
  heading?: string | null;
  text?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
};

type RawFactTopicDetail = RawFactTopicSummary & {
  updated_at: string;
  content_blocks: RawFactContentBlock[];
};

const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK === "1";

const getApiBase = () => {
  // what frontend calls in browser
  const baseFromClient = process.env.NEXT_PUBLIC_API_BASE || "/api";

  // what server calls (in container vs localhost)
  const isServer = typeof window === "undefined";

  if (isServer) {
    // prefer internal URL first if provided
    let fromEnv =
      process.env.INTERNAL_API_BASE ||
      process.env.API_BASE ||
      baseFromClient.replace(
        /^https?:\/\/localhost(:\d+)?/,
        (_match, port = ":8000") => `http://backend${port}`
      );

    // if they gave us just "/api", turn it into http://backend:8000/api
    if (fromEnv.startsWith("/")) {
      fromEnv = `http://backend:8000${fromEnv}`;
    }

    // remove trailing slash
    return fromEnv.replace(/\/+$/, "");
  }

  // client side: just strip trailing slash
  return baseFromClient.replace(/\/+$/, "");
};

const mapSummary = (raw: RawFactTopicSummary): FactTopicSummary => ({
  id: raw.id,
  slug: raw.slug,
  title: raw.title,
  subtitle: raw.subtitle ?? null,
  excerpt: raw.excerpt ?? null,
  section: raw.section,
  heroImageUrl: raw.hero_image_url ?? null,
  heroImageAlt: raw.hero_image_alt ?? null,
  viewCount: raw.view_count ?? 0,
});

const mapBlock = (raw: RawFactContentBlock): FactContentBlock => ({
  order: raw.order,
  blockType: raw.block_type, // "heading" | "text"
  heading: raw.heading ?? null,
  text: raw.text ?? null,
  imageUrl: raw.image_url ?? null,
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

  const base = getApiBase();
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
  offset = 0
): Promise<FactTopicSummary[]> {
  if (shouldUseMock) {
    const { sectionTopicsMock } = await import("@/mocks/facts.mock");
    await new Promise((r) => setTimeout(r, 120));
    return sectionTopicsMock[section]?.slice(offset, offset + limit) ?? [];
  }

  const base = getApiBase();
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `${base}/facts/topics/section/${section}?${params.toString()}`,
    {
      cache: "no-store",
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

  const base = getApiBase();
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
