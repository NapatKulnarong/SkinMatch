// src/lib/api.scan.ts

export type ScanLabelResult = {
  raw_text: string;
  benefits: string[];
  actives: string[];
  concerns: string[];
  notes: string[];
  confidence: number;
};

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

export async function scanProductLabel(file: File): Promise<ScanLabelResult> {
  const base = getApiBase();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${base}/scan-text/label/analyze-llm`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || "Failed to analyze the label. Please try again.");
  }

  return response.json();
}

export async function scanIngredientsText(text: string): Promise<ScanLabelResult> {
  const base = getApiBase();

  const response = await fetch(`${base}/scan-text/label/analyze-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || "Failed to analyze the text. Please try again.");
  }

  return response.json();
}
