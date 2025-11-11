"use client";

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchQuizQuestions,
  finalizeQuizSession,
  QuizChoice,
  QuizFinalize,
  QuizQuestion,
  startQuizSession,
  submitQuizAnswer,
} from "@/lib/api.quiz";

const ANSWERS_STORAGE_KEY = "skinmatch.quizAnswers";
const SESSION_STORAGE_KEY = "skinmatch.quizSession";

export const QUIZ_ANSWERS_STORAGE_KEY = ANSWERS_STORAGE_KEY;
export const QUIZ_SESSION_STORAGE_KEY = SESSION_STORAGE_KEY;

type QuizAnswerKey =
  | "primaryConcern"
  | "secondaryConcern"
  | "eyeConcern"
  | "skinType"
  | "sensitivity"
  | "pregnancy"
  | "budget";

type QuizAnswer = {
  choiceId: string | null;
  label: string | null;
  value: string | null;
};

type QuizAnswers = Record<QuizAnswerKey, QuizAnswer | null>;

type QuizContextValue = {
  sessionId: string | null;
  questions: Partial<Record<QuizAnswerKey, QuizQuestion>>;
  answers: QuizAnswers;
  setAnswer: (key: QuizAnswerKey, selection: QuizAnswer | null) => Promise<void>;
  resetQuiz: () => Promise<void>;
  isComplete: boolean;
  result: QuizFinalize | null;
  finalize: () => Promise<QuizFinalize | null>;
  loadingQuestions: boolean;
  error: string | null;
};

const FRONT_TO_BACKEND_KEY: Record<QuizAnswerKey, string> = {
  primaryConcern: "main_concern",
  secondaryConcern: "secondary_concern",
  eyeConcern: "eye_concern",
  skinType: "skin_type",
  sensitivity: "sensitivity",
  pregnancy: "pregnant_or_breastfeeding",
  budget: "budget_preference",
};

const BACKEND_TO_FRONT_KEY = Object.entries(FRONT_TO_BACKEND_KEY).reduce(
  (acc, [frontKey, backendKey]) => {
    acc[backendKey] = frontKey as QuizAnswerKey;
    return acc;
  },
  {} as Record<string, QuizAnswerKey>
);

const createEmptyAnswers = (): QuizAnswers => ({
  primaryConcern: null,
  secondaryConcern: null,
  eyeConcern: null,
  skinType: null,
  sensitivity: null,
  pregnancy: null,
  budget: null,
});

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

