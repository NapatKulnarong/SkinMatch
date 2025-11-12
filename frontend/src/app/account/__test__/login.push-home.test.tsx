/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

// Mock router
const push = jest.fn();
jest.mock("next/navigation", () => {
  const actual = jest.requireActual("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push }),
    useSearchParams: () => ({
      // no callbackUrl -> default should be "/"
      get: () => null,
    }),
  };
});

import LoginPage from "@/app/login/page";

describe("LoginPage navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits and navigates to '/' (new default)", async () => {
    (signIn as jest.Mock).mockResolvedValue({ ok: true });

    render(<LoginPage />);
    const btn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/");
    });
  });
});
