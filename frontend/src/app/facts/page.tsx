import PopularTopics from "./_PopularTopics";
import SkinKnowledge from "./_SkinKnowledge";
import FactCheck from "./_FactCheck";
import TrendingSkincare from "./_TrendingSkincare";
import IngredientSpotlight from "./_IngredientSpotlight";
import RecommendedForYou from "./_RecommendedForYou";
import AskExpertCTA from "./_AskExpertCTA";
import SiteFooter from "@/components/SiteFooter";
import PageContainer from "@/components/PageContainer";

const MOBILE_SECTIONS = [
  { id: "facts-popular", label: "Highlights" },
  { id: "facts-recommended", label: "For you" },
  { id: "facts-spotlight", label: "Spotlight" },
  { id: "facts-knowledge", label: "Knowledge" },
  { id: "facts-factcheck", label: "Fact-check" },
  { id: "facts-trending", label: "Trending" },
  { id: "facts-expert", label: "Ask Matchy" },
];

export default function FactsPage() {
  return (
    <>
      <main className="min-h-screen bg-[#d2eec8] to-[#f6f8ef] lg:pb-16">
        <div className="pt-27 lg:pt-12" />

        <PageContainer className="lg:hidden fixed inset-x-0 bottom-5 z-30">
          <div className="flex gap-3 overflow-x-auto rounded-full border-2 border-black bg-white/90 px-4 py-3 shadow-[2px_3px_0_rgba(0,0,0,0.35)] backdrop-blur">
            {MOBILE_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="whitespace-nowrap rounded-full border border-black/10 bg-[#f1f5ec] px-4 py-1 text-sm font-semibold text-[#1c2b20] transition active:scale-95"
              >
                {section.label}
              </a>
            ))}
          </div>
        </PageContainer>

        <div className="space-y-6">
          <PopularTopics sectionId="facts-popular" />
          <RecommendedForYou sectionId="facts-recommended" />
          <IngredientSpotlight sectionId="facts-spotlight" />
          <SkinKnowledge sectionId="facts-knowledge" />
          <FactCheck sectionId="facts-factcheck" />
          <TrendingSkincare sectionId="facts-trending" />
          <AskExpertCTA sectionId="facts-expert" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
