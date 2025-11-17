import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import LoginPage from "../page";

// Mock next/navigation before imports
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/login"),
}));

describe("LoginPage - Signup Validation", () => {
  // Suppress console logs during tests
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
  });

  // Helper: render page and navigate to signup mode
  const renderSignupForm = async () => {
    const utils = render(<LoginPage />);
    const signupEmailButton = screen.getByTestId("signup-email");
    
    await act(async () => {
      fireEvent.click(signupEmailButton);
    });
    
    return utils;
  };

  // Helper: get common form elements
  const getFormElements = () => ({
    passwordInput: screen.getByPlaceholderText("••••••••"),
    confirmInput: screen.getByPlaceholderText("Re-enter password"),
    confirmButton: screen.getByRole("button", { name: /confirm/i }),
    dobInput: document.querySelector('input[name="dob"]') as HTMLInputElement,
  });

  const setCheckboxState = async (testId: string, shouldBeChecked: boolean) => {
    const checkbox = screen.getByTestId(testId) as HTMLInputElement;
    if (!checkbox) return;
    if (checkbox.checked === shouldBeChecked) return;

    await act(async () => {
      fireEvent.click(checkbox);
    });
  };

  // Helper: fill form with valid data
  const fillValidForm = async (
    overrides?: {
      password?: string;
      confirmPassword?: string;
      dob?: string;
    },
    consentOverrides?: {
      terms?: boolean;
      privacy?: boolean;
    }
  ) => {
    const { passwordInput, confirmInput, dobInput } = getFormElements();
    
    const defaults = {
      password: "validPassword123",
      confirmPassword: "validPassword123",
      dob: "2010-05-10",
    };
    
    const values = { ...defaults, ...overrides };

    await act(async () => {
      if (dobInput) {
        fireEvent.change(dobInput, { target: { value: values.dob } });
      }
      fireEvent.change(passwordInput, { target: { value: values.password } });
      fireEvent.change(confirmInput, { target: { value: values.confirmPassword } });
    });

    const consentSettings = {
      terms: consentOverrides?.terms ?? true,
      privacy: consentOverrides?.privacy ?? true,
    };

    await setCheckboxState("accept-terms", consentSettings.terms);
    await setCheckboxState("accept-privacy", consentSettings.privacy);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Password validation", () => {
    it("should show error when password is less than 8 characters", async () => {
      await renderSignupForm();
      await fillValidForm({ password: "short", confirmPassword: "short" });

      const { confirmButton } = getFormElements();
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      await renderSignupForm();
      await fillValidForm({ 
        password: "validPassword123", 
        confirmPassword: "differentPass123" 
      });

      const { confirmButton } = getFormElements();
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/passwords do not match/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Age validation", () => {
    it("should show error when user is younger than 13 years old", async () => {
      await renderSignupForm();
      await fillValidForm({ dob: "2015-10-25" });

      const { confirmButton } = getFormElements();
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/you must be at least 13 years old/i)
        ).toBeInTheDocument();
      });
    });

    it("should accept user who is exactly 13 years old", async () => {
      await renderSignupForm();
      const thirteenYearsAgo = new Date();
      thirteenYearsAgo.setFullYear(thirteenYearsAgo.getFullYear() - 13);
      const dobString = thirteenYearsAgo.toISOString().split("T")[0];
      
      await fillValidForm({ dob: dobString });

      const { confirmButton } = getFormElements();
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/you must be at least 13 years old/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Successful submission", () => {
    it("should not show any validation errors with valid data", async () => {
      await renderSignupForm();
      await fillValidForm();

      const { confirmButton } = getFormElements();
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        const minLengthRequirement = screen.getByText(/at least 8 characters/i);
        expect(minLengthRequirement).toHaveClass("font-medium");
        expect(
          screen.queryByText(/passwords do not match/i)
        ).not.toBeInTheDocument();
        expect(
        screen.queryByText(/you must be at least 13 years old/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Consent validation", () => {
    it("should require Terms of Service acceptance", async () => {
      await renderSignupForm();
      await fillValidForm(undefined, { terms: false, privacy: true });

      const { confirmButton } = getFormElements();

      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/you must agree to the terms of service/i)
        ).toBeInTheDocument();
      });
    });

    it("should require Privacy Policy acceptance", async () => {
      await renderSignupForm();
      await fillValidForm(undefined, { terms: true, privacy: false });

      const { confirmButton } = getFormElements();

      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/you must agree to the privacy policy/i)
        ).toBeInTheDocument();
      });
    });
  });
});
});
