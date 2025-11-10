export function getFriendlyErrorMessage(raw: string): string {
  const lower = (raw || "").toLowerCase().trim();

  if (!lower) {
    return "We couldn't analyze that. Please try another photo or paste the ingredient list.";
  }

  if (lower.includes("clearer photo") || lower.includes("interpret that label")) {
    return "We couldn't read that label clearly. Try cropping closer, taking the photo in better lighting, or paste the ingredient list in the text box.";
  }

  if (lower.includes("paste the ingredient") || lower.includes("text to analyze")) {
    return "Please paste the ingredient list in the text box so we can analyze it.";
  }

  if (lower.includes("failed to analyze") || lower.includes("ai analyzer failed")) {
    return "Our analyzer had trouble with that file. Double-check the format or try again in a moment.";
  }

  if (lower.includes("too large") || lower.includes("payload")) {
    return "The file might be too large or in an unsupported format. PNG / JPG up to 10MB works best.";
  }

  return raw;
}

