/**
 * @jest-environment jsdom
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { act } from "react";

import LoginPage from "../page";
import * as RedirectModule from "../redirect";

jest.mock("../redirect", () => ({
  redirectTo: jest.fn(),
}));

const mockRedirectTo = RedirectModule.redirectTo as jest.Mock;

// -----------------------------------------------------------------------------
// API + storage mocks
// -----------------------------------------------------------------------------
import {
  login as loginRequest,
  fetchProfile,
  createAdminSession,
} from "@/lib/api.auth";

import {
  saveProfile,
  setAuthToken,
} from "@/lib/auth-storage";

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

// -----------------------------------------------------------------------------
// Router / next/navigation mocks
// -----------------------------------------------------------------------------
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSearchParamsGet = jest.fn();
const mockSearchParamsEntries = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: mockSearchParamsGet,
    entries: mockSearchParamsEntries,
    toString: jest.fn(() => ""),
    has: jest.fn(() => false),
  })),
  usePathname: jest.fn(() => "/login"),
}));

describe("Admin Login Flow", () => {
  // simulated browser URL (manually updated via redirect mock)
  let locationHrefValue = "http://localhost/";

  // keep console originals so eslint doesn't hate us
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;

  // ---------------------------------------------------------------------------
  // Global setup
  // ---------------------------------------------------------------------------
  beforeAll(() => {
    // store original console fns
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    // silence console during tests
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
  });

  afterAll(() => {
    // restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  // ---------------------------------------------------------------------------
  // Per-test reset
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    jest.clearAllMocks();

    (loginRequest as jest.Mock).mockReset();
    (fetchProfile as jest.Mock).mockReset();
    (createAdminSession as jest.Mock).mockReset();
    (saveProfile as jest.Mock).mockReset();
    (setAuthToken as jest.Mock).mockReset();
    mockRedirectTo.mockReset();
    mockSearchParamsGet.mockReset();
    mockSearchParamsEntries.mockReset();

    mockRedirectTo.mockImplementation((url: string) => {
      locationHrefValue = url;
    });

    mockSearchParamsGet.mockReturnValue(null);
    mockSearchParamsEntries.mockReturnValue([]);

    // reset simulated URL before each test
    locationHrefValue = "http://localhost/";
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // render page and switch UI to "login mode"
  const navigateToLoginForm = async () => {
    await act(async () => {
      render(<LoginPage />);
    });

    const goLoginBtn = await screen.findByTestId("go-login");

    await act(async () => {
      fireEvent.click(goLoginBtn);
    });

    // ensure login form is visible
    await screen.findByTestId("login-form");
    mockPush.mockClear();
    mockReplace.mockClear();
  };

  // fill form + click Login
  const fillAndSubmitLoginForm = async (
    identifier: string,
    password: string
  ) => {
    const identifierInput = screen.getByPlaceholderText(
      /you@example\.com or yourusername/i
    );
    const passwordInput = screen.getByPlaceholderText("••••••••");

    await act(async () => {
      fireEvent.change(identifierInput, { target: { value: identifier } });
      fireEvent.change(passwordInput, { target: { value: password } });
    });

    const loginButton = screen.getByRole("button", { name: /^login$/i });

    await act(async () => {
      fireEvent.click(loginButton);
    });
  };

  // ---------------------------------------------------------------------------
  // Normal user flow
  // ---------------------------------------------------------------------------
  describe("Normal user flow", () => {
    it("should redirect normal user to /account after successful login", async () => {
      // Mock backend login returning token
      (loginRequest as jest.Mock).mockResolvedValue({
        ok: true,
        message: "Login successful",
        token: "user-token",
      });

      // Profile shows non-admin user
      (fetchProfile as jest.Mock).mockResolvedValue({
        id: 1,
        username: "user",
        is_staff: false,
      });

      await navigateToLoginForm();
      await fillAndSubmitLoginForm("user@example.com", "password123");

      // verify calls
      await waitFor(() => {
        expect(loginRequest).toHaveBeenCalledWith({
          identifier: "user@example.com",
          password: "password123",
        });
      });

      await waitFor(() => {
        expect(setAuthToken).toHaveBeenCalledWith("user-token");
        expect(fetchProfile).toHaveBeenCalledWith("user-token");
        expect(saveProfile).toHaveBeenCalledWith({
          id: 1,
          username: "user",
          is_staff: false,
        });
      });

      // should navigate via router.push("/account"), not full page reload
      await waitFor(() => {
        expect(createAdminSession).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/account");
      });

      // simulated browser URL should remain unchanged
      expect(locationHrefValue).toBe("http://localhost/");
    });
  });

  // ---------------------------------------------------------------------------
  // Admin user flow
  // ---------------------------------------------------------------------------
  describe("Admin user flow", () => {
    it("should redirect admin user to /admin/ after successful login", async () => {
      (loginRequest as jest.Mock).mockResolvedValue({
        ok: true,
        message: "Login successful",
        token: "admin-token",
      });

      (fetchProfile as jest.Mock).mockResolvedValue({
        id: 99,
        username: "admin",
        is_staff: true,
      });

      const expectedBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      (createAdminSession as jest.Mock).mockResolvedValue({
        ok: true,
        message: "Admin session available",
        redirect_url: `${expectedBackendUrl}/admin/`,
      });

      await navigateToLoginForm();
      await fillAndSubmitLoginForm("admin@example.com", "supersecret");

      await waitFor(() => {
        expect(loginRequest).toHaveBeenCalledWith({
          identifier: "admin@example.com",
          password: "supersecret",
        });
        expect(fetchProfile).toHaveBeenCalledWith("admin-token");
        expect(saveProfile).toHaveBeenCalledWith({
          id: 99,
          username: "admin",
          is_staff: true,
        });
        expect(createAdminSession).toHaveBeenCalledWith("admin-token", {
          id: 99,
          username: "admin",
          is_staff: true,
        });
      });

      const adminSessionResult = await createAdminSession.mock.results[0].value;
      const expectedBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      expect(adminSessionResult).toEqual({
        ok: true,
        message: "Admin session available",
        redirect_url: `${expectedBackendUrl}/admin/`,
      });

      await waitFor(() => {
        expect(
          screen.queryByText(
            /unable to start admin session\. please try again\./i
          )
        ).toBeNull();
      });

      // now check redirect logic
      const expectedBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockRedirectTo).toHaveBeenCalledWith(
          `${expectedBackendUrl}/admin/`
        );
      });
      expect(locationHrefValue).toBe(`${expectedBackendUrl}/admin/`);
    });

    it("should show error when admin session creation fails", async () => {
      (loginRequest as jest.Mock).mockResolvedValue({
        ok: true,
        message: "Login successful",
        token: "admin-token",
      });

      (fetchProfile as jest.Mock).mockResolvedValue({
        id: 99,
        username: "admin",
        is_staff: true,
      });

      // createAdminSession throws
      (createAdminSession as jest.Mock).mockImplementation(() => {
        throw new Error("User does not have staff privileges");
      });

      await navigateToLoginForm();
      await fillAndSubmitLoginForm("admin@example.com", "supersecret");

      // we expect an error message rendered to UI
      const errorMessage = await screen.findByText(
        /unable to start admin session\. please try again\./i
      );
      expect(errorMessage).toBeInTheDocument();

      // no redirect should have happened
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
        expect(locationHrefValue).toBe("http://localhost/");
        expect(mockRedirectTo).not.toHaveBeenCalled();
      });
    });

    it("should handle admin session creation with unexpected response format", async () => {
      (loginRequest as jest.Mock).mockResolvedValue({
        ok: true,
        message: "Login successful",
        token: "admin-token",
      });

      (fetchProfile as jest.Mock).mockResolvedValue({
        id: 99,
        username: "admin",
        is_staff: true,
      });

      // createAdminSession returns bad shape (no redirect_url)
      (createAdminSession as jest.Mock).mockResolvedValue({
        ok: false,
        message: "Session creation failed",
      });

      await navigateToLoginForm();
      await fillAndSubmitLoginForm("admin@example.com", "supersecret");

      // should have attempted to create admin session
      await waitFor(() => {
        expect(createAdminSession).toHaveBeenCalled();
      });

      const adminSessionError = await screen.findByText(
        /unable to start admin session\. please try again\./i
      );
      expect(adminSessionError).toBeInTheDocument();

      // but since no redirect_url, we expect NO navigation
      expect(locationHrefValue).toBe("http://localhost/");
      expect(mockRedirectTo).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe("Error handling", () => {
    it("should not navigate when login API fails", async () => {
      (loginRequest as jest.Mock).mockResolvedValue({
        ok: false,
        message: "Invalid credentials",
        error: "Invalid credentials",
      });

      await navigateToLoginForm();
      await fillAndSubmitLoginForm("user@example.com", "wrongpassword");

      await waitFor(() => {
        expect(loginRequest).toHaveBeenCalled();
      });

      // no navigation occurred
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockRedirectTo).not.toHaveBeenCalled();
      expect(locationHrefValue).toBe("http://localhost/");
    });
  });
});
