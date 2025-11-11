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
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || "Failed to analyze the label. Please try again.");
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
    const errorMessage = await response.text().catch(() => "");
    throw new Error(errorMessage || "Failed to analyze the text. Please try again.");
  }

  return response.json();
}
