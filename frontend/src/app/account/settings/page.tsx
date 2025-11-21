// frontend/src/app/account/settings/page.tsx
"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { PasswordInput } from "@/components/PasswordInput";
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
  const [avatarAction, setAvatarAction] = useState<"none" | "upload" | "remove">("none");
  const [avatarPendingRemoval, setAvatarPendingRemoval] = useState(false);
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
    if (avatarPendingRemoval) {
      return "/img/avatar_placeholder.png";
    }
    if (avatarPreview) return avatarPreview;
    if (profile?.avatar_url) return profile.avatar_url;
    return "/img/avatar_placeholder.png";
  }, [avatarPendingRemoval, avatarPreview, profile]);

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

  const hasAvatarChanges = avatarAction !== "none";
  const hasPendingChanges = hasFormChanges || hasAvatarChanges;
  const canSave = hasPendingChanges && !loading;
  const isSavingInProgress = saving || avatarUploading;
  const allChangesSaved = !hasPendingChanges && !isSavingInProgress;

  const handleFieldChange = (key: keyof FieldState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = event.target;
    setFieldState((prev) => ({ ...prev, [key]: value }));
  };

  const requireToken = () => {
    const latestToken = tokenRef.current ?? getAuthToken();
    if (!latestToken) {
      setError("Please sign in again to update your profile.");
      clearSession();
      router.replace("/login?next=/account/settings");
      return null;
    }
    tokenRef.current = latestToken;
    return latestToken;
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const activeToken = requireToken();
    if (!activeToken) {
      return;
    }

    if (!hasPendingChanges) {
      setMessage("No new changes to save yet.");
      setError(null);
      return;
    }
    const pendingAvatarUpload = avatarAction === "upload" && Boolean(avatarFile);
    const pendingAvatarRemoval = avatarAction === "remove";

    setSaving(true);
    setAvatarUploading(pendingAvatarUpload);
    setMessage(null);
    setError(null);

    const payload: ProfileUpdatePayload = {
      first_name: fieldState.first_name,
      last_name: fieldState.last_name,
      username: fieldState.username,
      date_of_birth: fieldState.date_of_birth || null,
      gender: fieldState.gender || null,
      remove_avatar: pendingAvatarRemoval ? true : undefined,
    };

    try {
      let updatedProfile: StoredProfile | null = null;

      if (pendingAvatarUpload && avatarFile) {
        updatedProfile = normalizeStoredProfile(await uploadAvatar(activeToken, avatarFile));
        setAvatarFile(null);
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }
        setAvatarPendingRemoval(false);
      }

      const updated = normalizeStoredProfile(await updateProfile(activeToken, payload));
      const finalProfile = updatedProfile ?? updated;
      setProfile(finalProfile);
      saveProfile(finalProfile);
      setMessage("Profile updated successfully.");
      if (pendingAvatarRemoval) {
        setAvatarPendingRemoval(false);
      }
      setAvatarAction("none");
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
      setAvatarAction("none");
      setAvatarPendingRemoval(false);
      return;
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarAction("upload");
    setAvatarPendingRemoval(false);
    setMessage(null);
    setError(null);
  };

  const handleRemoveAvatar = async () => {
    if (avatarPendingRemoval || (!profile?.avatar_url && !avatarPreview)) {
      return;
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarAction("remove");
    setAvatarPendingRemoval(true);
    setMessage("Profile picture will be removed after saving.");
    setError(null);
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
    
    // Backend will validate password policy
    if (!next) {
      setPasswordError("Please enter a new password.");
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
      setTimeout(() => setPasswordMessage(null), 3000);
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
    <main className="min-h-screen bg-[#a7acb1]">
      <PageContainer className="pt-41 pb-12 sm:pt-28 lg:pt-32 lg:pb-16 lg:px-8 xl:px-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="hidden sm:block text-3xl font-bold text-black sm:text-4xl">Profile settings</h1>
          </div>
          <Link
            href="/account"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2.5 text-sm font-bold text-gray-900 
                      shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] 
                      active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to account
          </Link>
        </div>

        <section className="relative">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr] lg:items-stretch">
            {/* Left Column - Avatar */}
            <div className="flex flex-col gap-6 lg:h-full">
              <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_6px_0_rgba(0,0,0,0.18)] sm:p-8 lg:h-full lg:flex lg:flex-col">
                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Profile picture</h2>
                <div className="mt-5 space-y-5 lg:flex-1 lg:flex lg:flex-col lg:justify-between">
                  {/* Circular Avatar */}
                  <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-full border-2 border-black bg-[#f0e7ff] sm:h-56 sm:w-56 lg:h-64 lg:w-64">
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

                  <div className="mt-2 flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-black bg-[#94c6ef] 
                                      px-4 py-2.5 text-[11px] lg:text-[13px] font-bold text-black shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px]
                                      hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)] flex-1 min-w-[140px] sm:text-sm sm:px-5 sm:py-3 whitespace-nowrap">
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
                      disabled={
                        avatarUploading ||
                        avatarPendingRemoval ||
                        (!profile?.avatar_url && !avatarPreview)
                      }
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#f57371] px-4 py-2.5 text-[11px] lg:text-[13px] font-bold text-gray-900 shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.2)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.2)] flex-1 min-w-[140px] sm:text-sm sm:px-5 sm:py-3 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove picture
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Form */}
            <form
              className="flex flex-col gap-6 rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_6px_0_rgba(0,0,0,0.18)] sm:p-8 lg:p-10 lg:h-full"
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
                      className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                      placeholder="Taylor"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                    Last name
                    <input
                      type="text"
                      value={fieldState.last_name}
                      onChange={handleFieldChange("last_name")}
                      className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                      placeholder="Swift"
                    />
                  </label>
                </div>
                
                {/* Right Column - Form */}
                <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                  Username
                  <input
                    type="text"
                    value={fieldState.username}
                    onChange={handleFieldChange("username")}
                    required
                    className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
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
                      className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                    Gender
                    <select
                      value={fieldState.gender}
                      onChange={handleFieldChange("gender")}
                      className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
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

              <div className="flex flex-col gap-2 pt-4 border-t-2 border-gray-100 items-end sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                {/* Notifications on the left */}
                <div className="flex-1">
                  {(message || error) && (
                    <div className={`rounded-xl border-2 px-4 py-3.5 shadow-[0_4px_0_rgba(0,0,0,0.15)] ${
                      message
                        ? "border-[#f3c078] bg-gradient-to-br from-[#fff8e8] to-[#fff3dc]"
                        : "border-red-300 bg-red-50"
                    }`}>
                      <div className="flex items-start gap-3">
                        {message ? (
                          <svg className="w-5 h-5 text-[#d97706] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        <div>
                          <p className={`text-sm font-bold ${message ? "text-[#92400e]" : "text-red-800"}`}>
                            {message ?? error}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasPendingChanges && !saving && !message && (
                    <p className="text-sm font-semibold text-[#92400e]">Unsaved changes</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!canSave || isSavingInProgress}
                  className={`inline-flex w-fit items-center justify-center rounded-full border-2 border-black px-4 py-2.5 text-[11px] lg:text-[13px] sm:text-sm font-bold text-gray-900 shadow-[0_5px_0_rgba(0,0,0,0.25)] transition 
                            bg-[#94c6ef] text-gray-900 
                            hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] 
                            active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)] 
                            disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] whitespace-nowrap`}
                >
                  {isSavingInProgress ? (
                    <>
                      <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                      Saving…
                    </>
                  ) : allChangesSaved ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      All changes saved
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
              </div>
            </form>
          </div>
          
          {/* Second Row - set new password */}
          <form
            className="mt-8 flex flex-col gap-6 rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_6px_0_rgba(0,0,0,0.18)] w-full max-w-full sm:max-w-lg md:max-w-full lg:max-w-2xl sm:p-8 lg:p-10"
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
                <PasswordInput
                  value={passwordState.current}
                  onChange={handlePasswordFieldChange("current")}
                  autoComplete="current-password"
                  className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                  placeholder="••••••••"
                  disabled={passwordSaving}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                New password
                <PasswordInput
                  value={passwordState.next}
                  onChange={handlePasswordFieldChange("next")}
                  autoComplete="new-password"
                  className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                  placeholder="••••••••"
                  disabled={passwordSaving}
                />
                <PasswordRequirements
                  password={passwordState.next}
                  className="mt-2"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold text-gray-800">
                Confirm new password
                <PasswordInput
                  value={passwordState.confirm}
                  onChange={handlePasswordFieldChange("confirm")}
                  autoComplete="new-password"
                  className="rounded-xl border-2 border-black px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium shadow-[0_4px_0_rgba(0,0,0,0.2)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1] focus-visible:ring-offset-2"
                  placeholder="Re-enter new password"
                  disabled={passwordSaving}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 pt-2 items-end sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                disabled={passwordSaving || (!passwordState.current.trim() && !passwordState.next.trim() && !passwordState.confirm.trim())}
                className={`inline-flex w-fit items-center justify-center rounded-full border-2 border-black bg-[#94c6ef] text-gray-900 px-4 py-2.5 text-[11px] lg:text-[13px] sm:text-sm font-bold shadow-[0_5px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_7px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_0_rgba(0,0,0,0.25)] whitespace-nowrap ${(!passwordState.current.trim() && !passwordState.next.trim() && !passwordState.confirm.trim()) ? "opacity-50" : ""}`}
              >
                {passwordSaving ? (
                  <>
                    <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                    Updating…
                  </>
                ) : passwordMessage ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Password updated
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
          <div className="absolute -bottom-43 -right-32 hidden lg:block pointer-events-none select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
            src="/img/mascot/matchy_set.png"
            alt = "Matchy Mascot (Settings)"
            className="w-120 h-120 md:w-150 md:h-150 lg:w-170 lg:h-170 xl:w-190 xl:h-190 object-contain pointer-events-none select-none"
            />
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
