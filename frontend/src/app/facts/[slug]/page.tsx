// src/app/facts/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JSX } from "react";

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
};

export default function FactArticlePage({ params }: Params) {
  const { slug } = params;
  const article = ARTICLES[slug];

  if (!article) return notFound();

  return (
    <main className="min-h-screen bg-[#f2f2f3]">
      {/* navbar spacer */}
      <div className="pt-24" />

      {/* HERO (same width as article, lowered a bit, title overlaid) */}
      <section className="max-w-4xl mx-auto px-6 md:px-8 mt-8">
        <div
          className="
            relative rounded-[28px] border-2 border-black overflow-hidden
            bg-white/70 shadow-[8px_10px_0_rgba(0,0,0,0.35)]
          "
        >
          <div className="relative h-[420px] md:h-[480px] w-full">
            <Image
              src={article.cover}
              alt="Article cover"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
            />

            {/* Gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />

            {/* Overlaid title */}
            <div className="absolute inset-0 flex items-end">
              <h1
                className="
                  p-6 md:p-8 text-white drop-shadow-[0_1.5px_0_rgba(0,0,0,0.5)]
                  text-3xl md:text-5xl font-extrabold leading-tight max-w-[80%]
                "
              >
                {article.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLE */}
      <article className="max-w-4xl mx-auto px-6 md:px-8 py-10 md:py-12">
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
      </article>
    </main>
  );
}
