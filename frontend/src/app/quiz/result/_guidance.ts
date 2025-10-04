import type { QuizAnswers } from "../_QuizContext"; 


type IngredientRecommendation = {
  ingredient: string;
  reason: string;
};

type PartialGuidance = {
  lookFor?: IngredientRecommendation[];
  avoid?: IngredientRecommendation[];
  insights?: string[];
};

export type QuizGuidance = {
  lookFor: IngredientRecommendation[];
  avoid: IngredientRecommendation[];
  insights: string[];
};

const CONCERN_GUIDANCE: Record<string, PartialGuidance> = {
  "Acne & breakouts": {
    lookFor: [
      { ingredient: "Salicylic acid", reason: "Unclogs pores and reduces breakout-causing buildup." },
      { ingredient: "Niacinamide", reason: "Calms inflammation while balancing oil." },
      { ingredient: "Azelaic acid", reason: "Targets acne bacteria and post-inflammatory spots gently." },
    ],
    avoid: [
      { ingredient: "Heavy mineral oils", reason: "Can trap heat and worsen congestion." },
      { ingredient: "Thick silicones", reason: "May feel suffocating when breakouts are active." },
    ],
    insights: ["Focus on oil control without stripping to keep your barrier resilient."],
  },
  "Fine lines & wrinkles": {
    lookFor: [
      { ingredient: "Retinoids", reason: "Speed up cell turnover to soften fine lines." },
      { ingredient: "Peptides", reason: "Support collagen for firmer-looking skin." },
      { ingredient: "Vitamin C", reason: "Shields from oxidative stress and boosts radiance." },
    ],
    avoid: [
      { ingredient: "Drying alcohols", reason: "Can dehydrate skin and accentuate lines." },
    ],
    insights: ["Pair resurfacing actives with barrier support to maintain comfort."],
  },
  "Uneven skin texture": {
    lookFor: [
      { ingredient: "Glycolic acid", reason: "Buffs away rough patches for a smoother surface." },
      { ingredient: "PHA", reason: "Offers gentle exfoliation with added hydration." },
      { ingredient: "Niacinamide", reason: "Refines pore appearance over time." },
    ],
    avoid: [
      { ingredient: "Harsh physical scrubs", reason: "Can cause micro-tears and redness." },
    ],
    insights: ["Rotate chemical exfoliants with soothing hydrators to avoid over-polishing."],
  },
  Blackheads: {
    lookFor: [
      { ingredient: "Salicylic acid", reason: "Dissolves sebum plugs inside the pore." },
      { ingredient: "Clay", reason: "Absorbs excess oil and impurities from the surface." },
      { ingredient: "Niacinamide", reason: "Helps regulate oil while calming redness." },
    ],
    avoid: [
      { ingredient: "Heavy occlusives", reason: "May trap debris and keep pores congested." },
    ],
    insights: ["Consistency with gentle exfoliants keeps pores clear without shocking skin."],
  },
  Hyperpigmentation: {
    lookFor: [
      { ingredient: "Vitamin C", reason: "Interrupts pigment production for brighter tone." },
      { ingredient: "Tranexamic acid", reason: "Targets stubborn spots and melasma patches." },
      { ingredient: "Azelaic acid", reason: "Brightens while calming inflammation." },
    ],
    avoid: [
      { ingredient: "Strong fragrance", reason: "Can irritate skin and trigger more pigmentation." },
    ],
    insights: ["Daily SPF and antioxidants are your best defence against new spots."],
  },
  "Acne scars": {
    lookFor: [
      { ingredient: "Retinoids", reason: "Encourage regeneration to soften textural scars." },
      { ingredient: "Vitamin C", reason: "Supports collagen rebuilding and fades discoloration." },
      { ingredient: "Chemical exfoliants", reason: "Gently resurface for a more even look." },
    ],
    avoid: [
      { ingredient: "Aggressive scrubs", reason: "Create more inflammation and delay healing." },
    ],
    insights: ["Combine resurfacing actives with SPF to maintain gains and protect new skin."],
  },
  "Dull skin": {
    lookFor: [
      { ingredient: "Vitamin C", reason: "Instantly energises tone and boosts glow." },
      { ingredient: "Lactic acid", reason: "Offers mild exfoliation plus hydration." },
      { ingredient: "Niacinamide", reason: "Improves brightness without irritation." },
    ],
    avoid: [
      { ingredient: "Heavy silicones", reason: "Can make skin look flat instead of luminous." },
    ],
    insights: ["Layer lightweight hydration to help light bounce off a smooth surface."],
  },
  "Damaged skin barrier": {
    lookFor: [
      { ingredient: "Ceramides", reason: "Rebuild the barrier’s natural lipids." },
      { ingredient: "Centella asiatica", reason: "Calms inflammation and aids recovery." },
      { ingredient: "Panthenol", reason: "Improves moisture retention and soothes irritation." },
    ],
    avoid: [
      { ingredient: "High-strength acids", reason: "Can worsen barrier impairment while healing." },
      { ingredient: "Retinoids", reason: "Pause until the barrier feels comfortable again." },
    ],
    insights: ["Prioritise replenishing textures and pause strong actives until skin feels calm."],
  },
  Redness: {
    lookFor: [
      { ingredient: "Centella asiatica", reason: "Reduces visible flushing and discomfort." },
      { ingredient: "Allantoin", reason: "Softens and soothes sensitised patches." },
      { ingredient: "Green tea", reason: "Antioxidant with anti-redness benefits." },
    ],
    avoid: [
      { ingredient: "Added fragrance", reason: "A common trigger for diffuse redness." },
      { ingredient: "Menthol", reason: "Cooling agents can sting reactive skin." },
    ],
    insights: ["Keep routines simple and watch out for hidden irritants like fragrance."],
  },
  "Excess oil": {
    lookFor: [
      { ingredient: "Niacinamide", reason: "Helps regulate sebum over time." },
      { ingredient: "Zinc", reason: "Mops up shine without dehydrating." },
      { ingredient: "Lightweight humectants", reason: "Keep hydration balanced so oil stays in check." },
    ],
    avoid: [
      { ingredient: "Harsh sulphates", reason: "Trigger rebound oiliness by stripping too hard." },
    ],
    insights: ["Balance is key—pair mattifying actives with water-based hydration."],
  },
  "Dehydrated skin": {
    lookFor: [
      { ingredient: "Hyaluronic acid", reason: "Pulls water into skin for plumpness." },
      { ingredient: "Glycerin", reason: "Locks in moisture across humidity levels." },
      { ingredient: "Squalane", reason: "Prevents transepidermal water loss without heaviness." },
    ],
    avoid: [
      { ingredient: "High alcohol content", reason: "Quickly evaporates and leaves skin parched." },
    ],
    insights: ["Layer humectants with an emollient topper to seal hydration in."],
  },
};

