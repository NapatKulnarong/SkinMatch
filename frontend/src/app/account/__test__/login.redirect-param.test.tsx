/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import {
  login as loginRequest,
  fetchProfile,
  createAdminSession,
} from "@/lib/api.auth";
import { clearSession, saveProfile, setAuthToken } from "@/lib/auth-storage";

jest.mock("@/lib/api.auth", () => ({
  login: jest.fn(),
  fetchProfile: jest.fn(),
  createAdminSession: jest.fn(),
  signup: jest.fn(),
}));

jest.mock("@/lib/auth-storage", () => ({
  clearSession: jest.fn(),
  saveProfile: jest.fn(),
  setAuthToken: jest.fn(),
}));

const push = jest.fn();
jest.mock("next/navigation", () => {
  const actual = jest.requireActual("next/navigation");
  const params = new URLSearchParams();
  params.set("redirect", "/wishlist");
  return {
    ...actual,
    useRouter: () => ({ push }),
    useSearchParams: () => ({
      get: (k: string) => params.get(k),
      entries: () => params.entries(),
      toString: () => params.toString(),
      has: (k: string) => params.has(k),
    }),
  };
});

import LoginPage from "@/app/login/page";

describe("LoginPage redirect param handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (loginRequest as jest.Mock).mockReset();
    (fetchProfile as jest.Mock).mockReset();
    (createAdminSession as jest.Mock).mockReset();
    (saveProfile as jest.Mock).mockReset();
    (setAuthToken as jest.Mock).mockReset();
    (clearSession as jest.Mock).mockReset();
  });

  it("pushes redirect param when present", async () => {
    (loginRequest as jest.Mock).mockResolvedValue({
      ok: true,
      message: "Login successful",
      token: "user-token",
    });
    (fetchProfile as jest.Mock).mockResolvedValue({
      id: 1,
      username: "user",
      is_staff: false,
    });

    render(<LoginPage />);
    const goLoginBtn = await screen.findByTestId("go-login");
    fireEvent.click(goLoginBtn);
    push.mockClear();

    const loginBtn = await screen.findByRole("button", { name: /^login$/i });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/wishlist");
    });
    expect(loginRequest).toHaveBeenCalled();
    expect(setAuthToken).toHaveBeenCalledWith("user-token");
    expect(fetchProfile).toHaveBeenCalledWith("user-token");
    expect(saveProfile).toHaveBeenCalled();
    expect(createAdminSession).not.toHaveBeenCalled();
  });
});
