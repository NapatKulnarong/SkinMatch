"use client";

import { useState } from "react";
import { sendTermsEmail } from "@/lib/api.legal";

type TermsEmailRequestProps = {
  termsEmailBody: string;
};

type RequestStatus = "idle" | "loading" | "success" | "error";

export default function TermsEmailRequest({
  termsEmailBody,
}: TermsEmailRequestProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      await sendTermsEmail({
        email: email.trim(),
        termsBody: termsEmailBody,
      });
      setStatus("success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We could not send the email right now. Please try again later.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  const disabled = status === "loading" || status === "success";

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={handleSubmit}
      noValidate
      aria-live="polite"
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
          Email Address
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") {
              setStatus("idle");
              setErrorMessage(null);
            }
          }}
          required
          className="mt-2 w-full rounded-[5px] lg:rounded-full border border-black/20 bg-white/15 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-[5px] lg:rounded-full border border-black bg-white px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-[#1f2d26] transition 
                  hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "success" ? "Sent!" : status === "loading" ? "Sending…" : "Email me the terms"}
      </button>

      {status === "success" ? (
        <p className="text-xs text-[#fef3c7]">
          We sent a copy of the Terms of Service to your inbox. Check your spam
          folder if it does not arrive within a few minutes.
        </p>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className="text-xs text-[#fca5a5]">{errorMessage}</p>
      ) : null}
    </form>
  );
}
