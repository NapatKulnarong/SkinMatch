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
  // localhost:8000 is kept as fallback for local development when NEXT_PUBLIC_BACKEND_URL is not set
  if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    origins.add("http://localhost:8000");
  }

  return origins;
})();

export const resolveApiBase = () => {
  const versionFallback = process.env.NEXT_PUBLIC_API_VERSION || "v1";
  const baseFromClient = stripTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE || `/api/${versionFallback}`
  );
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

type MediaOptions = {
  keepBackendOrigin?: boolean;
};

const resolveMediaBase = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_MEDIA_BASE,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.BACKEND_URL,
    process.env.INTERNAL_BACKEND_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      return stripTrailingSlash(parsed.origin);
    } catch {
      if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
        return stripTrailingSlash(candidate);
      }
    }
  }
  return null;
};

const isLocalhost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

const withMediaBase = (path: string) => {
  const base = resolveMediaBase();
  if (!base) {
    return path;
  }
  return `${base}${path}`;
};

export const resolveMediaUrl = (value?: string | null, options?: MediaOptions): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    if (options?.keepBackendOrigin) {
      return withMediaBase(trimmed);
    }
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (backendLikeOrigins.has(parsed.origin)) {
      const rebuilt = parsed.pathname + parsed.search;
      if (options?.keepBackendOrigin) {
        if (isLocalhost(parsed.hostname)) {
          return withMediaBase(rebuilt);
        }
        return `${parsed.protocol}//${parsed.host}${rebuilt}`;
      }
      return rebuilt;
    }
    return trimmed;
  } catch {
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (options?.keepBackendOrigin) {
      return withMediaBase(normalized);
    }
    return normalized;
  }
};
