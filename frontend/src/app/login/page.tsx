// frontend/src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchProfile, login as loginRequest, signup as signupRequest } from "@/lib/api.auth";
import { clearSession, saveProfile, setAuthToken } from "@/lib/auth-storage";

type Mode = "intro" | "signup" | "login";

type SignupState = {
  name: string;
  surname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  dob: string;
  gender: string;
};

type LoginState = {
  email: string;
  password: string;
};

const initialSignup: SignupState = {
  name: "",
  surname: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  dob: "",
  gender: "",
};

const initialLogin: LoginState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("intro");
  const [signup, setSignup] = useState<SignupState>(initialSignup);
  const [login, setLogin] = useState<LoginState>(initialLogin);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const changeMode = (next: Mode) => {
    setMode(next);
    setSignupError(null);
    setLoginError(null);
  };

  const handleGoogleSignup = () => {
    alert("Google sign up coming soon!");
  };

  const onSignupChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSignup((prev) => ({ ...prev, [name]: value }));
  };

  const onLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLogin((prev) => ({ ...prev, [name]: value }));
  };

 const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSignupError(null);

    if (signup.password.length < 8) {
      setSignupError("Password must be at least 8 characters.");
      return;
    }
    if (signup.password !== signup.confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    let formattedDob: string | undefined;
    if (signup.dob) {
      const isoMatch = signup.dob.match(/^\d{4}-\d{2}-\d{2}$/);
      const slashMatch = signup.dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

      if (isoMatch) {
        formattedDob = signup.dob;
      } else if (slashMatch) {
        // convert DD/MM/YYYY -> YYYY-MM-DD
        const [, day, month, year] = slashMatch;
        formattedDob = `${year}-${month}-${day}`;
      } else {
        setSignupError("Date of birth must be in YYYY-MM-DD format.");
        return;
      }
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
      });

      const loginResponse = await loginRequest({
        email: signup.email.trim().toLowerCase(),
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
      const loginResponse = await loginRequest({
        email: login.email.trim().toLowerCase(),
        password: login.password,
      });
      const token = loginResponse.token!;
      setAuthToken(token);

      try {
        const profile = await fetchProfile(token);
        saveProfile(profile);
      } catch (profileError) {
        console.warn("Unable to load profile", profileError);
      }

      router.push("/account");
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
    <main className="min-h-screen bg-[#D7CFE6] flex items-center justify-center px-4">
      <div
        className={[
          "w-[540px] rounded-3xl border-2 border-black overflow-hidden",
          "shadow-[6px_8px_0_rgba(0,0,0,0.35)]",
          cardBg,
        ].join(" ")}
      >
        {mode === "intro" && (
          <>
            <div className="p-8">
              <h2 className="text-3xl font-extrabold text-[#3B2F4A]">
                Join our <span className="text-[#3B2F4A]">MatchClub</span>
              </h2>

              <ul className="mt-6 text-[15.5px] text-gray-700 font-semibold">
                <li className="py-3.5 flex gap-3 items-start border-b border-black/10 whitespace-nowrap">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Save your match result</span>
                </li>
                <li className="py-3.5 flex gap-3 items-start border-b border-black/10 whitespace-nowrap">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Read &amp; write reviews on your product matches</span>
                </li>
                <li className="py-3.5 flex gap-3 items-start border-b border-black/10 whitespace-nowrap">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Be the first to get updates about the skincare industry</span>
                </li>
                <li className="py-3.5 flex gap-3 items-start whitespace-nowrap">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
                  <span>Product discount alerts</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#B6A6D8] p-6">
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full inline-flex items-center justify-center gap-3 rounded-[10px] border-2 border-black bg-white px-6 py-4 text-lg font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
              >
                <GoogleIcon className="block h-5 w-5 flex-shrink-0" />
                <span className="leading-none">Sign up with Google</span>
              </button>

              <button
                type="button"
                onClick={() => changeMode("signup")}
                className="mt-4 w-full inline-flex items-center justify-center gap-3 rounded-[10px] border-2 border-black bg-white px-6 py-4 text-lg font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
              >
                <MailIcon className="block h-6 w-6 flex-shrink-0" />
                <span className="leading-none">Sign up with Email</span>
              </button>

              <p className="mt-6 text-center text-sm text-gray-800">
                Already have an account?{" "}
                <button
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
          <div className="p-8">
            <h2 className="text-3xl font-extrabold text-[#2C2533] mb-2">
              Create your account
            </h2>

            <form onSubmit={handleSignup} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <input
                    name="name"
                    value={signup.name}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none placeholder:text-gray-600"
                    placeholder="Your name"
                  />
                </Field>

                <Field label="Surname">
                  <input
                    name="surname"
                    value={signup.surname}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none placeholder:text-gray-600"
                    placeholder="Your surname"
                  />
                </Field>

                <Field label="Date of birth">
                  <input
                    type="date"
                    name="dob"
                    value={signup.dob}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none placeholder:text-gray-600"
                  />
                </Field>

                <Field label="Gender">
                  <select
                    name="gender"
                    value={signup.gender}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none text-gray-800"
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
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none placeholder:text-gray-600"
                    placeholder="Pick a username"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    value={signup.email}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none placeholder:text-gray-600"
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Password" hint="(at least 8 characters)" colSpan={2}>
                  <input
                    type="password"
                    name="password"
                    value={signup.password}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none"
                    placeholder="••••••••"
                  />
                </Field>

                <Field label="Confirm Password" colSpan={2}>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={signup.confirmPassword}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none"
                    placeholder="Re-enter password"
                  />
                </Field>
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
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#BFD9EA] px-7 py-3 text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:-translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signupLoading ? "Creating account..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "login" && (
          <div className="p-8">
            <h2 className="text-3xl font-extrabold text-[#2C2533] mb-2">Welcome back</h2>

            <form onSubmit={handleLogin} className="mt-4 space-y-6">
              <Field label="Email" colSpan={2}>
                <input
                  type="email"
                  name="email"
                  value={login.email}
                  onChange={onLoginChange}
                  className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 text-black focus:outline-none placeholder:text-gray-600"
                  placeholder="you@example.com"
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
                  onClick={() => alert("Password reset flow coming soon!")}
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
