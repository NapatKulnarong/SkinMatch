"use client";

import { useState } from "react";

type Mode = "intro" | "signup" | "login";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("intro");

  /* ----------------------------- Signup state ----------------------------- */
  const [signup, setSignup] = useState({
    name: "",
    surname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    gender: "",
  });

  /* ------------------------------ Login state ----------------------------- */
  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const onSignupChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSignup((f) => ({ ...f, [name]: value }));
  };

  const onLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLogin((f) => ({ ...f, [name]: value }));
  };

  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (signup.password.length < 8)
      return alert("Password must be at least 8 characters.");
    if (signup.password !== signup.confirmPassword)
      return alert("Passwords do not match.");
    console.log("📝 SIGNUP payload:", signup);
    alert("✅ Sign up submitted (check console).");
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔐 LOGIN payload:", login);
    alert("✅ Login submitted (check console).");
  };

  // Swap the card background here so the rounded corners stay perfect.
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
                onClick={() => setMode("signup")}
                className="mt-1 w-full inline-flex items-center justify-center gap-3
                           rounded-[10px] border-2 border-black bg-white px-6 py-4 text-lg 
                           font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all 
                           duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] 
                           active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] 
                           focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
              >
                <span>Sign up</span>
              </button>

              <p className="mt-6 text-center text-sm text-gray-800">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
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

            <form onSubmit={submitSignup} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <input
                    name="name"
                    value={signup.name}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none placeholder:text-gray-600"
                    placeholder="Your name"
                  />
                </Field>

                <Field label="Surname">
                  <input
                    name="surname"
                    value={signup.surname}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none placeholder:text-gray-600"
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
                    placeholder="dd/mm/yyyy"
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
                    <option value="na">Prefer not to say</option>
                  </select>
                </Field>

                <Field label="Username">
                  <input
                    name="username"
                    value={signup.username}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none placeholder:text-gray-600"
                    placeholder="Pick a username"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    value={signup.email}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none placeholder:text-gray-600"
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Password" hint="(at least 8 characters)" colSpan={2}>
                  <input
                    type="password"
                    name="password"
                    value={signup.password}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none"
                    placeholder="••••••••"
                  />
                </Field>

                <Field label="Confirm Password" colSpan={2}>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={signup.confirmPassword}
                    onChange={onSignupChange}
                    className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none"
                    placeholder="Re-enter password"
                  />
                </Field>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode("intro")}
                  className="text-sm font-semibold text-[#2C2533] hover:underline"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#BFD9EA] px-7 py-3 text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "login" && (
          <div className="p-8">
            <h2 className="text-3xl font-extrabold text-[#2C2533] mb-2">
              Welcome back
            </h2>

            <form onSubmit={submitLogin} className="mt-4 space-y-6">
              <Field label="Email" colSpan={2}>
                <input
                  type="email"
                  name="email"
                  value={login.email}
                  onChange={onLoginChange}
                  className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none placeholder:text-gray-600"
                  placeholder="you@example.com"
                />
              </Field>

              <Field label="Password" colSpan={2}>
                <input
                  type="password"
                  name="password"
                  value={login.password}
                  onChange={onLoginChange}
                  className="w-full rounded-[8px] border-2 border-black bg-white px-3 py-2 focus:outline-none"
                  placeholder="••••••••"
                />
              </Field>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode("intro")}
                  className="text-sm font-semibold text-[#2C2533] hover:underline"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={() => alert("Pretend we start a reset flow 🙂")}
                  className="text-sm font-semibold text-[#6B5D83] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-[#BFD9EA] px-8 py-3 text-base font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

/* -------------------------------- Helpers -------------------------------- */

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