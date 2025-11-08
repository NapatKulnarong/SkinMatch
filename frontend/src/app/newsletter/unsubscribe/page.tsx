"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      handleUnsubscribe(emailParam);
    }
  }, [searchParams]);

  const handleUnsubscribe = async (emailToUnsubscribe: string) => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailToUnsubscribe }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setStatus("success");
        setMessage(data.message || "You have been successfully unsubscribed.");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Unable to process your request. Please try again later.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      await handleUnsubscribe(email.trim());
    }
  };

  return (
    <PageContainer as="main" className="min-h-screen flex items-center justify-center py-20">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#fff1d6] via-[#ffe9c8] to-[#f4f1df] p-8 shadow-[10px_12px_0_rgba(0,0,0,0.22)]">
          {status === "success" ? (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">✓</div>
              <h1 className="text-3xl font-extrabold text-[#101b27]">
                Unsubscribed Successfully
              </h1>
              <p className="text-[#2d3a2f] text-lg">
                {message || "You have been successfully unsubscribed from SkinMatch weekly skincare tips."}
              </p>
              <p className="text-[#3c4c3f] text-sm">
                You will no longer receive our weekly emails. We're sorry to see you go!
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#fef9ef] px-6 py-2 text-sm font-semibold text-[#2d4a2b] shadow-[0_6px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-[2px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]"
              >
                Return to Home
              </button>
            </div>
          ) : status === "error" ? (
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-extrabold text-[#101b27]">Error</h1>
              <p className="text-[#2d3a2f]">{message}</p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setMessage("");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#E7EFC7] px-6 py-2 text-sm font-semibold text-black"
              >
                Try Again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h1 className="text-3xl font-extrabold text-[#101b27] text-center mb-6">
                Unsubscribe from Newsletter
              </h1>
              <p className="text-[#2d3a2f] text-center mb-6">
                Enter your email address to unsubscribe from SkinMatch weekly skincare tips.
              </p>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#101b27]/80 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border-2 border-black bg-white px-4 py-3 text-sm text-[#101b27] focus:border-[#48307b] focus:outline-none focus:ring-2 focus:ring-[#48307b]/20"
                  placeholder="your.email@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-[#E7EFC7] px-6 py-3 text-sm font-semibold text-black shadow-md transition hover:shadow-lg disabled:opacity-50"
              >
                {status === "loading" ? "Processing..." : "Unsubscribe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

