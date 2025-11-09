export type SkinFactSection = "knowledge" | "trending" | "fact_check" | "ingredient_spotlight";

export type FactContentBlock = {
  order: number;
  content: string | null; // Markdown content for text blocks
  imageUrl: string | null;
  imageAlt: string | null;
};

export type FactTopicSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  section: SkinFactSection;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  viewCount: number;
};

export type FactTopicDetail = FactTopicSummary & {
  updatedAt: string;
  contentBlocks: FactContentBlock[];
};
