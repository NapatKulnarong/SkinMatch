import type {
  FactTopicDetail,
  FactTopicSummary,
  SkinFactSection,
} from "@/lib/types";

const createSummary = (
  id: string,
  slug: string,
  title: string,
  image: string,
  section: SkinFactSection,
  subtitle?: string,
  viewCount = 0
): FactTopicSummary => ({
  id,
  slug,
  title,
  subtitle: subtitle ?? null,
  excerpt: subtitle ?? null,
  section,
  heroImageUrl: image,
  heroImageAlt: title,
  viewCount,
});

// mock "popular topics" carousel / hero card
export const popularTopicsMock: FactTopicSummary[] = [
  createSummary(
    "1",
    "do-sheet-masks-help",
    "Do sheet mask actually help your skin?",
    "/img/facts_img/sheet_mask.jpg",
    "knowledge",
    "Sheet masks can hydrate—but only with the right ingredients.",
    8243
  ),
  createSummary(
    "2",
    "retinol-beginners",
    "Retinol for beginners",
    "/img/facts_img/retinol.jpg",
    "knowledge",
    "How to ease into retinal/retinol without the purge.",
    7712
  ),
  createSummary(
    "3",
    "spf-everyday",
    "Why SPF is a daily essential",
    "/img/facts_img/spf.jpg",
    "fact_check",
    "Daily sunscreen is the #1 anti-ageing step supported by research.",
    6940
  ),
  createSummary(
    "4",
    "vitamin-c-myths",
    "Vitamin C myths (and what really works)",
    "/img/facts_img/vitc.jpg",
    "knowledge",
    "Stability, pairing, and realistic brightening timelines explained.",
    5129
  ),
  createSummary(
    "5",
    "double-cleansing",
    "Double cleansing: who actually needs it?",
    "/img/facts_img/double_cleanse.jpg",
    "knowledge",
    "Oil cleansers dissolve sunscreen best—but it is optional for some skin types.",
    4982
  ),
  createSummary(
    "matchy-feature",
    "hydration-happiness",
    "Matchy’s guide to happy hydrated skin",
    "/img/mascot/matchy_4.png",
    "knowledge",
    "Why keeping your moisture barrier cushioned makes every routine work better.",
    4680
  ),
];

// section cards for home page
export const sectionTopicsMock: Record<
  SkinFactSection,
  FactTopicSummary[]
