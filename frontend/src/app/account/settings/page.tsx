// frontend/src/app/account/settings/page.tsx
"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  type ProfileUpdatePayload,
} from "@/lib/api.auth";
import {
  clearSession,
  getAuthToken,
  saveProfile,
  StoredProfile,
  normalizeStoredProfile,
} from "@/lib/auth-storage";

type FieldState = {
  first_name: string;
  last_name: string;
  username: string;
  date_of_birth: string;
  gender: string;
};

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [fieldState, setFieldState] = useState<FieldState>({
    first_name: "",
    last_name: "",
    username: "",
    date_of_birth: "",
    gender: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    tokenRef.current = token;
    if (!token) {
      router.replace("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const fetched = normalizeStoredProfile(await fetchProfile(token));
        setProfile(fetched);
        setFieldState({
          first_name: fetched.first_name ?? "",
          last_name: fetched.last_name ?? "",
          username: fetched.username ?? "",
          date_of_birth: fetched.date_of_birth ?? "",
          gender: fetched.gender ?? "",
        });
      } catch (err) {
        console.error("Failed to load profile settings", err);
        setError(err instanceof Error ? err.message : "Unable to load profile");
        clearSession();
        setTimeout(() => router.replace("/login"), 2000);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const currentAvatar = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (profile?.avatar_url) return profile.avatar_url;
    return "/img/avatar_placeholder.png";
  }, [avatarPreview, profile]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[settings] avatar preview src", currentAvatar);
    }
  }, [currentAvatar]);

  const hasFormChanges = useMemo(() => {
    if (!profile) return false;
    const normalize = (value?: string | null) => (value ?? "").trim();
    return (
      normalize(fieldState.first_name) !== normalize(profile.first_name) ||
      normalize(fieldState.last_name) !== normalize(profile.last_name) ||
      normalize(fieldState.username) !== normalize(profile.username) ||
      normalize(fieldState.date_of_birth) !== normalize(profile.date_of_birth) ||
      normalize(fieldState.gender) !== normalize(profile.gender)
    );
  }, [fieldState, profile]);

  const canSave = Boolean(profile) && (hasFormChanges || Boolean(avatarFile));

  const handleFieldChange = (key: keyof FieldState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = event.target;
    setFieldState((prev) => ({ ...prev, [key]: value }));
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tokenRef.current) return;
    setSaving(true);
    setAvatarUploading(Boolean(avatarFile));
    setMessage(null);
    setError(null);

    const payload: ProfileUpdatePayload = {
      first_name: fieldState.first_name,
      last_name: fieldState.last_name,
      username: fieldState.username,
      date_of_birth: fieldState.date_of_birth || null,
      gender: fieldState.gender || null,
      remove_avatar: false,
    };

    try {
      let updatedProfile: StoredProfile | null = null;

      if (avatarFile) {
        updatedProfile = normalizeStoredProfile(await uploadAvatar(tokenRef.current, avatarFile));
        setAvatarFile(null);
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }
      }

      const updated = normalizeStoredProfile(await updateProfile(tokenRef.current, payload));
      const finalProfile = updatedProfile ?? updated;
      setProfile(finalProfile);
      saveProfile(finalProfile);
      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error("Failed to update profile", err);
      setError(err instanceof Error ? err.message : "Unable to update profile");
    } finally {
      setSaving(false);
      setAvatarUploading(false);
    }
  };

  const handleAvatarSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      return;
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = async () => {
    if (!tokenRef.current) return;
    setAvatarUploading(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateProfile(tokenRef.current, { remove_avatar: true });
      setProfile(updated);
      saveProfile(updated);
      setMessage("Profile picture removed.");
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#d3cbe0] flex items-center justify-center">
        <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#7C6DB1]" />
          <p className="text-base font-semibold text-gray-800">Loading profile settings…</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#d3cbe0] flex items-center justify-center">
        <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <p className="text-base font-semibold text-gray-800">
            We couldn&apos;t load your profile. Redirecting…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#d3cbe0]">
      <PageContainer className="pt-24 pb-16 lg:px-8 xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7C6DB1]">
              Personal profile
            </p>
            <h1 className="text-3xl font-extrabold text-gray-900">Profile settings</h1>
            <p className="text-sm text-gray-700">
              Give Matchy the details it needs to tailor recommendations just for you.
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
          >
            ← Back to account
          </Link>
        </div>

        {(message || error) && (
          <div
            className={[
              "mt-6 rounded-xl border-2 px-4 py-3 text-sm font-semibold",
              message
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {message ?? error}
          </div>
        )}

        <section className="mt-6 rounded-[32px] border-2 border-black bg-gradient-to-br from-white to-[#ece4ff] p-6 shadow-[8px_10px_0_rgba(0,0,0,0.25)] lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr] 2xl:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border-2 border-black bg-white p-5 shadow-[4px_6px_0_rgba(0,0,0,0.18)]">
                <h2 className="text-lg font-bold text-gray-900">Profile picture</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload a friendly face so Matchy recognises you instantly.
                </p>

                <div className="mt-4 space-y-4">
                  <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-3xl border-2 border-black bg-[#f0e7ff] shadow-[4px_6px_0_rgba(0,0,0,0.2)] sm:h-44 sm:w-44">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentAvatar}
                      alt="Profile avatar preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Tip: square photo (≥240px). JPG, PNG, GIF, or WEBP works best.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]">
                      Choose image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleAvatarSelection}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={avatarUploading || (!profile?.avatar_url && !avatarPreview)}
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#f6d4d9] px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove picture
                    </button>
                  </div>
                </div>
              </div>

              {canSave && !saving && (
                <div className="rounded-xl border-2 border-[#f3c078] bg-[#fff3dc] px-4 py-3 text-sm font-semibold text-[#8b5b21] shadow-[0_4px_0_rgba(0,0,0,0.15)]">
                  You have unsaved changes.
                </div>
              )}
            </div>

            <form
              className="flex flex-col gap-6 rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_6px_0_rgba(0,0,0,0.18)]"
              onSubmit={handleProfileSubmit}
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900">Personal details</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Keep your profile in sync so SkinMatch feels like home.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-800">
                  First name
                  <input
                    type="text"
                    value={fieldState.first_name}
                    onChange={handleFieldChange("first_name")}
                    className="rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[0_4px_0_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                    placeholder="Taylor"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-800">
                  Last name
                  <input
                    type="text"
                    value={fieldState.last_name}
                    onChange={handleFieldChange("last_name")}
                    className="rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[0_4px_0_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                    placeholder="Swift"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-semibold text-gray-800">
                Username
                <input
                  type="text"
                  value={fieldState.username}
                  onChange={handleFieldChange("username")}
                  required
                  className="rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[0_4px_0_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-800">
                  Date of birth
                  <input
                    type="date"
                    value={fieldState.date_of_birth}
                    onChange={handleFieldChange("date_of_birth")}
                    max={new Date().toISOString().split("T")[0]}
                    className="rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[0_4px_0_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-800">
                  Gender
                  <select
                    value={fieldState.gender}
                    onChange={handleFieldChange("gender")}
                    className="rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[0_4px_0_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!canSave || saving || avatarUploading}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#c8f0c8] px-6 py-3 text-sm font-semibold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving || avatarUploading ? "Saving…" : "Save changes"}
                </button>
                {!canSave && !saving && !avatarUploading && (
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Everything is up to date
                  </span>
                )}
              </div>
            </form>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
