"use client";

import { FormEvent, useState } from "react";

import PageContainer from "@/components/PageContainer";
import NewsletterSignup from "@/components/NewsletterSignup";

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
    window.location.href = `mailto:hello@skinmatch.co?subject=Skin%20Myth%20Suggestion&body=${body}`;
  };

  return (
    <PageContainer as="section" id={sectionId} className="pt-14 pb-16">
      <div className="flex w-full flex-col gap-6">
        <div className="rounded-3xl border-2 border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,0.25)] sm:p-10">
          <div className="space-y-5 text-center">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#f3ecff] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#48307b]">
              Skincare Myth
            </p>
            <h2 className="text-3xl font-extrabold text-[#101b27] md:text-[2.1rem]">
              Need a skincare myth debunked?
            </h2>
            <p className="text-sm leading-relaxed text-[#101b27]/70 md:text-base">
              Tell Matchy the rumor, ingredient combo, or claim you keep seeing. We'll route it to our expert panel for a future Fact Check feature.
            </p>
          </div>

          <ul className="mt-6 grid gap-3 text-sm text-[#101b27]/75 sm:grid-cols-3">
            {[
              "Dermatologist-backed answers",
              "Ingredient pairings that work",
              "Myths decoded before they trend",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center justify-center gap-2 rounded-full bg-[#f7f8ff] px-4 py-2 text-center"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#48307b]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

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
                className="mt-2 w-full min-h-[120px] rounded-2xl border-2 border-black bg-white px-4 py-3 text-sm leading-relaxed text-[#101b27] shadow-sm transition focus:border-[#48307b] focus:outline-none focus:ring-2 focus:ring-[#48307b]/20"
                aria-invalid={status === "error"}
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-3 rounded-full bg-[#48307b] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:bg-[#5a3a8f] active:shadow-sm"
            >
              Suggest a myth
              <span aria-hidden className="text-base">✶</span>
            </button>
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

          <div className="rounded-3xl border-2 border-black bg-white p-8 text-center shadow-[8px_8px_0_0_rgba(0,0,0,0.25)] sm:p-10">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#e4f3eb] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#1f3a29]">
            Weekly Ritual
          </p>
          <h3 className="mt-4 text-3xl font-extrabold text-[#1f3a29]">
            Get weekly skincare tips
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-[#1f3a29]/70 md:text-base">
            Join 1,000+ readers for ingredient insights, routine blueprints, and myth-busting science.
          </p>

          <div className="mt-6">
            <NewsletterSignup
              title=""
              subtitle=""
              buttonLabel="Subscribe"
              variant="compact"
              source="facts-newsletter"
              inputProps={{ "aria-label": "Email for skincare newsletter updates" }}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}