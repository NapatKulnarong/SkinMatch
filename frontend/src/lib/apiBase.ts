const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const rewriteLocalhostToBackend = (value: string) => {
  const backendHost = process.env.INTERNAL_BACKEND_HOST;
  if (!backendHost) {
    return value;
  }

  const pattern = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::(\d+))?/i;
  if (!pattern.test(value)) {
    return value;
  }

  return value.replace(pattern, (_match, protocol, _host, port) => {
    const effectivePort = port ? `:${port}` : ":8000";
    return `${protocol}${backendHost}${effectivePort}`;
  });
};

const inferBackendApiBase = () => {
  const backendUrl =
    process.env.INTERNAL_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return null;
  }

  try {
    const parsed = new URL(backendUrl);
    const base = stripTrailingSlash(parsed.origin);
    return backendUrl.includes("/api") ? stripTrailingSlash(backendUrl) : `${base}/api`;
  } catch {
    return null;
  }
};

const backendLikeOrigins = (() => {
  const origins = new Set<string>();
  const add = (value?: string | null) => {
    if (!value) return;
    try {
      const parsed = new URL(value);
      origins.add(parsed.origin);
    } catch {
      // ignore
    }
  };

  add(process.env.NEXT_PUBLIC_MEDIA_BASE);
  add(process.env.NEXT_PUBLIC_BACKEND_URL);
  add(process.env.BACKEND_URL);
  add(process.env.INTERNAL_BACKEND_URL);

  origins.add("http://backend:8000");
  origins.add("https://backend");
  origins.add("http://localhost:8000");

  return origins;
})();

export const resolveApiBase = () => {
  const baseFromClient = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE || "/api");
  const isServer = typeof window === "undefined";

  if (!isServer) {
    return baseFromClient;
  }

  let fromEnv =
    process.env.INTERNAL_API_BASE ||
    inferBackendApiBase() ||
    process.env.API_BASE ||
    rewriteLocalhostToBackend(baseFromClient);

  if (!fromEnv) {
    return baseFromClient;
  }

  if (fromEnv.startsWith("/")) {
    const backendHost = process.env.INTERNAL_BACKEND_HOST || "backend";
    fromEnv = `http://${backendHost}:8000${fromEnv}`;
  }

  fromEnv = rewriteLocalhostToBackend(fromEnv);
  return stripTrailingSlash(fromEnv);
};

export const resolveMediaUrl = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (backendLikeOrigins.has(parsed.origin)) {
      return parsed.pathname + parsed.search;
    }
    return trimmed;
  } catch {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
};
