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
  changePassword,
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
  const [passwordState, setPasswordState] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  const handlePasswordFieldChange =
    (key: "current" | "next" | "confirm") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setPasswordState((prev) => ({ ...prev, [key]: value }));
    };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tokenRef.current) return;

    setPasswordSaving(true);
    setPasswordMessage(null);
    setPasswordError(null);

    const current = passwordState.current.trim();
    const next = passwordState.next.trim();
    const confirm = passwordState.confirm.trim();

    if (!current || !next || !confirm) {
      setPasswordError("Please fill in every password field.");
      setPasswordSaving(false);
      return;
    }

    if (next.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      setPasswordSaving(false);
      return;
    }

    if (next !== confirm) {
      setPasswordError("New password confirmation does not match.");
      setPasswordSaving(false);
      return;
    }

    if (current === next) {
      setPasswordError("New password must be different from the current password.");
      setPasswordSaving(false);
      return;
    }

    try {
      await changePassword(tokenRef.current, {
        current_password: current,
        new_password: next,
      });
      setPasswordMessage("Password updated successfully.");
      setPasswordState({ current: "", next: "", confirm: "" });
    } catch (err) {
      console.error("Failed to change password", err);
      setPasswordError(
        err instanceof Error ? err.message : "Unable to change password right now."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#d3cbe0] flex items-center justify-center">
        <div className="rounded-2xl border-2 border-black bg-white px-8 py-6 text-center shadow-[6px_8px_0_rgba(0,0,0,0.25)]">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#e5dff0] border-t-[#7C6DB1]" />
          <p className="text-lg font-bold text-gray-900">Loading your profile</p>
          <p className="mt-1 text-sm text-gray-600">Just a moment...</p>
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7C6DB1]">
              Personal profile
            </p>
            <h1 className="text-4xl font-extrabold text-gray-900">Profile settings</h1>
            <p className="text-base text-gray-700 max-w-2xl">
              Give Matchy the details it needs to tailor recommendations just for you.
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2.5 text-sm font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to account
          </Link>
        </div>

        {(message || error) && (
          <div
            className={[
              "mb-6 rounded-xl border-2 px-5 py-4 text-sm font-semibold shadow-[0_4px_0_rgba(0,0,0,0.15)]",
              message
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800",
            ].join(" ")}
          >
            {message ?? error}
          </div>
        )}

        <section className="rounded-[32px] border-2 border-black bg-gradient-to-br from-white to-[#ece4ff] p-8 shadow-[8px_10px_0_rgba(0,0,0,0.25)] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
            {/* Left Column - Avatar */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_6px_0_rgba(0,0,0,0.18)]">
                <h2 className="text-xl font-bold text-gray-900">Profile picture</h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Upload a friendly face so Matchy recognises you instantly.
                </p>

                <div className="mt-6 space-y-5">
                  {/* Circular Avatar */}
                  <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-full border-4 border-black bg-[#f0e7ff] shadow-[6px_8px_0_rgba(0,0,0,0.2)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentAvatar}
                      alt="Profile avatar preview"
                      className="h-full w-full object-cover"
                    />
                    {avatarUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                      Best results with square photos (240px or larger)
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      JPG, PNG, GIF, or WEBP formats supported
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-black bg-[#7C6DB1] px-5 py-3 text-sm font-bold text-white shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:bg-[#6d5da0] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)]">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Choose new image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleAvatarSelection}
                        className="hidden"
                        disabled={avatarUploading}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={avatarUploading || (!profile?.avatar_url && !avatarPreview)}
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-5 py-3 text-sm font-bold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.2)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.2)]"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove picture
                    </button>
                  </div>
                </div>
              </div>

              {/* Unsaved Changes Warning */}
              {canSave && !saving && (
                <div className="rounded-xl border-2 border-[#f3c078] bg-gradient-to-br from-[#fff8e8] to-[#fff3dc] px-4 py-3.5 shadow-[0_4px_0_rgba(0,0,0,0.15)]">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#d97706] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-[#92400e]">Unsaved changes</p>
                      <p className="text-xs text-[#b45309] mt-1">Remember to save your updates below</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Form */}
            <form
              className="flex flex-col gap-6 rounded-2xl border-2 border-black bg-white p-8 shadow-[4px_6px_0_rgba(0,0,0,0.18)]"
              onSubmit={handleProfileSubmit}
            >
              <div>
                <h2 className="text-xl font-bold text-gray-900">Personal details</h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Keep your profile in sync so SkinMatch feels like home.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                    First name
                    <input
                      type="text"
                      value={fieldState.first_name}
                      onChange={handleFieldChange("first_name")}
                      className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                      placeholder="Taylor"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                    Last name
                    <input
                      type="text"
                      value={fieldState.last_name}
                      onChange={handleFieldChange("last_name")}
                      className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                      placeholder="Swift"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                  Username
                  <input
                    type="text"
                    value={fieldState.username}
                    onChange={handleFieldChange("username")}
                    required
                    className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                    placeholder="your_username"
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                    Date of birth
                    <input
                      type="date"
                      value={fieldState.date_of_birth}
                      onChange={handleFieldChange("date_of_birth")}
                      max={new Date().toISOString().split("T")[0]}
                      className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                    Gender
                    <select
                      value={fieldState.gender}
                      onChange={handleFieldChange("gender")}
                      className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-gray-100">
                <button
                  type="submit"
                  disabled={!canSave || saving || avatarUploading}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#c8f0c8] px-8 py-3.5 text-base font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_0_rgba(0,0,0,0.25)]"
                >
                  {saving || avatarUploading ? (
                    <>
                      <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Save changes
                    </>
                  )}
                </button>
                {!canSave && !saving && !avatarUploading && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-bold">
                      All changes saved
                    </span>
                  </div>
                )}
              </div>
            </form>
          </div>
          <form
            className="mt-8 flex flex-col gap-6 rounded-2xl border-2 border-black bg-white p-8 shadow-[4px_6px_0_rgba(0,0,0,0.18)]"
            onSubmit={handlePasswordSubmit}
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">Change password</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Update your password to keep your SkinMatch account secure.
              </p>
            </div>

            {(passwordMessage || passwordError) && (
              <div
                className={[
                  "rounded-xl border-2 px-5 py-4 text-sm font-semibold shadow-[0_4px_0_rgba(0,0,0,0.12)]",
                  passwordMessage
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-red-300 bg-red-50 text-red-800",
                ].join(" ")}
              >
                {passwordMessage ?? passwordError}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-bold text-gray-800 sm:col-span-2">
                Current password
                <input
                  type="password"
                  value={passwordState.current}
                  onChange={handlePasswordFieldChange("current")}
                  autoComplete="current-password"
                  className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                  placeholder="••••••••"
                  disabled={passwordSaving}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                New password
                <input
                  type="password"
                  value={passwordState.next}
                  onChange={handlePasswordFieldChange("next")}
                  autoComplete="new-password"
                  minLength={8}
                  className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                  placeholder="At least 8 characters"
                  disabled={passwordSaving}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                Confirm new password
                <input
                  type="password"
                  value={passwordState.confirm}
                  onChange={handlePasswordFieldChange("confirm")}
                  autoComplete="new-password"
                  className="rounded-xl border-2 border-black px-4 py-3 text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                  placeholder="Re-enter new password"
                  disabled={passwordSaving}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#c8f0c8] px-8 py-3.5 text-base font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_0_rgba(0,0,0,0.25)]"
              >
                {passwordSaving ? (
                  <>
                    <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                    Updating…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Update password
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </PageContainer>
    </main>
  );
}
