"use client";

import { useMemo } from "react";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

interface Requirement {
  met: boolean;
  text: string;
}

export function PasswordRequirements({
  password,
  className = "",
}: PasswordRequirementsProps) {
  const requirements = useMemo((): Requirement[] => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};'\\:"|,.<>\/?]/.test(password);

    return [
      { met: hasMinLength, text: "At least 8 characters" },
      { met: hasUpperCase, text: "One uppercase letter" },
      { met: hasLowerCase, text: "One lowercase letter" },
      { met: hasNumber, text: "One number" },
      { met: hasSpecialChar, text: "One special character (!@#$%^&*()_+-=[]{}|;:,.<>?)" },
    ];
  }, [password]);

  // Hide when password is empty
  if (!password) return null;

  return (
    <div
      className={`rounded-xl border-2 border-dashed border-black/80 bg-white/90 p-3 mt-2 text-xs space-y-1.5 ${className}`}
    >
      {requirements.map((req, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 transition-colors duration-200 ${
            req.met ? "text-green-700" : "text-red-600"
          }`}
        >
          <span
            className={`flex items-center justify-center w-4 h-4 flex-shrink-0 ${
              req.met ? "text-green-600" : "text-red-500"
            }`}
          >
            {req.met ? (
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
          <span className={req.met ? "font-medium" : ""}>{req.text}</span>
        </div>
      ))}
    </div>
  );
}