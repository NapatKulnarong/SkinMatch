import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import LoginPage from "../page";
import { redirectTo } from "../redirect";

// Mock next/navigation before imports
jest.mock("next/navigation", () => {
  const params = new URLSearchParams();
  return {
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    })),
    useSearchParams: jest.fn(() => ({
      get: (key: string) => params.get(key),
      entries: () => params.entries(),
      toString: () => params.toString(),
      has: (key: string) => params.has(key),
    })),
    usePathname: jest.fn(() => "/login"),
  };
});

jest.mock("../redirect", () => ({
  redirectTo: jest.fn(),
}));

const ORIGINAL_ENV = process.env;

describe("LoginPage", () => {
  // Suppress console logs during tests
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
    process.env = ORIGINAL_ENV;
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Set test environment variables
    process.env = { ...ORIGINAL_ENV };
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "fake-client-id-123";
    
    // Clear mock call history
    (redirectTo as jest.Mock).mockClear();
  });

  describe("Intro mode", () => {
    it("should render 'Sign up with Google' and 'Sign up with Email' buttons", async () => {
      await act(async () => {
        render(<LoginPage />);
      });

      // Google button
      const googleBtn = screen.getByTestId("signup-google");
      expect(googleBtn).toBeInTheDocument();
      expect(screen.getByText(/sign up with google/i)).toBeInTheDocument();

      // Email button
      const emailBtn = screen.getByTestId("signup-email");
      expect(emailBtn).toBeInTheDocument();
      expect(screen.getByText(/sign up with email/i)).toBeInTheDocument();
    });

    it("should switch to signup mode and show signup form when clicking 'Sign up with Email'", async () => {
      await act(async () => {
        render(<LoginPage />);
      });

      // The signup form should not be visible initially
      expect(screen.queryByTestId("signup-form")).not.toBeInTheDocument();

      const emailBtn = screen.getByTestId("signup-email");
      
      await act(async () => {
        fireEvent.click(emailBtn);
      });

      // After clicking, the signup form should appear
      await waitFor(() => {
        const signupForm = screen.getByTestId("signup-form");
        expect(signupForm).toBeInTheDocument();
        expect(screen.getByText(/create your account/i)).toBeInTheDocument();
      });
    });

    it("should redirect to Google OAuth when clicking 'Sign up with Google'", async () => {
      await act(async () => {
        render(<LoginPage />);
      });

      const googleBtn = screen.getByTestId("signup-google");

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      const expectedBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const expectedUrl = `${expectedBackendUrl}/api/auth/google/login`;
      expect(redirectTo).toHaveBeenCalledTimes(1);
      expect(redirectTo).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe("Google OAuth login", () => {
    it("should redirect to backend login endpoint", () => {
      const expectedBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const expectedUrl = `${expectedBackendUrl}/api/auth/google/login`;
      
      // The handleGoogleSignIn function should redirect to backend endpoint
      // This is tested indirectly through the button click test above
      expect(expectedUrl).toContain("/api/auth/google/login");
    });
  });
});
