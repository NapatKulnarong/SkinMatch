// frontend/src/app/account/__tests__/WishlistPanel.test.tsx
/* eslint-disable @next/next/no-img-element */
import React from "react";
import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { WishlistPanel } from "../page";

// Mock next/image as a normal <img> so it doesn't break in Jest
jest.mock("next/image", () => ({
  __esModule: true,
  default: (() => {
    const Mock = (props: ComponentProps<"img">) => {
      const { unoptimized, priority, fill, ...rest } = props;
      void unoptimized;
      void priority;
      void fill;
      return <img alt={props.alt ?? ""} {...rest} />;
    };
    Mock.displayName = "MockNextImage";
    return Mock;
  })(),
}));

// Mock the wishlist API module that the component dynamically imports
const mockFetchWishlist = jest.fn();

jest.mock("@/lib/api.wishlist", () => ({
  __esModule: true,
  fetchWishlist: (...args: unknown[]) => mockFetchWishlist(...args),
  removeFromWishlist: jest.fn(),
}));

describe("WishlistPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state, then renders wishlist items", async () => {
    mockFetchWishlist.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Gentle Cleanser",
        brand: "SkinMatch",
        image: "/img/cleanser.jpg",
        price: 399,
        currency: "THB",
        productUrl: "https://example.com/p1",
        category: "cleanser",
      },
    ]);

    render(<WishlistPanel token="test-token" />);

    // Initially shows loading
    expect(
      screen.getByText(/Loading your wishlist…/i)
    ).toBeInTheDocument();

    // Then renders the product details
    expect(
      await screen.findByText("Gentle Cleanser")
    ).toBeInTheDocument();
    expect(screen.getByText("SkinMatch")).toBeInTheDocument();
    expect(screen.getByText(/THB 399.00/)).toBeInTheDocument();

    // Details button should exist
    expect(
      screen.getByRole("button", { name: /Details/i })
    ).toBeInTheDocument();
  });

  it("shows empty state when wishlist is empty", async () => {
    mockFetchWishlist.mockResolvedValueOnce([]);

    render(<WishlistPanel token="test-token" />);

    // Wait until loading disappears
    await waitFor(() =>
      expect(
        screen.queryByText(/Loading your wishlist…/i)
      ).not.toBeInTheDocument()
    );

    // Empty state message
    expect(
      screen.getByText("Save your favorite products here.")
    ).toBeInTheDocument();

    // Edit button in header
    expect(
      screen.getByRole("button", { name: /Edit/i })
    ).toBeInTheDocument();
  });

  it("shows sign-in message when there is no token", () => {
    render(<WishlistPanel token={null} />);

    expect(
      screen.getByText("Sign in to view your wishlist.")
    ).toBeInTheDocument();
  });
});
