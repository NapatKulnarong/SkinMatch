"use client";

import { FormEvent, useState } from "react";

import PageContainer from "@/components/PageContainer";
import NewsletterSignup from "@/components/NewsletterSignup";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/solid";


type AskExpertCTAProps = {
  sectionId?: string;
};

export default function AskExpertCTA({ sectionId }: AskExpertCTAProps) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();

    if (!trimmed) {
      setStatus("error");
      setMessage("Share a myth or question so we know what to investigate.");
      return;
    }

    setStatus("success");
    setMessage("Opening your email app so you can send the myth to our team.");

    const body = encodeURIComponent(`Skin myth question:\n\n${trimmed}`);
<<<<<<< HEAD
    window.location.href = `mailto:skinmatch.contact@gmail.com?subject=Skin%20Myth%20Suggestion&body=${body}`;
=======
    const href = `mailto:hello@skinmatch.co?subject=Skin%20Myth%20Suggestion&body=${body}`;
    const opener = typeof window !== "undefined" ? window.open : null;
    if (opener) {
      opener(href, "_self");
    } else if (typeof window !== "undefined") {
      window.location.href = href;
    }
>>>>>>> origin/main
  };

  return (
    <PageContainer as="section" id={sectionId} className="pt-6 pb-12 lg:pt-3 lg:pb-0">
      <div className="flex w-full flex-col gap-6">
        <div className="rounded-3xl border-2 border-black bg-gradient-to-tl from-[#a1c995] to-[#dbedbb] p-4 py-6 lg:p-8 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[8px_8px_0_0_rgba(0,0,0,0.25)] sm:p-10">
          <div className="space-y-3 lg:text-center">
            <span className="inline-flex items-center justify-center text-[#101b27]/95 gap-2">
              <ChatBubbleLeftEllipsisIcon className="h-7 w-7 md:h-9 md:w-9" />
              <h2 className="text-2xl lg:text-3xl font-extrabold md:text-[2.1rem]">
                Debunk a skincare myth
              </h2>
            </span>
            <p className="text-sm font-medium leading-relaxed text-black/70 md:text-lg">
              Heard any skincare claims? Tell Matchy, our experts might fact-check it next!
            </p>
          </div>

          <div className="mt-6 text-sm md:text-xl text-black">
            <div className="rounded-[5px] lg:rounded-[20px] border-2 border-dashed border-gray-600 bg-white/50 px-4 py-3 sm:hidden">
              <ul className="space-y-3">
                {[
                  "Dermatologist-backed answers",
                  "Ingredient pairings that work",
                  "Myths decoded before they trend",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-black" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden text-sm text-black sm:block lg:hidden">
              <div className="rounded-[5px] border-2 border-dashed border-gray-600 bg-white/50 px-4 py-3">
                <ul className="space-y-3">
                  {[
                    "Dermatologist-backed answers",
                    "Ingredient pairings that work",
                    "Myths decoded before they trend",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-black" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ul className="hidden gap-3 text-sm text-black lg:grid lg:grid-cols-3">
              {[
                "Dermatologist-backed answers",
                "Ingredient pairings that work",
                "Myths decoded before they trend",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-gray-500 bg-white/80 px-4 py-2 text-center"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-black" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block text-left text-sm font-semibold text-[#101b27]/80">
              Share your myth or question
              <textarea
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  if (status !== "idle") {
                    setStatus("idle");
                    setMessage(null);
                  }
                }}
                placeholder="e.g. Is slugging safe if I'm already using retinaldehyde?"
                className="mt-2 w-full min-h-[120px] rounded-[5px] lg:rounded-[20px]rounded-2xl border-2 border-black bg-white px-4 py-3 text-sm leading-relaxed text-[#101b27] shadow-sm 
                          transition focus:border-[#48307b] focus:outline-none focus:ring-2 focus:ring-[#48307b]/20"
                aria-invalid={status === "error"}
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-3 rounded-full border-2 border-black bg-[#ede09d] lg:bg-white/50 px-6 py-2.5 text-sm font-semibold text-black 
                          shadow-md transition hover:shadow-lg hover:bg-[#ede09d] active:shadow-sm"
              >
                Suggest a myth
                <span aria-hidden className="text-base">✶</span>
              </button>
            </div>
          </form>

          {message && (
            <p
              className={`mt-2 text-xs font-semibold ${
                status === "error" ? "text-[#b74c66]" : "text-[#2c5a42]"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="lg:mt-3 rounded-[24px] sm:rounded-[28px] border-2 border-black bg-gradient-to-br from-[#F5E6D3] via-[#F0DFC8] to-[#E8D4B8] p-6 sm:p-8 shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <NewsletterSignup
            title="Get Weekly Skincare Tips"
            subtitle="Join 1,000+ readers for ingredient insights, routine blueprints, and myth-busting science."
            buttonLabel="Subscribe"
            variant="full"
            source="facts-newsletter"
            inputProps={{ "aria-label": "Email for skincare newsletter updates" }}
          />
        </div>
      </div>
    </PageContainer>
  );
}
