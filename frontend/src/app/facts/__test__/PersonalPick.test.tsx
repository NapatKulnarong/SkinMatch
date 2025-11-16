/* eslint-disable @next/next/no-img-element */
import React from "react";
import type { ComponentProps } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

import RecommendedForYou from "../_RecommendedForYou";
import { QUIZ_COMPLETED_EVENT } from "@/app/quiz/_QuizContext";

const MockImage = (props: ComponentProps<"img">) => {
  const { unoptimized, priority, fill, ...rest } = props;
  void unoptimized;
  void priority;
  void fill;
  return <img alt={props.alt ?? ""} {...rest} />;
};
MockImage.displayName = "MockNextImage";

jest.mock("next/image", () => ({
  __esModule: true,
  default: MockImage,
}));

const mockFetchRecommendedTopics = jest.fn();
const mockFetchTopicsBySection = jest.fn();
const mockFetchPopularTopics = jest.fn();

jest.mock("@/lib/api.facts", () => ({
  __esModule: true,
  fetchRecommendedTopics: (...args: unknown[]) =>
    mockFetchRecommendedTopics(...args),
  fetchTopicsBySection: (...args: unknown[]) =>
    mockFetchTopicsBySection(...args),
  fetchPopularTopics: (...args: unknown[]) => mockFetchPopularTopics(...args),
}));

describe("RecommendedForYou personal picks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refreshes picks after quiz completion based on skin type", async () => {
    const makeTopic = (id: string, title: string) => ({
      id,
      slug: id,
      title,
      subtitle: null,
      excerpt: null,
      section: "knowledge" as const,
      heroImageUrl: null,
      heroImageAlt: null,
      viewCount: 0,
    });
    mockFetchRecommendedTopics
      .mockResolvedValueOnce([
        makeTopic("dry-basics", "Hydration Basics"),
        makeTopic("redness", "Soothe Redness"),
      ])
      .mockResolvedValueOnce([
        makeTopic("oily-ingredients", "Best Ingredients for Oily Skin"),
        makeTopic("shine-control", "Shine Control Routine"),
      ]);
    mockFetchTopicsBySection.mockResolvedValue([]);
    mockFetchPopularTopics.mockResolvedValue([]);

    render(<RecommendedForYou />);

    expect(await screen.findByText("Hydration Basics")).toBeInTheDocument();
    expect(screen.getByText("Soothe Redness")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(QUIZ_COMPLETED_EVENT, {
          detail: { sessionId: "session-abc" },
        })
      );
    });

    await waitFor(() => {
      expect(mockFetchRecommendedTopics).toHaveBeenCalledTimes(2);
    });
    expect(mockFetchRecommendedTopics.mock.calls[1]).toEqual([4, "session-abc"]);

    expect(await screen.findByText("Best Ingredients for Oily Skin")).toBeInTheDocument();
    expect(screen.getByText("Shine Control Routine")).toBeInTheDocument();

    expect(screen.queryByText("Hydration Basics")).not.toBeInTheDocument();
    expect(screen.queryByText("Soothe Redness")).not.toBeInTheDocument();

    expect(screen.getByText(/Personal Picks/i)).toBeInTheDocument();
  });
});
