import PopularTopics from "./_PopularTopics";
import SkinKnowledge from "./_SkinKnowledge";
import FactCheck from "./_FactCheck";
import TrendingSkincare from "./_TrendingSkincare";
import IngredientSpotlight from "./_IngredientSpotlight";
import RecommendedForYou from "./_RecommendedForYou";
import AskExpertCTA from "./_AskExpertCTA";
import SiteFooter from "@/components/SiteFooter";

export default function FactsPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-[#d9edcf] via-[#eaf5dd] to-[#f6f8ef] pb-16">
        <div className="pt-20" />
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
