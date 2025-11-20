"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchProfile,
  login as loginRequest,
  signup as signupRequest,
  createAdminSession,
  requestPasswordReset,
  checkUsername,
} from "@/lib/api.auth";
import {
  clearSession,
  saveProfile,
  setAuthToken,
  type StoredProfile,
} from "@/lib/auth-storage";
import { redirectTo } from "./redirect";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { UsernameRequirements } from "@/components/UsernameRequirements";

type Mode = "intro" | "signup" | "login" | "forgot";

const isModeValue = (value: string | null): value is Mode =>
  value === "intro" || value === "signup" || value === "login" || value === "forgot";

type SignupState = {
  name: string;
  surname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  dob: string;
  gender: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

type LoginState = {
  identifier: string;
  password: string;
};

type ForgotStatus = "idle" | "loading" | "success" | "error";

const initialSignup: SignupState = {
  name: "",
  surname: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  dob: "",
  gender: "",
  acceptTerms: false,
  acceptPrivacy: false,
};

const initialLogin: LoginState = {
  identifier: "",
  password: "",
};

const today = new Date();
const maxDate = today.toISOString().split("T")[0];
const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())
  .toISOString()
  .split("T")[0];

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#D7CFE6] flex flex-col items-center justify-start lg:justify-center gap-8 
                        px-4 pb-10 sm:px-6 pt-[calc(72px+env(safe-area-inset-top))] sm:pt-12 lg:flex-row lg:gap-16">
          <div className="w-[540px] rounded-3xl border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.35)]">
            <p className="text-lg font-semibold text-[#3B2F4A]">Loading sign-in…</p>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
