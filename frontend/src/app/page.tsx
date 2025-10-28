// frontend/src/app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import Navbar from "@/components/Navbar";
import PageContainer from "@/components/PageContainer";
import {
  getAuthToken,
  getStoredProfile,
  PROFILE_EVENT,
  type StoredProfile,
} from "@/lib/auth-storage";
import { fetchQuizHistory } from "@/lib/api.quiz";
import {
  QUIZ_ANSWERS_STORAGE_KEY,
  QUIZ_SESSION_STORAGE_KEY,
} from "./quiz/_QuizContext";

function QuizCtaButton() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [hasQuizHistory, setHasQuizHistory] = useState(false);

  useEffect(() => {
    const updateProfile = (next?: StoredProfile | null) => {
      setProfile(next ?? getStoredProfile());
    };

    updateProfile();

    const profileListener = (event: Event) => {
      if ("detail" in event) {
        const custom = event as CustomEvent<StoredProfile | null>;
        updateProfile(custom.detail ?? null);
        return;
      }
      updateProfile();
    };

    const storageListener = (event: StorageEvent) => {
      if (event.key === "sm_profile" || event.key === "sm_token") {
        updateProfile();
      }
    };

    window.addEventListener(PROFILE_EVENT, profileListener);
    window.addEventListener("storage", storageListener);
    return () => {
      window.removeEventListener(PROFILE_EVENT, profileListener);
      window.removeEventListener("storage", storageListener);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!profile) {
      setHasQuizHistory(false);
      return () => {
        isCancelled = true;
      };
    }

    const token = getAuthToken();
    if (!token) {
      setHasQuizHistory(false);
      return () => {
        isCancelled = true;
      };
    }

    const loadHistory = async () => {
      try {
        const items = await fetchQuizHistory(token);
        if (!isCancelled) {
          setHasQuizHistory(items.length > 0);
        }
      } catch (error) {
        if (!isCancelled) {
          console.warn("Failed to load quiz history", error);
          setHasQuizHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [profile]);

  const showRetake = Boolean(profile && hasQuizHistory);
  const buttonLabel = showRetake ? "Retake the quiz" : "Find your match now";

  const handleClick = useCallback(() => {
    if (!showRetake || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(QUIZ_ANSWERS_STORAGE_KEY);
      window.localStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear stored quiz state before retake", error);
    }
  }, [showRetake]);

  return (
    <Link
      href="/quiz"
      onClick={handleClick}
      className="inline-flex items-center gap-3 rounded-full border-2 border-black bg-white px-8 py-4 font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
    >
      <span>{buttonLabel}</span>
      <ArrowRightIcon className="h-6 w-6" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8cc8c] text-gray-900">
      <Navbar />
      <PageContainer className="relative flex flex-col gap-12 pt-32 pb-16">
        <section className="overflow-hidden rounded-[32px] border-2 border-black bg-[#fff1dd] shadow-[6px_8px_0_rgba(0,0,0,0.35)]">
          <div className="grid items-center gap-8 px-8 py-10 sm:px-10 md:grid-cols-[1.05fr_0.95fr]">
            <div className="order-1 space-y-6 text-center md:order-2 md:text-left">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-600">
                    Personalized skincare insights
                  </p>
                  <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
                    SkinMatch
                  </h1>
                  <p className="text-lg font-semibold text-gray-700 sm:text-xl md:text-2xl">
                    “Your skin, Your match, Your best care!”
                  </p>
                </div>

                <p className="text-base text-gray-700 sm:text-lg md:max-w-xl">
                  Build a routine tailored to your skin goals. Explore ingredients,
                  track sensitivities, and discover matches that love your skin back.
                </p>

                <div className="flex justify-center md:justify-start">
                  <QuizCtaButton />
                </div>
              </div>

            <div className="order-2 flex justify-center md:order-1">
              <Image
                src="/img/mascot/matchy_1.png"
                alt="Matchy the SkinMatch mascot giving a friendly wave"
                width={360}
                height={270}
                priority
                className="h-auto w-full max-w-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border-2 border-dashed border-black/40 bg-white/60 px-6 py-10 text-center shadow-[4px_6px_0_rgba(0,0,0,0.15)] backdrop-blur-sm">
          <p className="text-base font-medium text-gray-700 sm:text-lg">
            New interactive sections will live here soon—skin type spotlights, trending ingredients, and personalized tips are on the way.
          </p>
        </section>
      </PageContainer>
    </main>
  );
}
