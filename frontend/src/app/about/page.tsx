export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#bcdcf6]">
      {/* Full width, same side padding as Navbar (px-6) */}
      <section className="px-6 pt-28 pb-16">
        {/* Paper card with texture */}
        <div
          className="relative w-full rounded-3xl border-2 border-black shadow-[6px_8px_0_rgba(0,0,0,0.35)]"
          style={{
            backgroundImage: "url('/bg/paper.png')", // 👈 your paper texture
            backgroundSize: "cover",
            backgroundRepeat: "repeat",
          }}
        >

          {/* Text content */}
          <div className="relative p-10">
            <h2 className="text-3xl font-extrabold text-[#3B2F4A] mb-6">
              Message from our Team
            </h2>

            <p className="italic text-xl leading-relaxed mb-6 text-gray-800">
             Choosing skincare today can feel overwhelming. With endless products, 
             confusing ingredient lists, and bold marketing claims, it’s hard to know 
             what’s truly right for your skin. That’s why we created SkinMatch—to make 
             skincare simple, safe, and stress-free.

            </p>

            <p className="italic text-xl leading-relaxed mb-6 text-gray-800">
              By analyzing ingredients and building personalized skin profiles, 
              we help you understand what supports your skin and what may cause irritation. 
              With this knowledge, you can create routines that fit your goals and explore products 
              that are both effective and safe.
            </p>

            <p className="italic text-xl leading-relaxed mb-6 text-gray-800">
              Our mission is to help everyone feels confident that each skincare decision they make is the right match for their skin. 
            </p>

            <p className="italic text-xlle leading-relaxed font-semibold text-gray-800">
              Your Skin, Your Match, Your Best Care!
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}