export function buildGoogleAuthUrl(clientId: string) {
  const redirectUri = "http://localhost:8000/api/auth/google/callback";
  const scope = "email profile";

  return (
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`
  );
}

export { redirectTo } from "./redirect";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => {
    const initialMode = searchParams.get("mode");
    return isModeValue(initialMode) ? initialMode : "intro";
  });
  const [signup, setSignup] = useState<SignupState>(initialSignup);
  const [login, setLogin] = useState<LoginState>(initialLogin);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<ForgotStatus>("idle");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const allParams = Object.fromEntries(searchParams.entries()) as Record<string, string>;
    console.log("🔍 URL Search Params:", {
      token: searchParams.get("token"),
      error: searchParams.get("error"),
      provider: searchParams.get("provider"),
      status: searchParams.get("status"),
      allParams,
    });

    const tokenParam = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      console.error("OAuth Error:", error);
      const errorMessages: { [key: string]: string } = {
        "missing_code": "Authentication failed: No authorization code received",
        "server_not_configured": "Server configuration error",
        "token_exchange_failed": "Failed to exchange code for token",
        "missing_id_token": "No ID token received from Google",
        "invalid_token": "Invalid Google token",
        "google_error": "Google authentication failed"
      };
      setGoogleError(errorMessages[error] || `Authentication failed: ${error}`);
      return;
    }

    if (tokenParam) {
      console.log("Token received, processing authentication...");
      setGoogleLoading(true);
      setGoogleError(null);
      
      try {
        setAuthToken(tokenParam);
        console.log("Token stored, fetching profile...");

        fetchProfile(tokenParam)
          .then((profile) => {
            console.log("Profile fetched:", profile);
            saveProfile(profile);
            console.log("Redirecting to /account...");
            router.replace("/account");
          })
          .catch((profileError) => {
            console.warn("Unable to load profile after Google login", profileError);
            console.log("Redirecting to /account (profile load failed)...");
            router.replace("/account");
          })
          .finally(() => {
            setGoogleLoading(false);
          });
      } catch (error) {
        console.error("Error processing token:", error);
        setGoogleError("Failed to process authentication");
        setGoogleLoading(false);
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fromParam = searchParams.get("from");
    if (typeof window === "undefined") {
      return;
    }
    if (fromParam) {
      sessionStorage.setItem("login_from", fromParam);
    }
  }, [searchParams]);

  const syncModeInQuery = (next: Mode, { replace = false }: { replace?: boolean } = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "intro") {
      params.delete("mode");
    } else {
      params.set("mode", next);
    }
    const qs = params.toString();
    const url = `/login${qs ? `?${qs}` : ""}`;
    if (replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  };

  const changeMode = (next: Mode) => {
    const previousMode = mode;
    setMode(next);
    setSignupError(null);
    setLoginError(null);
    setGoogleError(null);
    setForgotEmail("");
    setForgotStatus("idle");
    setForgotError(null);
    setUsernameAvailable(null);
    setUsernameChecking(false);
    
    // Clear username check timeout
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }
    
    const shouldReplaceHistory = next === previousMode;
    syncModeInQuery(next, { replace: shouldReplaceHistory });
  };

  const lastSearchQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const currentQuery =
      typeof searchParams?.toString === "function" ? searchParams.toString() : "";
    if (currentQuery === lastSearchQueryRef.current) {
      return;
    }
    lastSearchQueryRef.current = currentQuery;
    const nextMode = searchParams.get("mode");
    setMode((prev) => {
      if (isModeValue(nextMode) && nextMode !== prev) {
        return nextMode;
      }
      if (!nextMode && prev !== "intro") {
        return "intro";
      }
      return prev;
    });
  }, [searchParams]);

  // Cleanup username check timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleGoogleSignIn = () => {
    if (googleLoading) return;
  
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleError("Google Sign-In is not configured.");
      return;
    }

    console.log("Starting Google OAuth flow...");
    
    const redirectUri = 'http://localhost:8000/api/auth/google/callback'; 
    const scope = 'email profile';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`;
    
    console.log("🔗 Redirecting to Google:", authUrl);
    setGoogleLoading(true);
    redirectTo(authUrl);
  };

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = forgotEmail.trim();

    if (!trimmedEmail) {
      setForgotStatus("error");
      setForgotError("Please enter the email associated with your account.");
      return;
    }

    setForgotStatus("loading");
    setForgotError(null);

    try {
      const response = await requestPasswordReset(trimmedEmail);
      if (!response.ok) {
        throw new Error("We couldn't send the reset link. Please try again in a moment.");
      }
      setForgotStatus("success");
    } catch (error) {
      setForgotStatus("error");
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't send the reset link. Please try again later.";
      setForgotError(message);
    }
  };
  
  const onSignupChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSignup((prev) => ({ ...prev, [name]: value }));
    
    // Real-time username validation
    if (name === "username") {
      setUsernameAvailable(null);
      
      // Clear previous timeout
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
      
      const trimmedUsername = value.trim();
      
      // Basic validation
      if (!trimmedUsername) {
        setUsernameAvailable(null);
        setUsernameChecking(false);
        return;
      }
      
      if (trimmedUsername.length < 3) {
        setUsernameAvailable(false);
        setUsernameChecking(false);
        return;
      }
      
      // Debounce the API call
      setUsernameChecking(true);
      usernameCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await checkUsername(trimmedUsername);
          setUsernameAvailable(result.available);
        } catch (error) {
          console.error("Username check failed:", error);
          setUsernameAvailable(false);
        } finally {
          setUsernameChecking(false);
        }
      }, 500); // 500ms debounce
    }
  };

  const onSignupCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = e.target;
    setSignup((prev) => ({ ...prev, [name]: checked }));
  };

  const onLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLogin((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSignupError(null);

    // Basic client-side validation
    if (signup.password !== signup.confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }
    
    // Backend will validate password policy, but we do a basic check for UX
    if (!signup.password) {
      setSignupError("Please enter a password.");
      return;
    }

    let formattedDob: string | undefined;

    if (signup.dob) {
      const isoMatch = signup.dob.match(/^\d{4}-\d{2}-\d{2}$/);
      const slashMatch = signup.dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

      if (isoMatch) {
        formattedDob = signup.dob;
      } else if (slashMatch) {
        const [, day, month, year] = slashMatch;
        formattedDob = `${year}-${month}-${day}`;
      } else {
        setSignupError("Date of birth must be in YYYY-MM-DD format.");
        return;
      }

    const isValidDate = (dateString: string): boolean => {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    };

    if (!isValidDate(formattedDob)) {
        setSignupError("Please enter a valid date of birth.");
        return;
      }

    const birthDate = new Date(formattedDob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 13) {
      setSignupError("You must be at least 13 years old to sign up.");
      return;
    }
  }

    if (!signup.acceptTerms) {
      setSignupError("You must agree to the Terms of Service to continue.");
      return;
    }

    if (!signup.acceptPrivacy) {
      setSignupError("You must agree to the Privacy Policy to continue.");
      return;
    }

    setSignupLoading(true);
    try {
      await signupRequest({
        first_name: signup.name.trim(),
        last_name: signup.surname.trim(),
        username: signup.username.trim(),
        email: signup.email.trim().toLowerCase(),
        password: signup.password,
        confirm_password: signup.confirmPassword,
        date_of_birth: formattedDob,
        gender: signup.gender || undefined,
        accept_terms_of_service: signup.acceptTerms,
        accept_privacy_policy: signup.acceptPrivacy,
      });

      const loginResponse = await loginRequest({
        identifier: signup.email.trim().toLowerCase(),
        password: signup.password,
      });
      const token = loginResponse.token!;
      setAuthToken(token);

      try {
        const profile = await fetchProfile(token);
        saveProfile(profile);
      } catch (profileError) {
        console.warn("Unable to load profile after signup", profileError);
      }

      router.push("/account");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Signup failed. Please try again.";
      setSignupError(message);
      if (typeof message === "string" && message.toLowerCase().includes("username already")) {
        setUsernameAvailable(false);
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    clearSession();

    try {
      const identifier = login.identifier.trim();
      
      const loginResponse = await loginRequest({
        identifier: identifier,
        password: login.password,
      });
      if (!loginResponse?.token) {
        throw new Error(loginResponse?.message || "Login failed. Please try again.");
      }

      const token = loginResponse.token;
      setAuthToken(token);

      let fetchedProfile: StoredProfile | null = null;
      try {
        fetchedProfile = await fetchProfile(token);
        saveProfile(fetchedProfile);
      } catch (profileError) {
        console.warn("Unable to load profile", profileError);
      }

      // Check if user is staff and redirect to admin
      if (fetchedProfile?.is_staff) {
        try {
          const adminSession = await createAdminSession(token, fetchedProfile);
          if (adminSession?.redirect_url) {
            console.log("🔄 Redirecting to admin:", adminSession.redirect_url);
            redirectTo(adminSession.redirect_url);
            return;
          }

          console.warn("Admin session response missing redirect_url", adminSession);
          setLoginError("Unable to start admin session. Please try again.");
          return;
        } catch (adminError) {
          console.error("Unable to establish admin session", adminError);
          setLoginError("Unable to start admin session. Please try again.");
          return;
        }
      }

      // Regular user - check for redirect parameter or go to account page
      const redirectParam = searchParams.get("redirect");
      if (redirectParam) {
        router.push(redirectParam);
      } else {
        router.push("/account");
      }
    } catch (error: unknown) {
      clearSession();
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  const cardBg = mode === "intro" ? "bg-white/95" : "bg-[#B6A6D8]";

  return (
    <main className="min-h-screen bg-[#D7CFE6] flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-16">
      <div className="hidden lg:flex justify-end lg:mr-0">
        <Image
          src="/img/mascot/matchy_2.png"
          alt="Matchy mascot waving hello"
          width={520}
          height={520}
          priority
          className="w-48 sm:w-64 lg:w-[600px] drop-shadow-[6px_6px_0_rgba(0,0,0,0.18)] sm:drop-shadow-[12px_12px_0_rgba(0,0,0,0.18)] translate-y-2 sm:translate-y-4"
        />
      </div>
      <div
  className={[
    "w-full max-w-md sm:max-w-lg lg:w-[540px] rounded-3xl border-2 border-black overflow-hidden",
    "shadow-[4px_4px_0_rgba(0,0,0,0.35)] sm:shadow-[6px_8px_0_rgba(0,0,0,0.35)]",
    "mt-32 sm:mt-20 lg:mt-0", 
    cardBg,
  ].join(" ")}
>
        {mode === "intro" && (
          <>
          <div className="p-5 sm:p-7">
              <h2 className="text-2xl lg:text-3xl font-extrabold text-[#3B2F4A]">
                Join <span className="text-[#3B2F4A]">MatchClub</span>
              </h2>

              <ul className="mt-4 text-gray-700 font-semibold text-sm sm:text-base">
                <li className="py-2.5 lg:py-3 flex gap-3 items-start border-b border-black/10">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Save your match result</span>
                </li>
                <li className="py-2.5 lg:py-3 flex gap-3 items-start border-b border-black/10">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Save your skincare wish lists</span>
                </li>
                <li className="py-2.5 lg:py-3 flex gap-3 items-start border-b border-black/10">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Read &amp; write reviews on your matches</span>
                </li>
                <li className="py-2.5 lg:pt-3 pb-1 flex gap-3 items-start">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Get the latest updates on the skincare industry.</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#B6A6D8] p-4 sm:p-6">
              <button
                data-testid="signup-google"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full inline-flex items-center justify-center gap-3 rounded-[10px] border-2 border-black bg-white px-6 py-2.5 lg:py-4 text-sm lg:text-base 
                          font-bold lg:font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-[-1px] 
                          hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] 
                          focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon className="block h-5 w-5 flex-shrink-0" />
                <span className="leading-none">
                  {googleLoading ? "Redirecting..." : "Sign up with Google"}
                </span>
              </button>
              {googleError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-center text-sm font-semibold text-red-700">
                    {googleError}
                  </p>
                  <p className="text-center text-xs text-red-600 mt-1">
                    Check browser console for details
                  </p>
                </div>
              )}

              <button
                data-testid="signup-email"
                type="button"
                onClick={() => changeMode("signup")}
                className="mt-4 w-full inline-flex items-center justify-center gap-3 rounded-[10px] border-2 border-black bg-white px-6 py-2 lg:py-4 text-sm lg:text-base 
                          font-bold lg:font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-[-1px] 
                          hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] 
                          focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
              >
                <MailIcon className="block h-6 w-6 flex-shrink-0" />
                <span className="leading-none">Sign up with Email</span>
              </button>

              <p className="mt-5 lg:mt-6 text-center text-sm text-gray-800">
                Already have an account?{" "}
                <button
                  data-testid="go-login"
                  type="button"
                  onClick={() => changeMode("login")}
                  className="font-semibold text-[#3B2F4A] hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </>
        )}

        {mode === "signup" && (
          <div className="p-6 sm:p-8" data-testid="signup-form">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#2C2533] mb-2">
              Create your account
            </h2>

            <form onSubmit={handleSignup} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-4">
                <Field label="Name">
                  <input
                    name="name"
                    value={signup.name}
                    onChange={onSignupChange}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black text-xs lg:text-base focus:outline-none placeholder:text-gray-600"
                    placeholder="Your name"
                  />
                </Field>

                <Field label="Surname">
                  <input
                    name="surname"
                    value={signup.surname}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black text-xs lg:text-base focus:outline-none placeholder:text-gray-600"
                    placeholder="Your surname"
                  />
                </Field>

                <Field label="Date of birth" >
                  <input
                    type="date"
                    name="dob"
                    value={signup.dob}
                    onChange={onSignupChange}
                    min={minDate}
                    max={maxDate}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-xs lg:text-base focus:outline-none placeholder:text-gray-600"
                  />
                </Field>

                <Field label="Gender">
                  <select
                    name="gender"
                    value={signup.gender}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-xs lg:text-base focus:outline-none text-gray-800"
                  >
                    <option value="" disabled>
                      Click to select
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                </Field>

                <Field label="Username">
                  <input
                    name="username"
                    value={signup.username}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black text-xs lg:text-base focus:outline-none placeholder:text-gray-600"
                    placeholder="Pick a username"
                  />
                  <div className="mt-[0.5px] sm:hidden">
                    <UsernameRequirements
                      isAvailable={usernameAvailable}
                      isChecking={usernameChecking}
                    />
                  </div>
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    value={signup.email}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black text-xs lg:text-base focus:outline-none placeholder:text-gray-600"
                    placeholder="you@example.com"
                  />
                </Field>

                <div className="hidden sm:block sm:col-span-2 mt-[2px]">
                  <UsernameRequirements
                    isAvailable={usernameAvailable}
                    isChecking={usernameChecking}
                  />
                </div>

                <Field label="Password" colSpan={2}>
                  <input
                    type="password"
                    name="password"
                    value={signup.password}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black text-xs lg:text-base focus:outline-none"
                    placeholder="••••••••"
                  />
                  <PasswordRequirements
                    password={signup.password}
                    className="mt-2"
                  />
                </Field>

                <Field label="Confirm Password" colSpan={2}>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={signup.confirmPassword}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black text-xs lg:text-base focus:outline-none"
                    placeholder="Re-enter password"
                  />
                </Field>
              </div>

              <div className="mt-4 space-y-3 rounded-2xl border-2 border-black bg-white/90 p-4">
                <label className="flex items-start gap-3 text-xs font-semibold text-[#2C2533] sm:text-sm">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={signup.acceptTerms}
                    onChange={onSignupCheckboxChange}
                    className="mt-1 h-4 w-4 rounded border-2 border-black text-[#6A4BB3] focus:ring-2 focus:ring-[#6A4BB3]"
                    data-testid="accept-terms"
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" className="underline">
                      Terms of Service
                    </Link>
                    {" "}and understand that violating the terms may lead to account suspension.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-xs font-semibold text-[#2C2533] sm:text-sm">
                  <input
                    type="checkbox"
                    name="acceptPrivacy"
                    checked={signup.acceptPrivacy}
                    onChange={onSignupCheckboxChange}
                    className="mt-1 h-4 w-4 rounded border-2 border-black text-[#6A4BB3] focus:ring-2 focus:ring-[#6A4BB3]"
                    data-testid="accept-privacy"
                  />
                  <span>
                    I acknowledge the{" "}
                    <Link href="/privacy" className="underline">
                      Privacy Policy
                    </Link>
                    {" "}and consent to SkinMatch processing my data to provide personalized skincare guidance.
                  </span>
                </label>
              </div>

              {signupError && (
                <p className="text-sm font-semibold text-red-700">{signupError}</p>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeMode("intro")}
                  className="text-sm font-semibold text-[#2C2533] hover:underline"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#BFD9EA] px-4 lg:px-7 py-1 lg:py-3 text-sm lg:text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:-translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signupLoading ? "Creating account..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "login" && (
          <div className="p-6 sm:p-8" data-testid="login-form">
            <h2 className="text-3xl font-extrabold text-[#2C2533] mb-2">Welcome back</h2>

            <form onSubmit={handleLogin} className="mt-4 space-y-6">
              <Field label="Email or Username" colSpan={2}>
                <input
                  type="text"
                  name="identifier"
                  value={login.identifier}
                  onChange={onLoginChange}
                  className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none placeholder:text-gray-600"
                  placeholder="you@example.com or yourusername"
                />
              </Field>

              <Field label="Password" colSpan={2}>
                <input
                  type="password"
                  name="password"
                  value={login.password}
                  onChange={onLoginChange}
                  className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none"
                  placeholder="••••••••"
                />
              </Field>

              {loginError && (
                <p className="text-sm font-semibold text-red-700">{loginError}</p>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeMode("intro")}
                  className="text-sm font-semibold text-[#2C2533] hover:underline"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="text-sm font-semibold text-[#6B5D83] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#BFD9EA] px-8 py-3 text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:-translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "forgot" && (
          <div className="p-6 sm:p-8" data-testid="forgot-form">
            <h2 className="text-3xl font-extrabold text-[#2C2533] mb-2">
              Reset your password
            </h2>
            <p className="text-sm text-[#2C2533]/80">
              Enter the email linked to your SkinMatch account. We&apos;ll send you a reset
              link to choose a new password.
            </p>

            <form onSubmit={handleForgotPassword} className="mt-6 space-y-6">
              <Field label="Email address" colSpan={2}>
                <input
                  type="email"
                  name="forgot-email"
                  value={forgotEmail}
                  onChange={(event) => {
                    setForgotEmail(event.target.value);
                    if (forgotStatus === "error") {
                      setForgotStatus("idle");
                      setForgotError(null);
                    }
                  }}
                  className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none placeholder:text-gray-600"
                  placeholder="you@example.com"
                  disabled={forgotStatus === "loading" || forgotStatus === "success"}
                />
              </Field>

              {forgotStatus === "success" ? (
                <p className="text-sm font-semibold text-[#166534]">
                  If an account exists for that email, we just sent instructions to reset your
                  password. Check your inbox and spam folder.
                </p>
              ) : null}

              {forgotStatus === "error" && forgotError ? (
                <p className="text-sm font-semibold text-red-700">{forgotError}</p>
              ) : null}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="text-sm font-semibold text-[#2C2533] hover:underline"
                >
                  ← Back to login
                </button>

                <button
                  type="submit"
                  disabled={forgotStatus === "loading" || forgotStatus === "success"}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#BFD9EA] px-7 py-3 text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:-translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {forgotStatus === "loading" ? "Sending..." : "Email reset link"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
  colSpan,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  colSpan?: 1 | 2;
}) {
  return (
    <div className={colSpan === 2 ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-semibold text-[#2C2533] mb-1">
        {label} {hint && <span className="font-normal text-gray-700">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.3h6.48c-.28 1.44-1.12 2.66-2.38 3.47v2.88h3.84c2.24-2.06 3.55-5.1 3.55-8.38z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.84-2.88c-1.07.72-2.45 1.15-4.11 1.15-3.16 0-5.83-2.13-6.78-5H1.26v3.05C4.23 21.53 7.83 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.22 14.35c-.24-.72-.38-1.49-.38-2.35s.14-1.63.38-2.35V6.6H1.26A11.96 11.96 0 0 0 0 12c0 1.9.45 3.69 1.26 5.4l3.96-3.05z"
      />
      <path
        fill="#EA4335"
        d="M12 4.74c1.76 0 3.34.6 4.58 1.78l3.43-3.43C17.95 1.09 15.23 0 12 0 7.83 0 4.23 2.47 1.26 6.6l3.96 3.05c.95-2.87 3.62-5 6.78-5z"
      />
    </svg>
  );
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.35l9 5.4 9-5.4V7H3zm18 10V9.32l-8.37 5.02a1 1 0 0 1-1.26 0L3 9.32V17h18z"
      />
    </svg>
  );
}
