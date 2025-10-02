// src/app/facts/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PastelHero from "../_PastelHero";
import PastelArticle from "../_PastelArticle";
import PastelLayout from "../_PastelLayout";

type Params = { params: { slug: string } };

// Central place to define per-topic content.
// Later, replace this with a fetch to your Django API by slug.
const ARTICLES: Record<
  string,
  {
    title: string;
    cover: string; // path in /public
    body: JSX.Element;
  }
> = {
  "do-sheet-masks-help": {
    title: "Do sheet masks really help your skin?",
    cover: "/img/facts_img/sheet_mask.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          Sheet Mask Text Extraction
        </h2>
        <p className="text-gray-700 mb-8">
          Here is the extracted text from the original summary, covering the
          theory, history, debate, and verdict on sheet masks:
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          The Theory Behind Sheet Masks
        </h3>
        <p className="text-gray-800 mb-6">
          &ldquo;The theory behind sheet masks is simple: essences, serums, and skin
          treatments would be absorbed much better into the skin if they are
          left on for a longer period of time, with an{" "}
          <strong>occlusive barrier</strong> sort of trapping the moisture on
          the surface of the skin. Apparently, this idea has been around not
          just for years, but centuries! The very first patented version of a
          sheet mask was created by <strong>Helen Rowley in 1875</strong>... The
          rubber mask also served to confine &lsquo;unguents or other medical
          preparations to the skin of the face...&rsquo;&rdquo;
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Modern Masking and Routine
        </h3>
        <p className="text-gray-800 mb-6">
          &ldquo;The sheet mask we use today started when{" "}
          <strong>
            Max Factor’s Japanese subsidiary (now known as SK-II) applied to
            patent
          </strong>{" "}
          a &lsquo;cosmetic face pack treatment&rsquo; in 1982... Korean cosmetic corporate
          giant <strong>Amorepacific</strong> took the SK-II invention further
          with its own 2006 patent, making more specifications on sheet mask
          materials, as well as the ingredients for a the essence it soaks in...
          If you really want to get the full benefits of masking though, it’s
          prescribed as <strong>step seven in the 10-step Korean skin care
          routine</strong>. Yes, that means masking at least once per day, every
          day!&rdquo;
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          The Debate on Effectiveness
        </h3>
        <p className="text-gray-800 mb-6">
          &ldquo;On the other hand, not everyone thinks sheet masks are helpful, let
          alone necessary for daily skin care. Beauty guru{" "}
          <strong>Paula Begoun</strong>, for one, has been quoted as saying, &lsquo;I
          hate sheet masks. They’re a waste of time. Even a well-formulated one
          is a waste of time. Ingredients are going to penetrate based on their
          molecular size. Nothing else. Having that sheet on your face does not
          form enough of a barrier. It’s bullshit that the sheet helps
          ingredients absorb.&rsquo;... And for busy people, putting on a sheet mask
          just takes too much time; why bother if they already have a skin care
          routine that works for them?&rdquo;
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          The Verdict
        </h3>
        <p className="text-gray-800">
          &ldquo;After everything, it’s really{" "}
          <strong>up to you and what works for your skin!</strong> I could see
          how someone with{" "}
          <strong>very dry skin can get relief with regular sheet masking</strong>
          . But I would also understand how someone like Paula Begoun... would
          see sheet masks as an unnecessary waste of time. Personally, I enjoy
          using sheet masks on days when I have drier skin than usual, or to
          help me relax after a stressful day... as with everything else in skin
          care, <strong>Your Mileage May Vary (YMMV)</strong>. There’s nothing
          wrong with incorporating sheet masks into your daily routine, but if
          you’re not on #TeamSheetMask there’s nothing bad about that, either.&rdquo;
        </p>
      </>
    ),
  },

  // --- Skin knowledge topics (manual content for now) ---
  "retinol-beginners": {
    title: "Retinol for beginners",
    cover: "/img/facts_img/retinol.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Retinol basics for first-timers
        </h2>
        <p className="text-gray-700 mb-8">
          Retinol is a vitamin A derivative that speeds up skin cell turnover
          and boosts collagen. It can brighten tone, soften lines, and clear
          congestion, but only when introduced slowly and supported with
          moisture and sun protection.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Why dermatologists recommend it
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Improves texture by prompting fresh, smoother skin to surface.</li>
          <li>Helps prevent future breakouts by keeping pores clear.</li>
          <li>Stimulates collagen to soften the look of fine lines over time.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to introduce retinol without freaking out your skin
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Start with a pea-sized amount of a low-strength (0.1-0.3%) formula.</li>
          <li>Apply on dry skin after cleansing, then sandwich with moisturizer.</li>
          <li>Use it twice a week for the first 2-3 weeks, then slowly add nights as tolerated.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Pairing it with the rest of your routine
        </h3>
        <p className="text-gray-800 mb-6">
          Keep mornings gentle; think hydrating serums and a broad-spectrum
          SPF 30 or higher. At night, avoid layering other strong actives like
          AHAs, BHAs, or vitamin C on the same evenings you use retinol to
          reduce the risk of irritation.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Common mistakes to avoid
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Skipping sunscreen (retinol makes skin more sun-sensitive).</li>
          <li>Applying to damp skin, which can push the ingredient deeper and sting.</li>
          <li>Using it every night immediately; give your barrier time to adjust.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          When to pause or seek help
        </h3>
        <p className="text-gray-800">
          Mild flaking and warmth are normal at first, but painful burning,
          persistent redness, or eczema flare-ups are signs to stop and see a
          dermatologist. Pregnant or breastfeeding? Skip retinoids altogether
          and ask for safer alternatives.
        </p>
      </>
    ),
  },
  "spf-everyday": {
    title: "Why SPF is a daily essential",
    cover: "/img/facts_img/spf.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Daily sun protection basics
        </h2>
        <p className="text-gray-700 mb-8">
          Ultraviolet radiation triggers premature wrinkles, stubborn dark
          spots, and increases skin cancer risk year round. Wearing
          broad-spectrum SPF every day is the easiest way to shield collagen,
          keep hyperpigmentation in check, and protect future you.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What broad-spectrum really means
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>UVB rays burn the surface and are strongest mid-day.</li>
          <li>UVA rays penetrate deeper, drive photoaging, and pass through clouds and windows.</li>
          <li>Broad-spectrum labels confirm the formula shields against both.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Picking the right formula for your skin
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Oily or acne-prone? Look for lightweight gels or chemical filters labeled non-comedogenic.</li>
          <li>Dry or sensitive? Choose creams with ceramides or mineral filters like zinc oxide.</li>
          <li>Deeper skin tones often prefer sheer chemical or hybrid formulas to avoid a white cast.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Application cheat sheet
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Apply SPF 30 or higher as the last step of your morning routine.</li>
          <li>Use two finger lengths for the face and neck, plus extra for ears and chest.</li>
          <li>Press or pat to absorb evenly; do not forget the hairline, eyelids, and jaw.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Reapplication and real life
        </h3>
        <p className="text-gray-800 mb-6">
          Reapply every two hours outdoors, sooner if you swim or sweat.
          Stash a travel-size sunscreen, SPF stick, or SPF makeup mist in your
          bag so touch-ups are painless between meetings or errands.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Myths to retire today
        </h3>
        <ul className="list-disc pl-5 text-gray-800">
          <li>Window light does damage; glass blocks most UVB but not UVA.</li>
          <li>Darker skin tones still need SPF to prevent hyperpigmentation and melanoma.</li>
          <li>SPF in makeup is not enough unless you apply a full teaspoon, so layer a dedicated sunscreen underneath.</li>
        </ul>
      </>
    ),
  },
  "vitamin-c-myths": {
    title: "Vitamin C myths (and what really works)",
    cover: "/img/facts_img/vitc.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Vitamin C truth serum
        </h2>
        <p className="text-gray-700 mb-8">
          L-ascorbic acid is a powerhouse antioxidant, but confusion about
          strength, storage, and layering keeps many people from seeing results.
          Here is how to sort myth from science and build a glow-giving routine.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Myth: Higher percentages are always better
        </h3>
        <p className="text-gray-800 mb-6">
          Reality: Most complexions do best between 10% and 15%. Sensitive skin
          can start with 8% and still see brightening. Jumping straight to 20%
          can trigger stinging or redness without faster payoff.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Myth: Vitamin C replaces sunscreen
        </h3>
        <p className="text-gray-800 mb-6">
          Reality: Antioxidants neutralize some free radicals but they do not
          block UV radiation. Vitamin C boosts SPF performance, yet you still
          need a dedicated broad-spectrum sunscreen every day.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Myth: All formulas work the same
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Pure L-ascorbic acid offers the strongest evidence but needs a low pH and opaque packaging.</li>
          <li>Derivatives like sodium ascorbyl phosphate are gentler yet convert more slowly on the skin.</li>
          <li>Look for partners such as vitamin E and ferulic acid to stabilize and boost efficacy.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to fold it into your routine
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Apply a few drops to clean, dry skin in the morning.</li>
          <li>Let it absorb for 60 seconds, then layer hydrating serum or moisturizer.</li>
          <li>Finish with SPF to lock in protection and prevent oxidation from sunlight.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Storage and shelf life tips
        </h3>
        <p className="text-gray-800">
          Keep the bottle tightly sealed, away from heat and light. If the
          serum turns dark orange or brown or develops a sour smell, the
          vitamin C has oxidized and it is time for a fresh bottle.
        </p>
      </>
    ),
  },
  "double-cleansing": {
    title: "Double cleansing: who actually needs it?",
    cover: "/img/facts_img/double_cleanse.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Two-step cleansing decoded
        </h2>
        <p className="text-gray-700 mb-8">
          Double cleansing uses an oil-based product followed by a water-based
          cleanser to lift long-wear makeup, SPF, and grime without rough
          scrubbing. It is not just for influencers; it is a practical method
          for anyone who layers products or lives in urban pollution.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          When the extra step is worth it
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>You wear mineral sunscreen or waterproof makeup every day.</li>
          <li>Your skin feels congested even after cleansing once.</li>
          <li>You are exposed to heavy pollution, smoke, or gym sweat.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to double cleanse the right way
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Massage a balm or cleansing oil onto dry skin for 45 seconds.</li>
          <li>Add warm water to emulsify, then rinse thoroughly.</li>
          <li>Follow with a gentle gel or cream cleanser to sweep away residue.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Do you have to do it nightly?
        </h3>
        <p className="text-gray-800 mb-6">
          Not necessarily. Combination or dry skin types can reserve the two-step
          method for makeup days, while oilier complexions may enjoy the daily
          refresh. Either way, stick to low-foam, pH-balanced formulas to keep
          your barrier happy.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Quick troubleshooting
        </h3>
        <ul className="list-disc pl-5 text-gray-800">
          <li>Feeling tight? Switch the second cleanser to a cream or milk texture.</li>
          <li>Breaking out? Check that the oil cleanser rinses clean and is labeled non-comedogenic.</li>
          <li>Short on time? Use micellar water and a gentle cleanser as a speedy alternative.</li>
        </ul>
      </>
    ),
  },
  "green-tea-calm": {
    title: "Green tea calm-down routine",
    cover: "/img/facts_img/green_tea.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Why green tea is a skin saver
        </h2>
        <p className="text-gray-700 mb-8">
          Camellia sinensis leaves are loaded with catechins, especially
          EGCG, a potent antioxidant that calms redness and shields skin from
          pollution. Green tea extracts are lightweight, so they slot into oily
          or combo routines without feeling sticky.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Benefits backed by studies
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Neutralizes free radicals before they trigger collagen loss.</li>
          <li>Helps dial down sebum oxidation that can lead to breakouts.</li>
          <li>Supports recovery after UV exposure when paired with sunscreen.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to add it to your routine
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Use a green tea toner after cleansing to soothe and prep skin.</li>
          <li>Layer a serum or ampoule in the morning before moisturizer.</li>
          <li>Finish with SPF to lock in the antioxidant backup.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          DIY caution
        </h3>
        <p className="text-gray-800">
          Brewing tea bags and patting them on your face can be relaxing, but
          it will not deliver the same concentration as stabilized extracts.
          Reach for packaged formulas if you want consistent results.
        </p>
      </>
    ),
  },
  "centella-sos": {
    title: "Centella asiatica SOS for stressed skin",
    cover: "/img/facts_img/centella.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Meet the herb behind the cica craze
        </h2>
        <p className="text-gray-700 mb-8">
          Centella asiatica, also known as tiger grass, is rich in triterpenes
          like asiaticoside. These compounds signal skin to rebuild its barrier,
          making centella a go-to when your complexion feels hot, stingy, or
          over-exfoliated.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What it can help with
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Reduces visible redness thanks to anti-inflammatory madecassoside.</li>
          <li>Supports wound healing, so post-acne marks fade faster.</li>
          <li>Strengthens a compromised barrier after retinoids or acids.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Best ways to use it
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Swap in a centella cream at night when irritation flares.</li>
          <li>Keep a cica ampoule in the fridge for a cool, calming layer.</li>
          <li>Mist centella water through the day to keep blotchiness at bay.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Pairing notes
        </h3>
        <p className="text-gray-800">
          Centella plays nicely with retinol, vitamin C, and exfoliating acids.
          Layer it on top of actives to cushion potential irritation without
          blocking absorption.
        </p>
      </>
    ),
  },
  "aloe-overnight-relief": {
    title: "Aloe vera overnight relief",
    cover: "/img/facts_img/aloe.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Classic gel, modern science
        </h2>
        <p className="text-gray-700 mb-8">
          Aloe vera juice contains polysaccharides that drape the skin in a
          breathable film, slowing water loss and calming heat. It is a hero for
          sun-chapped cheeks and windburned noses alike.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Why aloe works
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Delivers anti-inflammatory acemannan to soothe quickly.</li>
          <li>Provides a light humectant boost without clogging pores.</li>
          <li>Helps minor scrapes and razor nicks recover faster.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Ways to use it at bedtime
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Layer a thin coat of pure aloe gel before your moisturizer.</li>
          <li>Mix a pea-sized amount into thicker creams for a cooling mask.</li>
          <li>Spot treat flaky patches, then seal with a few drops of oil.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Safety reminder
        </h3>
        <p className="text-gray-800">
          Patch test first, especially if you are sensitive to natural
          preservatives. Choose gels that list aloe as the first ingredient and
          avoid heavy added fragrance.
        </p>
      </>
    ),
  },
  "squalane-skin-shield": {
    title: "Plant squalane to fortify your barrier",
    cover: "/img/facts_img/squalane.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Lightweight oil, heavyweight comfort
        </h2>
        <p className="text-gray-700 mb-8">
          Squalane is the stable cousin of squalene, a lipid our skin naturally
          produces. When sourced from olives or sugar cane, it mimics your
          barrier and gives instant slip with zero grease.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Why it earns a spot
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Helps seal in moisture on top of serums and creams.</li>
          <li>Boosts suppleness without clogging pores or oxidizing.</li>
          <li>Works on hair and cuticles, so your bottle never goes to waste.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to apply
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Use two to three drops as the last step at night.</li>
          <li>Mix it into foundation for a dewy finish on dry days.</li>
          <li>Press it onto damp skin after misting for fast absorption.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Who should skip it
        </h3>
        <p className="text-gray-800">
          Most complexions tolerate squalane, but if you battle fungal acne,
          patch test: even non-comedogenic oils can trigger malassezia for some
          people.
        </p>
      </>
    ),
  },
  "oatmeal-sos": {
    title: "Colloidal oatmeal comfort plan",
    cover: "/img/facts_img/oatmeal.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          The pantry staple dermatologists love
        </h2>
        <p className="text-gray-700 mb-8">
          Finely milled oats contain beta-glucans and lipids that bind water and
          calm angry skin. That is why colloidal oatmeal sits at the heart of so
          many eczema-friendly creams.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Biggest benefits
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Forms a protective film that keeps moisture in and irritants out.</li>
          <li>Contains avenanthramides to ease itch and redness fast.</li>
          <li>Balances skin microbiome thanks to naturally occurring sugars.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Using it day to day
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Reach for a colloidal oatmeal cleanser in the morning.</li>
          <li>Layer a rich cream on damp skin after showering.</li>
          <li>Spot treat itchy areas with an oat paste for 10 minutes.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Allergy check
        </h3>
        <p className="text-gray-800">
          Oat allergies are rare but real. If you react to eating oats, steer
          clear of oatmeal skin care and ask your derm for alternatives such as
          shea butter or ceramides.
        </p>
      </>
    ),
  },
  "manuka-honey-fix": {
    title: "Manuka honey moisture fix",
    cover: "/img/facts_img/manuka.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Sticky, sweet, and skin friendly
        </h2>
        <p className="text-gray-700 mb-8">
          Manuka honey comes from New Zealand tea trees and boasts high levels
          of methylglyoxal, the compound behind its famed antibacterial power.
          It keeps moisture hugging the skin while discouraging breakout-causing
          bacteria.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Why manuka stands out
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Draws water into the skin as a natural humectant.</li>
          <li>Delivers antibacterial support for mild blemishes.</li>
          <li>Provides gentle exfoliation thanks to gluconic acid.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to use it safely
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Apply a thin layer to clean skin and leave for 10 to 15 minutes.</li>
          <li>Mix a teaspoon into your cream mask for a richer treatment.</li>
          <li>Use medical-grade manuka on top of healing blemishes or cuts.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          When to skip
        </h3>
        <p className="text-gray-800">
          Avoid honey masks if you have bee pollen allergies or if your doctor
          has advised you to limit sugar contact on open wounds. Kids under one
          should never use raw honey.
        </p>
      </>
    ),
  },
  "turmeric-bright": {
    title: "Turmeric glow guide",
    cover: "/img/facts_img/turmeric.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Spice cabinet MVP
        </h2>
        <p className="text-gray-700 mb-8">
          Turmeric root is rich in curcumin, a pigment known for quelling
          inflammation and softening the look of dark marks. Modern serums make
          it easy to get the benefits without the kitchen mess.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What it does
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Targets dullness by slowing excess melanin production.</li>
          <li>Helps calm breakouts thanks to antibacterial properties.</li>
          <li>Shields against pollution when paired with broad-spectrum SPF.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Getting started
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Start with a turmeric serum every other night after cleansing.</li>
          <li>Pair with niacinamide or licorice for stubborn dark spots.</li>
          <li>Seal with moisturizer to prevent potential staining on pillowcases.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          DIY warning
        </h3>
        <p className="text-gray-800">
          Mixing spice powder with yogurt can stain skin and fabrics. Choose
          cosmetic-grade extracts that are tested for stability and safety.
        </p>
      </>
    ),
  },
  "jojoba-balance": {
    title: "Jojoba oil for balanced skin",
    cover: "/img/facts_img/jojoba.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Waxy ester that acts like skin sebum
        </h2>
        <p className="text-gray-700 mb-8">
          Jojoba oil is technically a liquid wax, so it sits on the skin more
          like natural sebum than a heavy oil. It softens dry patches while
          signaling overactive oil glands to chill.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Why combo skin loves it
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Delivers vitamin E and B vitamins to support barrier repair.</li>
          <li>Softens flakes without suffocating pores.</li>
          <li>Makes a gentle makeup remover when massaged onto dry skin.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Smart ways to apply
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Press two drops over damp skin morning or night.</li>
          <li>Blend into body lotion for extra slip post-shower.</li>
          <li>Rub through split ends as a lightweight pre-wash treatment.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Storage advice
        </h3>
        <p className="text-gray-800">
          Keep jojoba tightly capped in a cool, dark place. Its long shelf life
          makes it ideal for travel, but heat can still degrade the vitamins
          over time.
        </p>
      </>
    ),
  },
  "silicone-myth": {
    title: "Silicone-free marketing myths",
    cover: "/img/facts_img/silicone_myth.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Why silicone gets blamed for everything
        </h2>
        <p className="text-gray-700 mb-8">
          Shoppers often hear that silicones suffocate skin or clog pores. In
          reality, cosmetic-grade dimethicone and related polymers are
          breathable and non-comedogenic. They sit on top of the skin in a thin
          mesh to lock in moisture and boost spreadability.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Facts to remember
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Silicones are large molecules, so they cannot sink deeply into pores.</li>
          <li>They evaporate slowly, creating a light occlusive that helps actives stay put.</li>
          <li>Medical scar gels rely on silicones to promote a smooth healing surface.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          When going silicone-free makes sense
        </h3>
        <p className="text-gray-800 mb-6">
          Some people prefer a different finish or want to avoid film formers
          when they layer multiple primers. That is a texture preference, not a
          safety concern. If a formula breaks you out, the culprit is usually
          fragrance, pigment, or heavy oils.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Shopping tip
        </h3>
        <p className="text-gray-800">
          Look for phrases such as dimethicone or cyclopentasiloxane near the
          top of the ingredient list when you want a smoothing base under
          makeup. Skip them only when you are chasing a bare-skin finish.
        </p>
      </>
    ),
  },
  "pores-open-close": {
    title: "Do pores open and close?",
    cover: "/img/facts_img/pores_truth.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Pores are not doors
        </h2>
        <p className="text-gray-700 mb-8">
          Steam treatments feel like they open pores, but pores do not have
          muscles. Heat softens sebum, which makes pores appear larger because
          the contents are more fluid. Cold water or toner will not close them
          either.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What actually changes pore appearance
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Consistent exfoliation stops debris from stretching the pore lining.</li>
          <li>Topical retinoids encourage skin to form tighter-looking walls.</li>
          <li>Oil-reducing ingredients such as niacinamide decrease shine around pores.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Smart routine swaps
        </h3>
        <p className="text-gray-800">
          Swap harsh scrubs for salicylic acid or mandelic acid. Pair them with
          a lightweight sunscreen so UV damage does not break down supporting
          collagen.
        </p>
      </>
    ),
  },
  "detoxifying-sweat": {
    title: "Can sweat detox your skin?",
    cover: "/img/facts_img/detox_sweat.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Sweat clears heat, not heavy metals
        </h2>
        <p className="text-gray-700 mb-8">
          Sweat is made mostly of water and electrolytes. Your liver and kidneys
          handle detoxing. Sweating does help flush out temporary buildup in the
          sweat ducts, but it will not purge skincare mistakes or pollution.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to sweat safely for skin health
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Remove makeup before workouts so sweat can escape easily.</li>
          <li>Pat dry with a clean towel and rinse soon after activity.</li>
          <li>Use a gentle cleanser and moisturize to restore hydration.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          When sweat can cause issues
        </h3>
        <p className="text-gray-800">
          Leaving damp clothes on the skin encourages folliculitis. If you deal
          with heat rash, choose loose fabrics and consider an anti-fungal body
          wash on high sweat days.
        </p>
      </>
    ),
  },
  "natural-label-safe": {
    title: "Is natural always safer?",
    cover: "/img/facts_img/natural_label.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Natural is not a regulatory term
        </h2>
        <p className="text-gray-700 mb-8">
          Brands often claim natural equals safe or gentle. In reality, many
          plant extracts cause allergic reactions. Synthetic ingredients can be
          purer and more stable because they are built to avoid irritants.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What labels do not tell you
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Essential oils are natural yet can trigger dermatitis at low doses.</li>
          <li>Preservative-free products spoil faster, which increases infection risk.</li>
          <li>Lab-made copies of vitamins stay potent longer than raw plant juices.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to evaluate a formula
        </h3>
        <p className="text-gray-800">
          Focus on clinical testing, concentration, and packaging. Airless pumps
          and opaque bottles matter more than whether an ingredient grew on a
          farm or in a lab.
        </p>
      </>
    ),
  },
  "purging-vs-breakout": {
    title: "Purging vs breakout confusion",
    cover: "/img/facts_img/purging_breakout.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Not every flare-up is purging
        </h2>
        <p className="text-gray-700 mb-8">
          Purging happens when cell turnover speeds up after starting actives
          like retinoids or acids. Spots appear where you usually break out and
          clear faster. New eruptions outside your problem zones are more likely
          irritation or allergic breakouts.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Timing clues
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Purging peaks around weeks two to four.</li>
          <li>Breakouts from comedogenic products can linger for months.</li>
          <li>Stopping the new product should end irritation-based pimples quickly.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to cope
        </h3>
        <p className="text-gray-800">
          Introduce actives slowly, buffer with moisturizer, and hold off on
          other exfoliants until your skin settles. See a dermatologist if cysts
          become painful or persist past eight weeks.
        </p>
      </>
    ),
  },
  "drying-alcohols": {
    title: "Are all alcohols bad in skincare?",
    cover: "/img/facts_img/drying_alcohol.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Not every alcohol is drying
        </h2>
        <p className="text-gray-700 mb-8">
          Short-chain alcohols like denatured alcohol can feel harsh in high
          concentrations, but fatty alcohols such as cetearyl and behenyl act as
          emollients. They strengthen the lipid barrier and thicken creams.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Know your alcohol categories
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Simple alcohols: give a quick-dry finish, useful for acne spots.</li>
          <li>Fatty alcohols: coconut-derived and moisturizing.</li>
          <li>Sugar alcohols: glycerin cousins that attract water.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to read a label
        </h3>
        <p className="text-gray-800">
          If denatured alcohol appears near the top, balance it with hydrating
          serums. When you spot cetearyl alcohol, consider it a friend that adds
          slip and rich texture.
        </p>
      </>
    ),
  },
  "overnight-results-myth": {
    title: "Overnight results promises",
    cover: "/img/facts_img/overnight_results.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Real change takes a full skin cycle
        </h2>
        <p className="text-gray-700 mb-8">
          A full epidermal turnover takes about 28 days, longer for mature skin.
          Products that promise overnight transformation rely on optical blur or
          exfoliation. They may make skin look smoother temporarily but cannot
          rebuild collagen that fast.
        </p>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Reasonable timelines
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Retinoids: noticeable results in 8 to 12 weeks.</li>
          <li>Vitamin C: brightening within 4 to 6 weeks of daily use.</li>
          <li>Niacinamide: pore and redness reduction around 6 weeks.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Spot hype quickly
        </h3>
        <p className="text-gray-800">
          Watch for phrases such as instant facelift or overnight miracle. Look
          for before-and-after photos taken over months, not hours, and stay
          consistent with sunscreen to protect every gain.
        </p>
      </>
    ),
  },
  "1004-centella-ampoule": {
    title: "Review: 1004 Centella Ampoule",
    cover: "/img/facts_img/centella_ampoule.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Lightweight calming serum for reactive skin
        </h2>
        <p className="text-gray-700 mb-8">
          Madagascar Centella Ampoule is a single-ingredient serum featuring
          100 percent centella asiatica extract. The watery texture sinks in
          quickly, making it a reliable buffer when your routine already has
          strong actives. Expect instant redness relief and subtle hydration
          rather than dramatic overnight changes.
        </p>

        <figure className="mb-8">
          <Image
            src="/img/facts_img/centella_ampoule_2.jpg"
            alt="Texture of SKIN1004 Centella Ampoule on skin"
            width={1200}
            height={720}
            className="w-full rounded-3xl border-2 border-black object-cover"
          />
          <figcaption className="mt-3 text-sm text-gray-600">
            The ampoule looks watery but leaves a light dew within seconds.
          </figcaption>
        </figure>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Key ingredients
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Centella asiatica extract (100 percent) supplies asiaticoside and madecassoside.</li>
          <li>Natural minerals from Madagascar-grown centella support barrier repair.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Texture and performance
        </h3>
        <p className="text-gray-800 mb-6">
          One drop spreads across the face like essence. It leaves a fresh
          finish with no sticky residue, so it layers under sunscreen and makeup
          without pilling. Pairing it with ceramide creams helps seal in the
          watery hydration.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Any concerning components?
        </h3>
        <p className="text-gray-800 mb-6">
          The formula is fragrance-free and alcohol-free. Sensitive users rarely
          react, but patch test if you are allergic to herbal extracts.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to use
        </h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Apply after cleansing and toner, morning or night.</li>
          <li>Layer two to three drops on damp skin, then seal with moisturizer.</li>
          <li>Mix into lotions when you need extra calming on sensitized spots.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What users highlight
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>“Layering twice after laser helped my cheeks calm down overnight.”</li>
          <li>“Sits under sunscreen without pilling, even when the weather is sticky.”</li>
          <li>“Softens flaky retinoid patches within a week of nightly use.”</li>
          <li>“I decant it into a mist bottle and spritz whenever my skin feels hot.”</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Price range</h3>
        <p className="text-gray-800">
          Expect 750-890 THB for the 100 ml bottle; minis are around 250 THB.
        </p>
      </>
    ),
  },
  "ingu-lotus-cleansing-milk": {
    title: "Review: Ingu Lotus Cleansing Micellar Milk",
    cover: "/img/facts_img/ingu_lotus.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Gentle first cleanse for dry or barrier-compromised skin
        </h2>
        <p className="text-gray-700 mb-8">
          Ingu Lotus cleansing milk combines micellar technology with a
          soothing milk texture. It removes sunscreen and light makeup while
          leaving a cushioned finish. Lotus ferment provides antioxidants and a
          light floral spa scent.
        </p>

        <figure className="mb-8">
          <Image
            src="/img/facts_img/ingu_lotus_2.jpg"
            alt="Ingu Lotus cleansing milk and cotton pads"
            width={1200}
            height={720}
            className="w-full rounded-3xl border-2 border-black object-cover"
          />
          <figcaption className="mt-3 text-sm text-gray-600">
            Use soft cotton or rinse with water depending on how much makeup you wore.
          </figcaption>
        </figure>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Key ingredients
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Nelumbo nucifera (lotus) flower extract for antioxidant support.</li>
          <li>Micellar surfactants (poloxamers) lift grime without heavy rubbing.</li>
          <li>Panthenol and glycerin keep the skin supple post-rinse.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Potential irritants</h3>
        <p className="text-gray-800 mb-6">
          Contains fragrance and essential oil traces. Skip if you are sensitive
          to perfumed cleaners. No drying alcohol is present.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Texture and performance
        </h3>
        <p className="text-gray-800 mb-6">
          The cleanser massages in like a light lotion and emulsifies with a
          splash of water. There is minimal residue, yet skin feels protected
          enough that some users skip a second cleanse on no-makeup days.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Usage tips</h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Massage onto dry skin for sixty seconds.</li>
          <li>Emulsify with water, then rinse or wipe with damp cotton.</li>
          <li>Follow with a water-based cleanser if you wore heavy makeup.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What users highlight
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>“Feels like a facial massage at home—my face never feels tight afterward.”</li>
          <li>“The lotus scent is relaxing and makes me look forward to cleansing.”</li>
          <li>“Melts sunscreen yet leaves enough slip so I can go straight to toner.”</li>
          <li>“Gentle enough for lash extensions and doesn’t sting my eyes.”</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Price range</h3>
        <p className="text-gray-800">
          480-550 THB for 200 ml; travel mini around 220 THB.
        </p>
      </>
    ),
  },
  "laglace-toner-pad": {
    title: "Review: Laglace Toner Pad",
    cover: "/img/facts_img/laglace_toner.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Spa-like toning pads for glow and hydration
        </h2>
        <p className="text-gray-700 mb-8">
          Laglace toner pads are soaked in a watery essence with niacinamide and
          tranexamic acid. The dual-texture pads offer a light exfoliating side
          and a plush side for hydration, perfect for morning prep or masking.
        </p>

        <figure className="mb-8">
          <Image
            src="/img/facts_img/laglace_toner_2.jpg"
            alt="Laglace toner pads in a jar"
            width={1200}
            height={720}
            className="w-full rounded-3xl border-2 border-black object-cover"
          />
          <figcaption className="mt-3 text-sm text-gray-600">
            Tweezers keep the pads hygienic for daily use.
          </figcaption>
        </figure>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Key ingredients</h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Niacinamide for brightening and oil control.</li>
          <li>Tranexamic acid to target post-acne marks.</li>
          <li>Betaine and sodium hyaluronate enhance moisture retention.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Two formulas to choose from
        </h3>
        <dl className="mb-6 space-y-4 text-gray-800">
          <div>
            <dt className="font-semibold">Daily Moisturizing Pads (blue container)</dt>
            <dd>
              Built around the AquaLock12 hyaluronic complex to drench skin in
              multi-weight hydration. Suits dry-to-normal skin or anyone looking
              for supple makeup prep. Delivers bounce, refines surface texture,
              and calms mild irritation before treatments.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Acne Care Daily Calming Pads (green container)</dt>
            <dd>
              Uses the AcneSphere balancing complex to control oil, soothe
              active breakouts, and keep pores clearer. Designed for
              combination-to-oily complexions that experience frequent
              congestion while still needing hydration.
            </dd>
          </div>
        </dl>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Potential concerns</h3>
        <p className="text-gray-800 mb-6">
          Includes a mild citrus fragrance. Sensitive skin may prefer short
          contact rather than leaving pads on for extended masking sessions.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Texture and performance
        </h3>
        <p className="text-gray-800 mb-6">
          The embossed side gives a gentle sweep that loosens flakes without
          sting, while the smooth side drenches skin in essence. Makeup applies
          evenly afterward thanks to the balanced hydration.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to use</h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Sweep the textured side over clean skin to remove residual debris.</li>
          <li>Flip to the soft side and press over cheeks for two to three minutes.</li>
          <li>Pat remaining essence in and continue with serum.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What users highlight
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>“Brightened my T-zone in two weeks without irritation.”</li>
          <li>“Perfect mid-day pick-me-up before meetings; skin looks glassy.”</li>
          <li>“Makeup applies smoother around my nose and chin now.”</li>
          <li>“Love the tweezers—they keep everything clean.”</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Price range</h3>
        <p className="text-gray-800">
          590-690 THB for a tub of 80 pads; sheet refills average 450 THB.
        </p>
      </>
    ),
  },
  "curecode-double-barrier-cream": {
    title: "Review: Curecode Double Barrier Cream",
    cover: "/img/facts_img/curecode_barrier.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Ceramide-rich rescue cream for compromised skin
        </h2>
        <p className="text-gray-700 mb-8">
          Curecode signature cream combines patented Neurolipid 3 technology
          with ceramides, cholesterol, and fatty acids. The cushiony texture
          leaves a protective film without heavy greasiness, ideal after
          retinoids or chemical peels.
        </p>

        <figure className="mb-8">
          <Image
            src="/img/facts_img/curecode_barrier_2.jpg"
            alt="Curecode Double Barrier Cream swatched on hand"
            width={1200}
            height={720}
            className="w-full rounded-3xl border-2 border-black object-cover"
          />
          <figcaption className="mt-3 text-sm text-gray-600">
            The cream has a soft balm feel that sinks in after a short massage.
          </figcaption>
        </figure>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Key ingredients</h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Ceramide NP, cholesterol, and free fatty acids replenish the lipid matrix.</li>
          <li>Allantoin and panthenol soothe irritation and support healing.</li>
          <li>Centella asiatica extract adds antioxidant and calming benefits.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Potential irritants</h3>
        <p className="text-gray-800 mb-6">
          Formula is fragrance-free and essential-oil-free. Contains silicones
          for slip; avoid only if you prefer silicone-free routines.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Texture and performance
        </h3>
        <p className="text-gray-800 mb-6">
          Feels balmy on application yet sets to a satin finish. Ideal as a
          night cream or daytime rescue on peeling areas. Works well mixed with
          hydrating serums to create a thicker sleeping mask.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to use</h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Apply as the final step at night or as a daytime barrier layer.</li>
          <li>Mix with a drop of facial oil for extra occlusion on dry zones.</li>
          <li>Use post-treatment to reduce stinging and accelerate recovery.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What users highlight
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>“Red patches around my nose calmed within two nights.”</li>
          <li>“Layers under SPF without any rolling or greasiness.”</li>
          <li>“Helped my teen’s maskne stay under control during exam season.”</li>
          <li>“A dab on knuckles saves them from sanitizer dryness.”</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Price range</h3>
        <p className="text-gray-800">
          890-980 THB for 50 ml; bundle packs may include minis for around 1200 THB.
        </p>
      </>
    ),
  },
  "beauty-of-joseon-relief-sun": {
    title: "Review: Beauty of Joseon Relief Sun SPF50+",
    cover: "/img/facts_img/boj_relief_sun.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Viral sunscreen that feels like moisturizer
        </h2>
        <p className="text-gray-700 mb-8">
          Combining modern chemical filters with a creamy base, Relief Sun is a
          Korean SPF loved for zero white cast and dewy finish. Rice ferment and
          probiotics add antioxidant care, while niacinamide brightens with
          daily use.
        </p>

        <figure className="mb-8">
          <Image
            src="/img/facts_img/boj_relief_sun_2.jpg"
            alt="Texture of Beauty of Joseon Relief Sun"
            width={1200}
            height={720}
            className="w-full rounded-3xl border-2 border-black object-cover"
          />
          <figcaption className="mt-3 text-sm text-gray-600">
            The formula spreads like light lotion and leaves a soft glow.
          </figcaption>
        </figure>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Key filters and actives</h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Uvinul A Plus, Uvinul T 150, and Tinosorb M provide broad-spectrum protection.</li>
          <li>Rice bran water and fermented grain complex nourish and soothe.</li>
          <li>Niacinamide and adenosine support radiance and elasticity.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Potential irritants</h3>
        <p className="text-gray-800 mb-6">
          Contains fragrance-free formula. However, chemical filters may tingle
          on very reactive skin. Patch test if you have a history of sunscreen
          sensitivity.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Application tips</h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Use two finger lengths for face and neck each morning.</li>
          <li>Reapply every two to three hours when outdoors.</li>
          <li>Pairs well with makeup due to the moisturizing finish.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What users highlight
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>“Gives a glowy base so I skip foundation most mornings.”</li>
          <li>“No stinging around the eyes, even on sensitive days.”</li>
          <li>“Doesn’t clog pores—fewer whiteheads compared with heavier SPFs.”</li>
          <li>“Spreads like moisturizer; reapplication is easy during commutes.”</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Price range</h3>
        <p className="text-gray-800">
          480-520 THB for the standard 50 ml tube; duo bundles often run 900 THB.
        </p>
      </>
    ),
  },
  "ingu-purple-rice-lip-mask": {
    title: "Review: Ingu Purple Rice Lip Mask",
    cover: "/img/facts_img/ingu_lip_mask.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Sleeping lip mask with rice-derived antioxidants
        </h2>
        <p className="text-gray-700 mb-8">
          This glossy lip treatment combines purple rice ferment with shea
          butter for overnight moisture. The cushiony texture seals in hydration
          and leaves a subtle berry sheen that works during the day too.
        </p>

        <figure className="mb-8">
          <Image
            src="/img/facts_img/ingu_lip_mask_2.jpg"
            alt="Ingu Purple Rice lip mask texture"
            width={1200}
            height={720}
            className="w-full rounded-3xl border-2 border-black object-cover"
          />
          <figcaption className="mt-3 text-sm text-gray-600">
            Apply a thicker layer at night for spa-level lip recovery.
          </figcaption>
        </figure>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Key ingredients</h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>Oryza sativa (purple rice) ferment delivers antioxidants and amino acids.</li>
          <li>Squalane and shea butter provide lasting occlusion.</li>
          <li>Vitamin E helps defend against free radical damage.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Potential irritants</h3>
        <p className="text-gray-800 mb-6">
          Contains subtle berry fragrance. No menthol or camphor, which makes it
          safer for compromised lips.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Texture and performance
        </h3>
        <p className="text-gray-800 mb-6">
          The balm melts into a syrupy layer that cushions flaky lips. It stays
          put overnight and gives a mirror finish when worn thinly during the
          day.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to use</h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Apply a thin layer during the day as a protective gloss.</li>
          <li>At night, add a thicker coat after exfoliating lips.</li>
          <li>Blot lightly in the morning before lipstick.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What users highlight
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>“My lips feel softer after just two nights of a thick layer.”</li>
          <li>“Leaves a glossy finish that works as a topper over matte lipstick.”</li>
          <li>“Comfortable in air-con rooms—no tight feeling at all.”</li>
          <li>“A tiny amount keeps my lips protected during long flights.”</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Price range</h3>
        <p className="text-gray-800">
          350-420 THB for 15 g; mini pots appear in holiday sets around 180 THB.
        </p>
      </>
    ),
  },
  "laroche-posay-cicaplast-baume-b5-plus": {
    title: "Review: La Roche-Posay Cicaplast Baume B5+",
    cover: "/img/facts_img/cicaplast_baume.jpg",
    body: (
      <>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          Pharmacy staple for irritated, dry patches</h2>
        <p className="text-gray-700 mb-8">
          The upgraded Baume B5+ adds tribioma prebiotic complex to the classic
          panthenol-rich formula. It creates a semi-occlusive layer that shields
          skin from pollution and accelerates recovery after dermatological
          treatments.
        </p>

        <figure className="mb-8">
          <Image
            src="/img/facts_img/cicaplast_baume_2.jpg"
            alt="La Roche-Posay Cicaplast Baume texture"
            width={1200}
            height={720}
            className="w-full rounded-3xl border-2 border-black object-cover"
          />
          <figcaption className="mt-3 text-sm text-gray-600">
            The balm looks thick but blends into a protective satin veil.
          </figcaption>
        </figure>

        <hr className="border-black/10 mb-8" />

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Key ingredients</h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>5 percent panthenol to hydrate and support barrier repair.</li>
          <li>Madecassoside and tribioma complex calm inflammation.</li>
          <li>Shea butter and glycerin provide emollient comfort.</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Potential irritants</h3>
        <p className="text-gray-800 mb-6">
          Fragrance-free and suitable for adults and children. Contains mineral
          oil derivatives; avoid only if you dislike occlusive textures.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Texture and performance
        </h3>
        <p className="text-gray-800 mb-6">
          The balm spreads like a rich cream but dries down without a greasy
          film. Works as a spot treatment on chapped elbows, shaving irritation,
          or post-procedure areas.
        </p>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          How to use</h3>
        <ol className="list-decimal pl-5 text-gray-800 mb-6">
          <li>Apply as a spot treatment on dry patches or as a full-face sleeping mask.</li>
          <li>Use after procedures like laser or microneedling (with dermatologist approval).</li>
          <li>Great hand cream for frequent hand washers.</li>
        </ol>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          What users highlight
        </h3>
        <ul className="list-disc pl-5 text-gray-800 mb-6">
          <li>“Eczema-prone knuckles feel soothed within a day.”</li>
          <li>“Great as a barrier cream for kids when drool rash flares up.”</li>
          <li>“One layer after retinoids keeps irritation away.”</li>
          <li>“Hand-washing all day no longer cracks my skin because of this balm.”</li>
        </ul>

        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">
          Price range</h3>
        <p className="text-gray-800">
          750-820 THB for 40 ml; jumbo 100 ml tube lands around 1150 THB.
        </p>
      </>
    ),
  },
};

export default function FactArticlePage({ params }: Params) {
  const { slug } = params;
  const article = ARTICLES[slug];

  if (!article) return notFound();

  return (
    <PastelLayout cover={article.cover}>
      <PastelHero cover={article.cover} title={article.title} />

      <PastelArticle cover={article.cover}>
        <div className="prose prose-lg max-w-none prose-headings:font-extrabold prose-p:text-gray-800">
          {article.body}
        </div>

        <div className="mt-12">
          <Link
            href="/facts"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 font-semibold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.25)] hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)]"
          >
            ← Back to Skin Facts
          </Link>
        </div>
      </PastelArticle>
    </PastelLayout>
  );
}
