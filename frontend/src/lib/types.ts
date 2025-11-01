export type SkinFactSection = "knowledge" | "trending" | "fact_check";

export type FactContentBlock = {
  order: number;
  blockType: "heading" | "text" | "paragraph" | "image";
  heading: string | null;
  text: string | null;
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
