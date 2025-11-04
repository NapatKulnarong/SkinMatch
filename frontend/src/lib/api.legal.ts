const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

type SendTermsEmailPayload = {
  email: string;
  termsBody: string;
};

export async function sendTermsEmail(payload: SendTermsEmailPayload) {
  const base = API_BASE.replace(/\/$/, "");
  const response = await fetch(`${base}/legal/send-terms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email,
      terms_body: payload.termsBody,
    }),
  });

  if (!response.ok) {
    let message = "We couldn't send the terms email.";
    try {
      const data = await response.json();
      if (typeof data?.detail === "string" && data.detail.trim()) {
        message = data.detail;
      }
    } catch {
      // ignore JSON parsing errors and fall back to default message
    }
    throw new Error(message);
  }
}
