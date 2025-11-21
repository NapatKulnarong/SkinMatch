"use client";

import { FormEvent, useState } from "react";

import { subscribeToNewsletter } from "@/lib/api.newsletter";

type Variant = "full" | "compact";

type NewsletterSignupProps = {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  source?: string;
  variant?: Variant;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

export default function NewsletterSignup({
  title = "Get Weekly Skincare Tips",
  subtitle = "Join 1,000+ skincare enthusiasts receiving expert ingredient insights and routine advice",
  buttonLabel = "Subscribe",
  source = "homepage",
  variant = "full",
  inputProps,
}: NewsletterSignupProps) {
  const { className: inputClassName, ...restInputProps } = inputProps ?? {};
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const response = await subscribeToNewsletter(trimmed, source);
      setStatus("success");
      setMessage(response.message);
      if (!response.alreadySubscribed) {
        setEmail("");
      }
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "We couldn't subscribe you just now. Please try again.";
      setStatus("error");
      setMessage(fallback);
    }
  };

  const sharedWrapper =
    variant === "compact"
      ? "w-full space-y-3"
      : "mx-auto max-w-[45rem] lg:max-w-2xl text-center space-y-4 sm:space-y-6 md:px-0";

  const formLayout =
    variant === "compact"
      ? "flex flex-col gap-3"
      : "flex flex-col sm:flex-row gap-3";

  const inputClass = [
    "flex-1 rounded-[5px] lg:rounded-full border-2 border-black",
    "bg-white px-4 py-2.5 sm:py-3 text-sm",
    "text-[#102030] placeholder:text-[#8C9AAE]",
    "shadow-[0_3px_0_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#7c5a8f]",
    inputClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const buttonClass =
    "rounded-[5px] lg:rounded-full border-2 border-black bg-[#7db5d0] lg:bg-[#9ed0da]  px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold text-black/80 shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#7db5d0] hover:shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={sharedWrapper} aria-live="polite" aria-atomic="true">
      <div className="space-y-2 text-left lg:text-center md:pt-3 lg:pt-0">
        {title ? (
          <h2 className={variant === "compact" ? "text-xl font-bold text-[#3C5B6F]" : "text-xl sm:text-2xl font-bold text-[#3C5B6F]"}>
            {title}
          </h2>
        ) : null}
        {subtitle ? (
          <p className={variant === "compact" ? "text-xs text-[#4a3a5a]/70" : "text-xs sm:text-sm text-[#4a3a5a]/70"}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <form className={formLayout} onSubmit={handleSubmit} noValidate>
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage(null);
            }
          }}
          placeholder="your.email@example.com"
          aria-invalid={status === "error"}
          className={inputClass}
          {...restInputProps}
        />
        <button type="submit" disabled={status === "loading"} className={buttonClass}>
          {status === "loading" ? "Subscribing…" : buttonLabel}
        </button>
      </form>

      <div className="space-y-1 text-[10px] sm:text-xs text-[#4a3a5a]/60">
        {message && (
          <p className={`font-semibold ${status === "error" ? "text-[#B9375D]" : "text-[#4a3a5a]"}`}>
            {message}
          </p>
        )}
        <p>No spam, unsubscribe anytime. We respect your privacy.</p>
      </div>
    </div>
  );
}
