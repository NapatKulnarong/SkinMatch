import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import "@testing-library/jest-dom";
import SkinKnowledge from "@/app/facts/_SkinKnowledge";

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: ComponentProps<"img">) => <img {...props} />,
}));

const mockFetch = (topics: unknown) =>
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ topics }),
  } as Response);

describe("SkinKnowledge imagery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders topic images and falls back when the URL is missing", async () => {
    const fetchMock = mockFetch([
      {
        slug: "moisturizer",
        title: "Moisturizer Guide",
        subtitle: "Hydration tips",
        heroImageUrl: "http://backend:8000/media/topics/moisturizer.jpg",
        heroImageAlt: "Moisturizer bottles",
      },
      {
        slug: "cleanser",
        title: "Cleanser Basics",
        subtitle: "Clean skin",
        heroImageUrl: null,
        heroImageAlt: null,
      },
      {
        slug: "serum",
        title: "Serum Power",
        subtitle: "Active ingredients",
        heroImageUrl: "http://backend:8000/media/topics/serum.jpg",
        heroImageAlt: "Serum bottles",
      },
    ]);

    render(<SkinKnowledge />);

    const moisturizerImage = await screen.findByRole("img", { name: "Moisturizer bottles" });
    expect(moisturizerImage).toHaveAttribute("src", "http://backend:8000/media/topics/moisturizer.jpg");

    const fallbackImage = await screen.findByRole("img", { name: "Cleanser Basics" });
    expect(fallbackImage?.getAttribute("src")).toContain("/img/facts_img/green_tea.jpg");

    const serumImage = await screen.findByRole("img", { name: "Serum bottles" });
    expect(serumImage).toHaveAttribute("src", "http://backend:8000/media/topics/serum.jpg");

    expect(fetchMock).toHaveBeenCalled();
  });

  it("keeps consistent styling irrespective of fallback usage", async () => {
    mockFetch([
      {
        slug: "topic-1",
        title: "Topic 1",
        subtitle: "First topic",
        heroImageUrl: null,
        heroImageAlt: null,
      },
      {
        slug: "topic-2",
        title: "Topic 2",
        subtitle: "Second topic",
        heroImageUrl: "http://backend:8000/media/topics/topic-2.jpg",
        heroImageAlt: "Topic 2 hero",
      },
    ]);

    render(<SkinKnowledge />);

    const images = await screen.findAllByRole("img");
    expect(images).toHaveLength(2);
    images.forEach((img) => {
      expect(img.className).toContain("object-cover");
    });
  });
});
