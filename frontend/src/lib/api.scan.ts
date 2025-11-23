import { resolveApiBase } from "./apiBase";

export type ScanLabelResult = {
  raw_text: string;
  benefits: string[];
  actives: string[];
  concerns: string[];
  notes: string[];
  confidence: number;
};

export async function scanProductLabel(file: File): Promise<ScanLabelResult> {
  const base = resolveApiBase();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${base}/scan-text/label/analyze-llm`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    // Try to parse JSON error response first (Django Ninja format: { "detail": "message" })
    let errorMessage = "Failed to analyze the label. Please try again.";
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.detail || errorJson.message || errorMessage;
    } catch {
      // If JSON parsing fails, try text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Fallback to default message
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function scanIngredientsText(text: string): Promise<ScanLabelResult> {
  const base = resolveApiBase();

  const response = await fetch(`${base}/scan-text/label/analyze-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    // Try to parse JSON error response first (Django Ninja format: { "detail": "message" })
    let errorMessage = "Failed to analyze the text. Please try again.";
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.detail || errorJson.message || errorMessage;
    } catch {
      // If JSON parsing fails, try text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Fallback to default message
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
