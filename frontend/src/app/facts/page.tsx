import PopularTopics from "./_PopularTopics";

export default function FactsPage() {
  return (
    <main className="min-h-screen bg-[#d4e6cb] pb-16">
      {/* Keep your navbar above, this starts the page body */}
      <div className="pt-24" />
      <PopularTopics />
    </main>
  );
}