const SKIN_TYPE_GUIDANCE: Record<string, PartialGuidance> = {
  Normal: {
    lookFor: [
      { ingredient: "Balanced humectants", reason: "Keep hydration steady without feeling greasy." },
      { ingredient: "Ceramides", reason: "Maintain barrier strength for day-to-day resilience." },
    ],
    insights: ["You can rotate actives based on your concerns while keeping a balanced core routine."],
  },
  Oily: {
    lookFor: [
      { ingredient: "Oil-free gel moisturisers", reason: "Hydrate without clogging pores." },
      { ingredient: "Salicylic acid", reason: "Keeps sebum flowing freely." },
    ],
    avoid: [
      { ingredient: "Occlusive balms", reason: "Reserve for targeted slugging rather than full-face use." },
    ],
    insights: ["Stick to lightweight layers and focus on gentle oil regulation."],
  },
  Dry: {
    lookFor: [
      { ingredient: "Ceramides", reason: "Replace depleted barrier lipids." },
      { ingredient: "Oat extract", reason: "Eases tightness and rough texture." },
      { ingredient: "Fatty alcohols", reason: "Support emollience for lasting comfort." },
    ],
    avoid: [
      { ingredient: "Foaming sulphate cleansers", reason: "Strip essential oils and worsen dryness." },
    ],
    insights: ["Build your routine around cushiony textures and rich moisturisers."],
  },
  Combination: {
    lookFor: [
      { ingredient: "Niacinamide", reason: "Balances oil in the T-zone while soothing dry areas." },
      { ingredient: "Lightweight humectants", reason: "Provide water-based hydration across your face." },
    ],
    insights: ["Multi-moisturising (gel for T-zone, cream for cheeks) keeps all zones happy."],
  },
};

const SENSITIVITY_GUIDANCE: Record<string, PartialGuidance> = {
  Yes: {
    lookFor: [
      { ingredient: "Centella asiatica", reason: "Helps reduce flare-ups and calm hot spots." },
      { ingredient: "Beta-glucan", reason: "Delivers deep hydration with anti-inflammatory benefits." },
    ],
    avoid: [
      { ingredient: "Synthetic fragrance", reason: "Common trigger for sensitised skin." },
      { ingredient: "High-dose exfoliants", reason: "Introduce slowly and buffer with moisturiser." },
    ],
    insights: ["Patch test new actives and introduce only one change at a time."],
  },
  Sometimes: {
    lookFor: [
      { ingredient: "Panthenol", reason: "Strengthens the barrier when sensitivity appears." },
      { ingredient: "Aloe vera", reason: "Cools occasional flare-ups." },
    ],
    avoid: [
      { ingredient: "Drying alcohols", reason: "Can tip your skin into a reactive state." },
    ],
    insights: ["Buffer stronger actives with a moisturiser sandwich to minimise irritation."],
  },
};

