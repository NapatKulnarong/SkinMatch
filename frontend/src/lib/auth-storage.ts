const TOKEN_KEY = "sm_token";
const PROFILE_KEY = "sm_profile";

export type StoredProfile = {
  u_id: string;
  username: string;
  email?: string | null;
  is_verified: boolean;
  created_at: string;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  first_name?: string | null;
  last_name?: string | null;
};

export const PROFILE_EVENT = "sm-profile-changed";

function emitProfileEvent(profile: StoredProfile | null) {
  if (typeof window === "undefined") return;
  try {
    const event = new CustomEvent(PROFILE_EVENT, {
      detail: profile,
    } as CustomEventInit<StoredProfile | null>);
    window.dispatchEvent(event);
  } catch {
    // Fallback for environments without CustomEvent constructor
    window.dispatchEvent(new Event(PROFILE_EVENT));
  }
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function saveProfile(profile: StoredProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  emitProfileEvent(profile);
}

export function getStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredProfile;
  } catch (error) {
    console.warn("Failed to parse stored profile", error);
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

export function clearStoredProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
  emitProfileEvent(null);
}

export function clearSession() {
  clearAuthToken();
  clearStoredProfile();
}