export function QuizProvider({ children }: PropsWithChildren) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] =
    useState<Partial<Record<QuizAnswerKey, QuizQuestion>>>({});
  const [answers, setAnswers] = useState<QuizAnswers>(() => createEmptyAnswers());
  const [result, setResult] = useState<QuizFinalize | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const finalizePromiseRef = useRef<Promise<QuizFinalize | null> | null>(null);
  const finalizedSessionRef = useRef<string | null>(null);
  const previousSessionRef = useRef<string | null>(null);
  const isStartingFreshRef = useRef<boolean>(false);

  const ensureActiveSession = useCallback(async (): Promise<string> => {
    if (sessionId) {
      return sessionId;
    }
    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }
    // Mark that we're starting fresh to prevent loading old answers from localStorage
    isStartingFreshRef.current = true;
    // Clear localStorage and answers when starting a fresh session to prevent loading old answers
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(ANSWERS_STORAGE_KEY);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to clear stored quiz data before new session", err);
      }
    }
    // Clear answers state when starting a new session
    setAnswers(createEmptyAnswers());
    const promise = startQuizSession()
      .then((fresh) => {
        setSessionId(fresh.id);
        setError(null);
        return fresh.id;
      })
      .catch((err) => {
        console.error("Failed to start quiz session", err);
        setError("We couldn't start a new quiz session. Please try again.");
        throw err;
      })
      .finally(() => {
        sessionPromiseRef.current = null;
      });
    sessionPromiseRef.current = promise;
    return promise;
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't restore from localStorage if we're intentionally starting fresh
    if (isStartingFreshRef.current) {
      return;
    }
    try {
      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        // Only restore session if we don't already have one
        if (!sessionId) {
          setSessionId(storedSession);
          // Load answers only if we have a matching session
          const raw = window.localStorage.getItem(ANSWERS_STORAGE_KEY);
          if (raw) {
            const parsed = parseStoredAnswers(JSON.parse(raw));
            setAnswers(parsed);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to read stored quiz session", err);
    }
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answers));
    } catch (err) {
      console.warn("Failed to persist quiz answers", err);
    }
  }, [answers]);

  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } catch (err) {
      console.warn("Failed to persist quiz session", err);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuestions(true);
    fetchQuizQuestions()
      .then((items) => {
        if (cancelled) return;
        const mapped = mapQuestionsByKey(items);
        setQuestions(mapped);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch quiz questions", err);
        setError("We couldn't load the quiz questions. Please refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingQuestions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setAnswers((prev) => {
      let changed = false;
      const next: QuizAnswers = { ...prev };
      (Object.entries(prev) as [QuizAnswerKey, QuizAnswer | null][]).forEach(([key, answer]) => {
        if (!answer || answer.choiceId) return;
        const question = questions[key];
        if (!question) return;
        const match =
          question.choices.find(
            (choice) =>
              (answer.value && choice.value === answer.value) ||
              (answer.label && choice.label === answer.label)
          ) ?? null;
        if (match) {
          next[key] = {
            choiceId: match.id,
            label: match.label,
            value: match.value,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [questions]);

  useEffect(() => {
    if (previousSessionRef.current && previousSessionRef.current !== sessionId) {
      setResult(null);
      finalizedSessionRef.current = null;
    }
    previousSessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      ensureActiveSession().catch(() => {
        /* handled elsewhere */
      });
    }
  }, [ensureActiveSession, sessionId]);

  const setAnswer = useCallback(
    async (key: QuizAnswerKey, selection: QuizAnswer | null) => {
      setAnswers((prev) => ({ ...prev, [key]: selection }));

      if (!selection?.choiceId) {
        return;
      }

      const question = questions[key];
      if (!question) {
        return;
      }

      try {
        const activeSession = await ensureActiveSession();
        await submitQuizAnswer(activeSession, question.id, [selection.choiceId]);
      } catch (err) {
        console.error("Failed to persist quiz answer", err);
        setError("We couldn't save one of your answers. Please try selecting it again.");
      }
    },
    [ensureActiveSession, questions]
  );

  const resetQuiz = useCallback(async () => {
    // Mark that we're starting fresh
    isStartingFreshRef.current = true;
    setAnswers(createEmptyAnswers());
    setResult(null);
    finalizedSessionRef.current = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(ANSWERS_STORAGE_KEY);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to clear stored quiz data", err);
      }
    }
    setSessionId(null);
    sessionPromiseRef.current = null;
    try {
      const fresh = await startQuizSession();
      setSessionId(fresh.id);
      setError(null);
    } catch (err) {
      console.error("Failed to reset quiz session", err);
      setError("We couldn't start a new session. Please refresh and try again.");
    }
  }, []);

  const isComplete = useMemo(() => {
    return (Object.values(answers) as (QuizAnswer | null)[]).every(
      (answer) => Boolean(answer && answer.choiceId)
    );
  }, [answers]);

  const finalize = useCallback(async () => {
    if (!isComplete) {
      return null;
    }

    const activeSession = await ensureActiveSession();
    if (finalizedSessionRef.current === activeSession && result) {
      return result;
    }
    if (finalizePromiseRef.current) {
      return finalizePromiseRef.current;
    }

    const promise = finalizeQuizSession(activeSession)
      .then((payload) => {
        finalizedSessionRef.current = payload.sessionId;
        setResult(payload);
        setError(null);
        return payload;
      })
      .catch((err) => {
        console.error("Failed to finalize quiz session", err);
        setError("We couldn't finish your quiz. Please try again.");
        throw err;
      })
      .finally(() => {
        finalizePromiseRef.current = null;
      });

    finalizePromiseRef.current = promise;
    return promise;
  }, [ensureActiveSession, isComplete, result]);

  const contextValue = useMemo<QuizContextValue>(
    () => ({
      sessionId,
      questions,
      answers,
      setAnswer,
      resetQuiz,
      isComplete,
      result,
      finalize,
      loadingQuestions,
      error,
    }),
    [
      sessionId,
      questions,
      answers,
      setAnswer,
      resetQuiz,
      isComplete,
      result,
      finalize,
      loadingQuestions,
      error,
    ]
  );

  return <QuizContext.Provider value={contextValue}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within a QuizProvider");
  return ctx;
}

export function useQuizAnswer(key: QuizAnswerKey) {
  const { answers, questions, setAnswer } = useQuiz();
  const current = answers[key];
  const question = questions[key];
  const choices = useMemo(() => (question ? question.choices : []), [question]);

  const setValue = useCallback(
    (value: string | null) => {
      if (value === null) {
        return setAnswer(key, null);
      }
      if (!choices.length) {
        return setAnswer(key, {
          choiceId: null,
          label: value,
          value,
        });
      }
      const match =
        choices.find((choice) => choice.label === value) ??
        choices.find((choice) => choice.value === value);
      if (!match) {
        return setAnswer(key, {
          choiceId: null,
          label: value,
          value,
        });
      }
      return setAnswer(key, {
        choiceId: match.id,
        label: match.label,
        value: match.value,
      });
    },
    [choices, key, setAnswer]
  );

  return {
    value: current?.label ?? null,
    choiceId: current?.choiceId ?? null,
    choices,
    setValue,
  };
}

function parseStoredAnswers(value: unknown): QuizAnswers {
  const defaults = createEmptyAnswers();
  if (!value || typeof value !== "object") {
    return defaults;
  }
  const entries = value as Record<string, unknown>;
  (Object.keys(defaults) as QuizAnswerKey[]).forEach((key) => {
    const entry = entries[key];
    if (entry === null || entry === undefined) {
      defaults[key] = null;
      return;
    }
    if (typeof entry === "string") {
      defaults[key] = {
        choiceId: null,
        label: entry,
        value: entry,
      };
      return;
    }
    if (typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const choiceId =
        typeof record.choiceId === "string" ? (record.choiceId as string) : null;
      const label = typeof record.label === "string" ? (record.label as string) : null;
      const valueText =
        typeof record.value === "string"
          ? (record.value as string)
          : label ?? (choiceId ?? null);
      defaults[key] =
        choiceId || label || valueText
          ? {
              choiceId,
              label: label ?? valueText,
              value: valueText,
            }
          : null;
    }
  });
  return defaults;
}

function mapQuestionsByKey(
  items: QuizQuestion[]
): Partial<Record<QuizAnswerKey, QuizQuestion>> {
  return items.reduce((acc, item) => {
    const key = BACKEND_TO_FRONT_KEY[item.key];
    if (key) {
      acc[key] = item;
    }
    return acc;
  }, {} as Partial<Record<QuizAnswerKey, QuizQuestion>>);
}

export type { QuizAnswers, QuizAnswerKey, QuizAnswer, QuizChoice };