> = {
  knowledge: [
    createSummary(
      "6",
      "green-tea-calm",
      "Green tea to calm stressed skin",
      "/img/facts_img/green_tea.jpg",
      "knowledge",
      "EGCG-rich leaves dial down redness and protect against pollution.",
      4200
    ),
    createSummary(
      "7",
      "centella-sos",
      "Centella asiatica SOS",
      "/img/facts_img/centella.jpg",
      "knowledge",
      "Tiger grass compounds speed up barrier repair after irritation.",
      3980
    ),
    createSummary(
      "8",
      "aloe-overnight-relief",
      "Aloe vera overnight relief",
      "/img/facts_img/aloe.jpg",
      "knowledge",
      "Cooling polysaccharides drape skin in hydration while you sleep.",
      3525
    ),
    createSummary(
      "9",
      "squalane-skin-shield",
      "Plant squalane skin shield",
      "/img/facts_img/squalane.jpg",
      "knowledge",
      "Featherweight lipids seal moisture without clogging pores.",
      3310
    ),
    createSummary(
      "10",
      "oatmeal-sos",
      "Colloidal oatmeal comfort",
      "/img/facts_img/oatmeal.jpg",
      "knowledge",
      "Beta-glucans soothe itch and hold hydration in fragile skin.",
      2980
    ),
    createSummary(
      "11",
      "manuka-honey-fix",
      "Manuka honey moisture fix",
      "/img/facts_img/manuka.jpg",
      "knowledge",
      "Sweet humectant care keeps blemish-prone skin balanced.",
      2780
    ),
    createSummary(
      "12",
      "turmeric-bright",
      "Turmeric glow guide",
      "/img/facts_img/turmeric.jpg",
      "knowledge",
      "Curcumin-powered serums fade stubborn spots and dullness.",
      2610
    ),
    createSummary(
      "13",
      "jojoba-balance",
      "Jojoba oil balance",
      "/img/facts_img/jojoba.jpg",
      "knowledge",
      "Liquid wax esters soften dry areas while steadying shine.",
      2400
    ),
  ],

  fact_check: [
    createSummary(
      "14",
      "silicone-myth",
      "Silicone-free marketing myths",
      "/img/facts_img/silicone_myth.jpg",
      "fact_check",
      "Dimethicone sits on top of skin and is not the villain marketing claims it is.",
      4100
    ),
    createSummary(
      "15",
      "pores-open-close",
      "Do pores open and close?",
      "/img/facts_img/pores_truth.jpg",
      "fact_check",
      "Temperature changes soften sebum, but pores do not have hinges.",
      3880
    ),
    createSummary(
      "16",
      "detoxifying-sweat",
      "Can sweat detox skin?",
      "/img/facts_img/detox_sweat.jpg",
      "fact_check",
      "Sweat cools you down; your liver and kidneys handle detoxing duties.",
      3520
    ),
    createSummary(
      "17",
      "natural-label-safe",
      "Is natural always safer?",
      "/img/facts_img/natural_label.jpg",
      "fact_check",
      "Plant-based does not guarantee gentle; focus on testing and packaging.",
      3275
    ),
    createSummary(
      "18",
      "purging-vs-breakout",
      "Purging vs breakout confusion",
      "/img/facts_img/purging_breakout.jpg",
      "fact_check",
      "Where pimples show up and how long they last tells you what is happening.",
      3050
    ),
    createSummary(
      "19",
      "drying-alcohols",
      "Are all alcohols bad?",
      "/img/facts_img/drying_alcohol.jpg",
      "fact_check",
      "Fatty alcohols soothe and support the barrier while thin alcohols evaporate fast.",
      2890
    ),
    createSummary(
      "20",
      "overnight-results-myth",
      "Overnight results promises",
      "/img/facts_img/overnight_results.jpg",
      "fact_check",
      "True skin change takes a full cell cycle, not a single night.",
      2710
    ),
  ],

  trending: [
    createSummary(
      "21",
      "1004-centella-ampoule",
      "SKIN1004 Centella Ampoule",
      "/img/facts_img/centella_ampoule.jpg",
      "trending",
      "Single-ingredient centella serum that calms flare-ups fast.",
      4520
    ),
    createSummary(
      "22",
      "ingu-lotus-cleansing-milk",
      "Ingu Lotus Micellar Milk",
      "/img/facts_img/ingu_lotus.jpg",
      "trending",
      "Milky first cleanser that leaves a soft cushiony finish.",
      4310
    ),
    createSummary(
      "23",
      "laglace-toner-pad",
      "Laglace Toner Pad",
      "/img/facts_img/laglace_toner.jpg",
      "trending",
      "Dual-texture pads for brightening and hydrating in one step.",
      3980
    ),
    createSummary(
      "24",
      "curecode-double-barrier-cream",
      "Curecode Double Barrier Cream",
      "/img/facts_img/curecode_barrier.jpg",
      "trending",
      "Ceramide-rich recovery cream ideal after actives.",
      3720
    ),
    createSummary(
      "25",
      "beauty-of-joseon-relief-sun",
      "BOJ Relief Sun SPF50+",
      "/img/facts_img/boj_relief_sun.jpg",
      "trending",
      "Dewy chemical sunscreen with rice ferment and probiotics.",
      3540
    ),
    createSummary(
      "26",
      "ingu-purple-rice-lip-mask",
      "Ingu Purple Rice Lip Mask",
      "/img/facts_img/ingu_lip_mask.jpg",
      "trending",
      "Overnight lip treatment with purple rice antioxidants.",
      3290
    ),
    createSummary(
      "27",
      "laroche-posay-cicaplast-baume-b5-plus",
      "La Roche-Posay Cicaplast Baume B5+",
      "/img/facts_img/cicaplast_baume.jpg",
      "trending",
      "Pharmacy classic soothing balm upgraded with prebiotics.",
      3160
    ),
  ],
};

// mock of the full detail view
export const topicDetailMock: FactTopicDetail = {
  ...popularTopicsMock[0],
  updatedAt: new Date().toISOString(),
  contentBlocks: [
    {
      order: 1,
      blockType: "heading",
      heading: "The Theory Behind Sheet Masks",
      text:
        "Sheet masks create a temporary occlusive seal to help humectants and emollients penetrate.\n\n" +
        "They work best as a hydration boost rather than a full routine replacement.",
      imageUrl: "/img/facts_img/sheet_mask.jpg",
      imageAlt: "Person wearing a sheet mask",
    },
    {
      order: 2,
      blockType: "text",
      heading: "How Dermatologists Use Them",
      text:
        "Dermatologists recommend sheet masks for short-term radiance, calming flare ups, " +
        "or soothing barrier damage after active treatments.",
      imageUrl: null,
      imageAlt: null,
    },
  ],
};
