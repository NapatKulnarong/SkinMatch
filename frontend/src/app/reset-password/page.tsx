"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import { resetPassword } from "@/lib/api.auth";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { PasswordInput } from "@/components/PasswordInput";

type ResetStatus = "idle" | "submitting" | "success" | "error";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#d7cfe6] flex items-center justify-center px-4 py-24">
          <PageContainer className="max-w-xl">
            <div className="rounded-3xl border-2 border-black bg-white p-8 text-center shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
              <p className="text-lg font-semibold text-[#2C2533]">
                Loading reset form…
              </p>
            </div>
          </PageContainer>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<ResetStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const hasRequiredParams = useMemo(() => Boolean(uid && token), [uid, token]);

  useEffect(() => {
    if (status === "success") {
      const timeout = setTimeout(() => {
        router.replace("/login");
      }, 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [status, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasRequiredParams) {
      setStatus("error");
      setError("Your reset link is missing required information.");
      return;
    }

    if (password !== confirm) {
      setStatus("error");
      setError("Passwords do not match.");
      return;
    }
    
    // Backend will validate password policy
    if (!password) {
      setStatus("error");
      setError("Please enter a password.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await resetPassword({ uid, token, new_password: password });
      if (!response.ok) {
        throw new Error("We could not reset your password. Please request a new link.");
      }
      setStatus("success");
    } catch (resetErr) {
      setStatus("error");
      const message =
        resetErr instanceof Error
          ? resetErr.message
          : "We could not reset your password. Please request a new link.";
      setError(message);
    }
  };

  const disabled = status === "submitting" || status === "success";

  return (
    <main className="min-h-screen bg-[#d7cfe6] flex items-center justify-center px-4 py-24">
      <PageContainer className="max-w-xl">
        <div className="rounded-3xl border-2 border-black bg-white p-8 shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
          <h1 className="text-3xl font-extrabold text-[#2C2533]">Choose a new password</h1>
          <p className="mt-3 text-sm text-[#2C2533]/70">
            Set a new password for your SkinMatch account. Once updated you&apos;ll be
            redirected to sign in again.
          </p>

          {!hasRequiredParams ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              This reset link is invalid or incomplete. Request a new one from{" "}
              <Link href="/login" className="font-semibold underline">
                the login page
              </Link>
              .
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#2C2533]" htmlFor="new-password">
                  New password
                </label>
                <PasswordInput
                  id="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setError(null);
                    }
                  }}
                  className="w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:outline-none"
                  placeholder="••••••••"
                  disabled={disabled}
                />
                <PasswordRequirements
                  password={password}
                  className="mt-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#2C2533]" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <PasswordInput
                  id="confirm-password"
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setError(null);
                    }
                  }}
                  className="w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:outline-none"
                  placeholder="••••••••"
                  disabled={disabled}
                />
              </div>

              {status === "error" && error ? (
                <p className="text-sm font-semibold text-red-700">{error}</p>
              ) : null}

              {status === "success" ? (
                <p className="text-sm font-semibold text-[#166534]">
                  Password updated! Redirecting you to the login page…
                </p>
              ) : null}

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[#2C2533] hover:underline"
                >
                  ← Back to login
                </Link>

                <button
                  type="submit"
                  disabled={disabled}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#BFD9EA] px-7 py-3 text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:-translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "submitting" ? "Updating…" : "Save new password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </PageContainer>
    </main>
  );
}
