// src/types/modules.d.ts
declare module "@/mocks/facts.mock" {
  import type { FactTopicDetail, FactTopicSummary, SkinFactSection } from "@/lib/types";
  export const popularTopicsMock: FactTopicSummary[];
  export const sectionTopicsMock: Record<SkinFactSection, FactTopicSummary[]>;
  export const topicDetailMock: FactTopicDetail;
}