const PREGNANCY_GUIDANCE: Record<string, PartialGuidance> = {
  Yes: {
    lookFor: [
      { ingredient: "Azelaic acid", reason: "OB-approved multitasker for breakouts and pigmentation." },
      { ingredient: "Niacinamide", reason: "Pregnancy safe brightener that supports the barrier." },
    ],
    avoid: [
      { ingredient: "Retinoids", reason: "Avoid during pregnancy and breastfeeding." },
      { ingredient: "High-dose salicylic acid", reason: "Keep concentrations at or below 2% leave-on." },
    ],
    insights: ["Stick to pregnancy-safe actives and check labels for retinoids or hydroquinone."],
  },
};

const EYE_GUIDANCE: Record<string, PartialGuidance> = {
  "Dark circles": {
    lookFor: [
      { ingredient: "Vitamin C", reason: "Brightens shadowy under-eyes over time." },
      { ingredient: "Niacinamide", reason: "Strengthens the delicate eye-area barrier." },
      { ingredient: "Caffeine", reason: "Helps constrict vessels to reduce the look of darkness." },
    ],
    insights: ["Pair eye brighteners with SPF to prevent further darkening."],
  },
  "Fine lines & wrinkles": {
    lookFor: [
      { ingredient: "Peptides", reason: "Support firmness without irritating the area." },
      { ingredient: "Retinal", reason: "Gentler retinoid option for crow’s feet." },
      { ingredient: "Ceramides", reason: "Keep the area cushioned and plump." },
    ],
    insights: ["Tap products in gently—no pulling or tugging on the eye contour."],
  },
  Puffiness: {
    lookFor: [
      { ingredient: "Caffeine", reason: "Encourages drainage to deflate morning swelling." },
      { ingredient: "Cold gel textures", reason: "Give an instant depuffing sensation." },
    ],
    insights: ["Store eye gels in the fridge to amplify the cooling effect."],
  },
  None: {
    insights: ["Keep the eye area hydrated and protected with SPF to maintain results."],
  },
};

const BUDGET_GUIDANCE: Record<string, PartialGuidance> = {
  Affordable: {
    insights: ["Focus on derm-favourite actives from pharmacy brands—effective doesn’t have to be pricey."],
  },
  "Mid-range": {
    insights: ["Mix clinical formulas with sensorial favourites to stay consistent."],
  },
  "Premium / luxury": {
    insights: ["Invest in hero actives backed by data; complementary textures keep routines enjoyable."],
  },
};

export function buildGuidance(answers: QuizAnswers): QuizGuidance {
  const segments: PartialGuidance[] = [];

  const { primaryConcern, secondaryConcern, eyeConcern, skinType, sensitivity, pregnancy, budget } =
    answers;

  if (primaryConcern) {
    const concernGuide = CONCERN_GUIDANCE[primaryConcern];
    if (concernGuide) segments.push(concernGuide);
  }

  if (secondaryConcern && secondaryConcern !== primaryConcern) {
    const concernGuide = CONCERN_GUIDANCE[secondaryConcern];
    if (concernGuide) segments.push(concernGuide);
  }

  if (skinType) {
    const skinGuide = SKIN_TYPE_GUIDANCE[skinType];
    if (skinGuide) segments.push(skinGuide);
  }

  if (sensitivity) {
    const sensitivityGuide = SENSITIVITY_GUIDANCE[sensitivity];
    if (sensitivityGuide) segments.push(sensitivityGuide);
  }

  if (pregnancy) {
    const pregnancyGuide = PREGNANCY_GUIDANCE[pregnancy];
    if (pregnancyGuide) segments.push(pregnancyGuide);
  }

  if (eyeConcern) {
    const eyeGuide = EYE_GUIDANCE[eyeConcern];
    if (eyeGuide) segments.push(eyeGuide);
  }

  if (budget) {
    const budgetGuide = BUDGET_GUIDANCE[budget];
    if (budgetGuide) segments.push(budgetGuide);
  }

  return combineGuidance(segments);
}

function combineGuidance(segments: PartialGuidance[]): QuizGuidance {
  const lookFor = new Map<string, string>();
  const avoid = new Map<string, string>();
  const insights = new Set<string>();

  segments.forEach((segment) => {
    segment.lookFor?.forEach(({ ingredient, reason }) => {
      if (!lookFor.has(ingredient)) lookFor.set(ingredient, reason);
    });
    segment.avoid?.forEach(({ ingredient, reason }) => {
      if (!avoid.has(ingredient)) avoid.set(ingredient, reason);
    });
    segment.insights?.forEach((insight) => insights.add(insight));
  });

  return {
    lookFor: Array.from(lookFor.entries()).map(([ingredient, reason]) => ({ ingredient, reason })),
    avoid: Array.from(avoid.entries()).map(([ingredient, reason]) => ({ ingredient, reason })),
    insights: Array.from(insights),
  };
}
