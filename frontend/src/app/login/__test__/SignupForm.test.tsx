import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import LoginPage, { buildGoogleAuthUrl } from "../page";
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

      const expectedUrl = buildGoogleAuthUrl("fake-client-id-123");
      expect(redirectTo).toHaveBeenCalledTimes(1);
      expect(redirectTo).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe("buildGoogleAuthUrl helper", () => {
    it("should generate correct Google OAuth URL with all required parameters", () => {
      const clientId = "abc123";
      const url = buildGoogleAuthUrl(clientId);

      // Check base URL
      expect(url).toMatch(
        /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/
      );

      // Check required parameters
      expect(url).toContain(`client_id=${clientId}`);
      expect(url).toContain(
        encodeURIComponent("http://localhost:8000/api/auth/google/callback")
      );
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=");
      expect(url).toContain(encodeURIComponent("email profile"));
      expect(url).toContain("prompt=consent");
    });

    it("should handle different client IDs correctly", () => {
      const clientId1 = "client-id-1";
      const clientId2 = "client-id-2";

      const url1 = buildGoogleAuthUrl(clientId1);
      const url2 = buildGoogleAuthUrl(clientId2);

      expect(url1).toContain(`client_id=${clientId1}`);
      expect(url2).toContain(`client_id=${clientId2}`);
      expect(url1).not.toEqual(url2);
    });
  });
});
