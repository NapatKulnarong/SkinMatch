import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import "@testing-library/jest-dom";
import FactCheck from "@/app/facts/_FactCheck";
import TrendingSkincare from "@/app/facts/_TrendingSkincare";

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
        heroImageUrl: "http://backend:8000/media/factcheck/pores.jpg",
        heroImageAlt: "Skin pores closeup",
      },
      {
        slug: "myth-toothpaste",
        title: "Myth: Toothpaste for Acne",
        subtitle: "Does it really work?",
        heroImageUrl: "http://backend:8000/media/factcheck/acne.jpg",
        heroImageAlt: "Acne treatment",
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
        heroImageUrl: "http://backend:8000/media/trending/ha.jpg",
        heroImageAlt: "Hyaluronic acid serum",
      },
      {
        slug: "niacinamide",
        title: "Niacinamide",
        subtitle: "Multi-tasker",
        heroImageUrl: null,
        heroImageAlt: null,
      },
      {
        slug: "peptides",
        title: "Peptides",
        subtitle: "Anti-aging",
        heroImageUrl: "http://backend:8000/media/trending/peptides.jpg",
        heroImageAlt: "Peptide serum",
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
