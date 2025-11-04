import type { StoredProfile } from "./auth-storage";

const DEFAULT_DISPLAY_NAME = "Anonymous User";

let anonymousCounter = 0;

const nextAnonymousDisplayName = (): string => {
  anonymousCounter += 1;
  return `${DEFAULT_DISPLAY_NAME} ${anonymousCounter}`;
};

const normalise = (value?: string | null): string => (value ?? "").trim();

const initialsFromName = (name?: string | null): string => {
  const cleaned = normalise(name);
  if (!cleaned) return "SM";
  const parts = cleaned.replace(/[_\s]+/g, " ").split(" ").filter(Boolean);
  if (parts.length === 0) return "SM";
  if (parts.length === 1) {
    const token = parts[0];
    return token.length >= 2 ? token.slice(0, 2).toUpperCase() : token[0].toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const buildDisplayName = (profile: StoredProfile | null): string => {
  if (!profile) return nextAnonymousDisplayName();
  const username = normalise(profile.username);
  if (username) return username;
  const first = normalise(profile.first_name);
  const last = normalise(profile.last_name);
  if (first && last) {
    return `${first} ${last.charAt(0)}.`;
  }
  if (first) return first;
  if (last) return last;
  return nextAnonymousDisplayName();
};

export type FeedbackMetadataOptions = {
  profile: StoredProfile | null;
  badge?: string | null;
  location?: string | null;
  source?: string | null;
  anonymize?: boolean;
};

export const buildFeedbackMetadata = ({
  profile,
  badge,
  location,
  source,
  anonymize = false,
}: FeedbackMetadataOptions): Record<string, string> => {
  const metadata: Record<string, string> = {};

  const displayName = buildDisplayName(profile);
  metadata.display_name = displayName;
  metadata.initials = initialsFromName(displayName);

  if (badge) {
    const trimmedBadge = normalise(badge);
    if (trimmedBadge) {
      metadata.badge = trimmedBadge;
    }
  }

  if (location) {
    const trimmedLocation = normalise(location);
    if (trimmedLocation) {
      metadata.location = trimmedLocation;
    }
  }

  if (source) {
    const trimmedSource = normalise(source);
    if (trimmedSource) {
      metadata.source = trimmedSource;
    }
  }

  if (anonymize) {
    metadata.anonymous = "1";
  }

  return metadata;
};

export const deriveInitials = initialsFromName;
