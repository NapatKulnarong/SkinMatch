"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import clsx from "clsx";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  revealLabel?: string;
  hideLabel?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, revealLabel = "Show password", hideLabel = "Hide password", ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => {
    setVisible((prev) => !prev);
  };

  return (
    <div className="relative flex items-center gap-1">
      <input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={clsx("pr-11", className)}
      />
      <button
        type="button"
        onClick={toggleVisibility}
        className="flex items-center justify-center rounded-full border border-transparent px-2 text-xs font-semibold text-[#2C2533] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6DB1]"
        aria-label={visible ? hideLabel : revealLabel}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeSlashIcon className="h-5 w-5 text-[#2C2533]" />
        ) : (
          <EyeIcon className="h-5 w-5 text-[#2C2533]" />
        )}
      </button>
    </div>
  );
});
