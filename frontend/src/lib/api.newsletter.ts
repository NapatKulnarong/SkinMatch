import { resolveApiBase } from "./apiBase";

export type NewsletterSubscribeResponse = {
  ok: boolean;
  message: string;
  alreadySubscribed: boolean;
};

type ErrorPayload = {
  detail?: unknown;
};

export async function subscribeToNewsletter(
  email: string,
  source?: string
): Promise<NewsletterSubscribeResponse> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Please enter your email address.");
  }

  const base = resolveApiBase();
  const res = await fetch(`${base}/newsletter/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: trimmed,
      source: source?.trim() || undefined,
    }),
  });

  if (res.status === 422 || res.status === 400) {
    const payload = (await res.json().catch(() => ({}))) as ErrorPayload;
    const detail = payload?.detail;
    if (typeof detail === "string") {
      throw new Error(detail);
    }
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === "string") {
      throw new Error(detail[0].msg);
    }
    throw new Error("Please enter a valid email address.");
  }

  if (!res.ok) {
    throw new Error("We couldn't add you just now. Please try again in a moment.");
  }

  const payload = (await res.json()) as {
    ok: boolean;
    message: string;
    already_subscribed?: boolean;
  };

  return {
    ok: Boolean(payload.ok),
    message: payload.message ?? "Thanks! You're all signed up.",
    alreadySubscribed: Boolean(payload.already_subscribed),
  };
}
