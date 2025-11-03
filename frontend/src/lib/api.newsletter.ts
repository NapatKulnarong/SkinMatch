const getApiBase = () => {
  const baseFromClient = process.env.NEXT_PUBLIC_API_BASE || "/api";
  const isServer = typeof window === "undefined";

  if (isServer) {
    let fromEnv =
      process.env.INTERNAL_API_BASE ||
      process.env.API_BASE ||
      baseFromClient.replace(
        /^https?:\/\/localhost(:\d+)?/,
        (_match, port = ":8000") => `http://backend${port}`
      );

    if (fromEnv.startsWith("/")) {
      fromEnv = `http://backend:8000${fromEnv}`;
    }

    return fromEnv.replace(/\/+$/, "");
  }

  return baseFromClient.replace(/\/+$/, "");
};

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

  const base = getApiBase();
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
