/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import AskExpertCTA from "@/app/facts/_AskExpertCTA";

jest.mock("@/components/NewsletterSignup", () => ({
  __esModule: true,
  default: () => <div data-testid="newsletter-signup" />,
}));

describe("AskExpertCTA myth submission", () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it("shows an error when the textarea is empty", async () => {
    render(<AskExpertCTA />);

    const submitButton = screen.getByRole("button", { name: /suggest a myth/i });
    await userEvent.click(submitButton);

    expect(
      await screen.findByText(/share a myth or question so we know what to investigate/i)
    ).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("opens mailto with encoded body when a myth is submitted", async () => {
    render(<AskExpertCTA />);

    const textarea = screen.getByPlaceholderText(/is slugging safe/i);
    await userEvent.type(textarea, "Is slugging safe if I use retinaldehyde?");

    const submitButton = screen.getByRole("button", { name: /suggest a myth/i });
    await userEvent.click(submitButton);

    expect(
      await screen.findByText(/opening your email app so you can send the myth/i)
    ).toBeInTheDocument();

    const [calledHref, target] = openSpy.mock.calls[0] as [string, string];
    expect(calledHref).toContain("mailto:hello@skinmatch.co");
    expect(calledHref).toContain(encodeURIComponent("Is slugging safe if I use retinaldehyde?"));
    expect(target).toBe("_self");
  });
});
