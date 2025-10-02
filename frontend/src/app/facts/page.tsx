import PopularTopics from "./_PopularTopics";
import SkinKnowledge from "./_SkinKnowledge";

export default function FactsPage() {
  return (
    <main className="min-h-screen bg-[#d4e6cb] pb-16">
      {/* Keep your navbar above, this starts the page body */}
      <div className="pt-24" />
      <PopularTopics />
      <SkinKnowledge />
    </main>
  );
}
