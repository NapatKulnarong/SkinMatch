jest.mock("next/navigation", () => {
  const params = new URLSearchParams(); // no token, no error in test env

  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
    }),
    useSearchParams: () => params,
  };
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "../page";

// helper: render page and go to signup mode
function renderAtSignup() {
  const utils = render(<LoginPage />);
  // click "Sign up with Email" to switch mode to signup
  const emailBtn = screen.getByTestId("signup-email");
  fireEvent.click(emailBtn);
  return utils;
}

describe("Signup validation", () => {
  test("shows error if password is less than 8 characters", async () => {
    renderAtSignup();

    const passwordInput = screen.getByPlaceholderText("••••••••");
    const confirmInput = screen.getByPlaceholderText("Re-enter password");
    const confirmButton = screen.getByRole("button", { name: /Confirm/i });

    fireEvent.change(passwordInput, { target: { value: "short" } }); // 5 chars
    fireEvent.change(confirmInput, { target: { value: "short" } });
    fireEvent.click(confirmButton);

    expect(
      await screen.findByText(/Password must be at least 8 characters/i)
    ).toBeInTheDocument();
  });

  test("shows error if passwords do not match", async () => {
    renderAtSignup();

    const passwordInput = screen.getByPlaceholderText("••••••••");
    const confirmInput = screen.getByPlaceholderText("Re-enter password");
    const confirmButton = screen.getByRole("button", { name: /Confirm/i });

    fireEvent.change(passwordInput, { target: { value: "abcdefgh" } }); // valid length
    fireEvent.change(confirmInput, { target: { value: "abcdefgx" } }); // mismatch
    fireEvent.click(confirmButton);

    expect(
      await screen.findByText(/Passwords do not match/i)
    ).toBeInTheDocument();
  });

  test("shows error if user is younger than 13", async () => {
    const { container } = renderAtSignup();

    const dobInput = container.querySelector(
      'input[name="dob"]'
    ) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText("••••••••");
    const confirmInput = screen.getByPlaceholderText("Re-enter password");
    const confirmButton = screen.getByRole("button", { name: /Confirm/i });

    // pick a date that makes the user ~10 years old (too young)
    fireEvent.change(dobInput, { target: { value: "2015-10-25" } });
    fireEvent.change(passwordInput, { target: { value: "abcdefgh" } });
    fireEvent.change(confirmInput, { target: { value: "abcdefgh" } });
    fireEvent.click(confirmButton);

    expect(
      await screen.findByText(/You must be at least 13 years old/i)
    ).toBeInTheDocument();
  });

  test("submits without showing validation error when data is valid (password ok, dob ok, age >= 13)", async () => {
    const { container } = renderAtSignup();

    const dobInput = container.querySelector(
      'input[name="dob"]'
    ) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText("••••••••");
    const confirmInput = screen.getByPlaceholderText("Re-enter password");
    const confirmButton = screen.getByRole("button", { name: /Confirm/i });

    // set DOB ~15 years ago so user is older than 13
    fireEvent.change(dobInput, { target: { value: "2010-05-10" } });
    fireEvent.change(passwordInput, { target: { value: "abcdefgh" } });
    fireEvent.change(confirmInput, { target: { value: "abcdefgh" } });

    fireEvent.click(confirmButton);

    // we expect no validation error messages
    expect(
      screen.queryByText(/Password must be at least 8 characters/i)
    ).toBeNull();
    expect(
      screen.queryByText(/Passwords do not match/i)
    ).toBeNull();
    expect(
      screen.queryByText(/You must be at least 13 years old/i)
    ).toBeNull();
  });
});
