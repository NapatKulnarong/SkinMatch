import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  color?: "orange" | "green" | "blue" | "white";
  flat?: boolean; // new prop: if true, remove border & shadow
};

export default function Button({ children, color = "white", flat = false }: ButtonProps) {
  // base style shared by all buttons
  const base =
    "h-9 px-4 flex items-center justify-center rounded-full font-semibold text-sm transition";

  // add border + shadow only if flat=false
  const withBorder = "border-2 border-gray-400 shadow-[2px_3px_0px_rgba(0,0,0,0.3)]";

  // color variants
  const variants: Record<string, string> = {
    orange: "bg-[#F4B35E] text-black",
    green: "bg-[#8FD06F] text-black",
    blue: "bg-[#78A9E3] text-black",
    white: "bg-white text-black",
  };

  return (
    <button className={`${base} ${variants[color]} ${flat ? "" : withBorder}`}>
      {children}
    </button>
  );
}