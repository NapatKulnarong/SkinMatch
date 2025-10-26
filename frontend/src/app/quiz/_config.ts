// src/app/quiz/_config.ts
import type { QuizAnswerKey } from "./_QuizContext";

export const TOTAL_STEPS = 7;

export const RESULT_LOADING_HREF = "/quiz/result/loading";

export const stepHref = (n: number) => (n === 1 ? "/quiz" : `/quiz/step/${n}`);

type ChoiceFallback = {
  label: string;
  value: string;
};

export type StepMeta = {
  key: QuizAnswerKey;
  title: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  gridCols: string;
  fallbackChoices: ChoiceFallback[];
};

const PRIMARY_CONCERN_CHOICES: ChoiceFallback[] = [
  { label: "Acne & breakouts", value: "acne-breakouts" },
  { label: "Fine lines & wrinkles", value: "fine-lines-wrinkles" },
  { label: "Uneven skin texture", value: "uneven-skin-texture" },
  { label: "Blackheads", value: "blackheads" },
  { label: "Hyperpigmentation", value: "hyperpigmentation" },
  { label: "Acne scars", value: "acne-scars" },
  { label: "Dull skin", value: "dull-skin" },
  { label: "Damaged skin barrier", value: "damaged-skin-barrier" },
  { label: "Redness", value: "redness" },
  { label: "Excess oil", value: "excess-oil" },
  { label: "Dehydrated skin", value: "dehydrated-skin" },
];

const EYE_CONCERN_CHOICES: ChoiceFallback[] = [
  { label: "Dark circles", value: "dark-circles" },
  { label: "Fine lines & wrinkles", value: "fine-lines-wrinkles" },
  { label: "Puffiness", value: "puffiness" },
  { label: "None", value: "none" },
];

const SKIN_TYPE_CHOICES: ChoiceFallback[] = [
  { label: "Normal", value: "normal" },
  { label: "Oily", value: "oily" },
  { label: "Dry", value: "dry" },
  { label: "Combination", value: "combination" },
];

const SENSITIVITY_CHOICES: ChoiceFallback[] = [
  { label: "Yes", value: "yes" },
  { label: "Sometimes", value: "sometimes" },
  { label: "No", value: "no" },
];

const PREGNANCY_CHOICES: ChoiceFallback[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const BUDGET_CHOICES: ChoiceFallback[] = [
  { label: "Affordable", value: "affordable" },
  { label: "Mid-range", value: "mid" },
  { label: "Premium / luxury", value: "premium" },
];

export const STEP_META: Record<number, StepMeta> = {
  1: {
    key: "primaryConcern",
    title: "What is your main skincare concern?",
    gradientFrom: "#F7F5FB",
    gradientTo: "#B08BBB",
    accent: "#be9fc7",
    gridCols: "sm:grid-cols-2 lg:grid-cols-3",
    fallbackChoices: PRIMARY_CONCERN_CHOICES,
  },
  2: {
    key: "secondaryConcern",
    title: "Do you have any secondary concerns?",
    gradientFrom: "#F4F6FF",
    gradientTo: "#447D9B",
    accent: "#6391ab",
    gridCols: "sm:grid-cols-2 lg:grid-cols-3",
    fallbackChoices: PRIMARY_CONCERN_CHOICES,
  },
  3: {
    key: "eyeConcern",
    title: "Do you have any eye area concerns?",
    gradientFrom: "#F2F8FF",
    gradientTo: "#568F87",
    accent: "#79a7a2",
    gridCols: "grid-cols-2",
    fallbackChoices: EYE_CONCERN_CHOICES,
  },
  4: {
    key: "skinType",
    title: "Which best describes your skin type?",
    gradientFrom: "#EAFBF6",
    gradientTo: "#73946B",
    accent: "#8caa88",
    gridCols: "grid-cols-2",
    fallbackChoices: SKIN_TYPE_CHOICES,
  },
  5: {
    key: "sensitivity",
    title: "Is your skin sensitive?",
    gradientFrom: "#F3F9EA",
    gradientTo: "#DDA853",
    accent: "#e3bd7b",
    gridCols: "grid-cols-1 sm:grid-cols-3",
    fallbackChoices: SENSITIVITY_CHOICES,
  },
  6: {
    key: "pregnancy",
    title: "Are you pregnant or breastfeeding?",
    gradientFrom: "#FFF6D5",
    gradientTo: "#F08B51",
    accent: "#f5ac79",
    gridCols: "grid-cols-1 sm:grid-cols-2",
    fallbackChoices: PREGNANCY_CHOICES,
  },
  7: {
    key: "budget",
    title: "What’s your budget preference?",
    gradientFrom: "#FFE5E9",
    gradientTo: "#B9375D",
    accent: "#cf708b",
    gridCols: "grid-cols-1 sm:grid-cols-3",
    fallbackChoices: BUDGET_CHOICES,
  },
};

export const getStepMeta = (step: number): StepMeta | null => STEP_META[step] ?? null;
