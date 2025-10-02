"use client";

import { ReactNode, useEffect } from "react";
import { mixWithWhite, usePastelColor } from "@/lib/usePastelColor";

type PastelLayoutProps = {
  cover: string;
  children: ReactNode;
};

export default function PastelLayout({ cover, children }: PastelLayoutProps) {
  const tint = usePastelColor(cover, "#f2f2f3");
  const background = mixWithWhite(tint, 0.5);

  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = background;
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, [background]);

  return (
    <main
      className="min-h-screen pb-16"
      style={{
        backgroundColor: background,
        transition: "background-color 200ms ease",
      }}
    >
      <div className="pt-24" />
      {children}
    </main>
  );
}
