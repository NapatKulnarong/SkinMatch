/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";

jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));

const push = jest.fn();
jest.mock("next/navigation", () => {
  const actual = jest.requireActual("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push }),
    useSearchParams: () => ({
      get: (k: string) => (k === "from" ? "update-pref" : null),
    }),
  };
});

import LoginPage from "@/app/login/page";

describe("LoginPage preserves 'from' flag but ignores for redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("stores ?from=update-pref in sessionStorage and still pushes '/'", async () => {
    (signIn as jest.Mock).mockResolvedValue({ ok: true });

    render(<LoginPage />);
    const btn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(sessionStorage.getItem("login_from")).toBe("update-pref");
      expect(push).toHaveBeenCalledWith("/"); // not /account
    });
  });
});
