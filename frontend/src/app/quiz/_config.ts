// src/app/quiz/_config.ts
export const TOTAL_STEPS = 8;

export const stepHref = (n: number) => (n === 1 ? "/quiz" : `/quiz/step/${n}`);