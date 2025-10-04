"use client";

import {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";

type NavWidthContextValue = {
  navWidth: number | null;
  setNavWidth: (width: number | null) => void;
};

const NavWidthContext = createContext<NavWidthContextValue | undefined>(undefined);

export function NavWidthProvider({ children }: PropsWithChildren) {
  const [navWidth, setNavWidthState] = useState<number | null>(null);

  const setNavWidth = useCallback((width: number | null) => {
    setNavWidthState(width);
  }, []);

  const value = useMemo(
    () => ({
      navWidth,
      setNavWidth,
    }),
    [navWidth, setNavWidth]
  );

  return <NavWidthContext.Provider value={value}>{children}</NavWidthContext.Provider>;
}

function useNavWidthContext() {
  const ctx = useContext(NavWidthContext);
  if (!ctx) throw new Error("useNavWidth must be used within a NavWidthProvider");
  return ctx;
}

export function useNavWidth() {
  return useNavWidthContext().navWidth;
}

export function useNavWidthSetter() {
  return useNavWidthContext().setNavWidth;
}
