export function redirectTo(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  const { location } = window;

  if (typeof location.assign === "function") {
    try {
      location.assign(url);
      return;
    } catch {
    }
  }

  location.href = url;
}
