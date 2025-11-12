/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import "@testing-library/jest-dom";
import FactCheck from "@/app/facts/_FactCheck";
import TrendingSkincare from "@/app/facts/_TrendingSkincare";

jest.mock("next/image", () => ({
  __esModule: true,
   
  default: (props: ComponentProps<"img">) => {
    const { priority, fill, alt, ...rest } = props;
    void priority;
    void fill;
    return <img alt={alt ?? ""} {...rest} />;
  },
}));

const mockFetch = (topics: unknown) =>
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => topics,
  } as Response);

describe("FactCheck imagery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders backend-hosted images with descriptive alt text", async () => {
    mockFetch([
      {
        slug: "myth-pores",
        title: "Myth: Pores Open and Close",
        subtitle: "The truth about pores",
        section: "fact_check",
        hero_image_url: "http://backend:8000/media/factcheck/pores.jpg",
        hero_image_alt: "Skin pores closeup",
      },
      {
        slug: "myth-toothpaste",
        title: "Myth: Toothpaste for Acne",
        subtitle: "Does it really work?",
        section: "fact_check",
        hero_image_url: "http://backend:8000/media/factcheck/acne.jpg",
        hero_image_alt: "Acne treatment",
      },
    ]);

    render(<FactCheck />);

    const poresImage = await screen.findByRole("img", { name: "Skin pores closeup" });
    expect(poresImage).toHaveAttribute("src", "http://backend:8000/media/factcheck/pores.jpg");

    const acneImage = await screen.findByRole("img", { name: "Acne treatment" });
    expect(acneImage).toHaveAttribute("src", "http://backend:8000/media/factcheck/acne.jpg");
  });
});

describe("TrendingSkincare imagery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("applies fallback imagery and alt text when the API omits them", async () => {
    mockFetch([
      {
        slug: "hyaluronic-acid",
        title: "Hyaluronic Acid",
        subtitle: "Hydration hero",
        section: "trending",
        hero_image_url: "http://backend:8000/media/trending/ha.jpg",
        hero_image_alt: "Hyaluronic acid serum",
      },
      {
        slug: "niacinamide",
        title: "Niacinamide",
        subtitle: "Multi-tasker",
        section: "trending",
        hero_image_url: null,
        hero_image_alt: null,
      },
      {
        slug: "peptides",
        title: "Peptides",
        subtitle: "Anti-aging",
        section: "trending",
        hero_image_url: "http://backend:8000/media/trending/peptides.jpg",
        hero_image_alt: "Peptide serum",
      },
    ]);

    render(<TrendingSkincare />);

    const haImage = await screen.findByRole("img", { name: "Hyaluronic acid serum" });
    expect(haImage).toHaveAttribute("src", "http://backend:8000/media/trending/ha.jpg");

    const niacinamideImage = await screen.findByRole("img", { name: "Niacinamide" });
    expect(niacinamideImage?.getAttribute("src")).toContain("/img/facts_img/centella_ampoule.jpg");

    const peptidesImage = await screen.findByRole("img", { name: "Peptide serum" });
    expect(peptidesImage).toHaveAttribute("src", "http://backend:8000/media/trending/peptides.jpg");
  });
});
