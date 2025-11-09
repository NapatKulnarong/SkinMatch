"use client";

import { useMemo } from "react";

interface PasswordRequirementsProps {
  password: string;
  showAll?: boolean;
  className?: string;
}

interface Requirement {
  met: boolean;
  text: string;
}

export function PasswordRequirements({
  password,
  showAll = false,
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

  // Only show requirements if password is not empty or if showAll is true
  if (!password && !showAll) {
    return null;
  }

  // If showAll is false, only show unmet requirements
  const displayRequirements = showAll
    ? requirements
    : requirements.filter((req) => !req.met);

  if (displayRequirements.length === 0 && !showAll) {
    return null;
  }

  return (
    <div className={`text-xs space-y-1 ${className}`}>
      {displayRequirements.map((req, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 ${
            req.met ? "text-green-700" : "text-gray-600"
          }`}
        >
          <span className={req.met ? "text-green-600" : "text-gray-400"}>
            {req.met ? "✓" : "○"}
          </span>
          <span>{req.text}</span>
        </div>
      ))}
    </div>
  );
}

