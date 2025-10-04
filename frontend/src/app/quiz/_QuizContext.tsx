"use client";

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "skinmatch.quizAnswers";

type QuizAnswerKey =
  | "primaryConcern"
  | "secondaryConcern"
  | "eyeConcern"
  | "skinType"
  | "sensitivity"
  | "pregnancy"
  | "budget";

type QuizAnswers = Record<QuizAnswerKey, string | null>;

const DEFAULT_ANSWERS: QuizAnswers = {
  primaryConcern: null,
  secondaryConcern: null,
  eyeConcern: null,
  skinType: null,
  sensitivity: null,
  pregnancy: null,
  budget: null,
};

type QuizContextValue = {
  answers: QuizAnswers;
  setAnswer: (key: QuizAnswerKey, value: string | null) => void;
  resetQuiz: () => void;
  isComplete: boolean;
};

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

export function QuizProvider({ children }: PropsWithChildren) {
  const [answers, setAnswers] = useState<QuizAnswers>(DEFAULT_ANSWERS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<QuizAnswers> | null;
      if (!parsed) return;
      setAnswers((prev) => ({ ...prev, ...parsed }));
    } catch (error) {
      console.warn("Failed to parse stored quiz answers", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const setAnswer = useCallback((key: QuizAnswerKey, value: string | null) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetQuiz = useCallback(() => {
    setAnswers(DEFAULT_ANSWERS);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const isComplete = useMemo(() => {
    return Object.values(answers).every((value) => value !== null && value !== "");
  }, [answers]);

  const value = useMemo<QuizContextValue>(
    () => ({
      answers,
      setAnswer,
      resetQuiz,
      isComplete,
    }),
    [answers, setAnswer, resetQuiz, isComplete]
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within a QuizProvider");
  return ctx;
}

export function useQuizAnswer(key: QuizAnswerKey) {
  const { answers, setAnswer } = useQuiz();
  return {
    value: answers[key],
    setValue: (value: string | null) => setAnswer(key, value),
  };
}

export type { QuizAnswers, QuizAnswerKey };
