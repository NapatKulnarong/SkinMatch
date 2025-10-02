// src/app/quiz/_config.ts
export const TOTAL_STEPS = 7;

export const RESULT_LOADING_HREF = "/quiz/result/loading";

export const stepHref = (n: number) => (n === 1 ? "/quiz" : `/quiz/step/${n}`);
