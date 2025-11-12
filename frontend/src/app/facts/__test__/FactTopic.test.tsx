/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import type { ComponentProps, PropsWithChildren } from "react";
import "@testing-library/jest-dom";
import PastelHero from "@/app/facts/_PastelHero";
import ArticleBlock from "@/components/facts/ArticleBlock";
import FactTopicPage from "@/app/facts/[slug]/page";
import type { FactContentBlock, FactTopicDetail, FactTopicSummary } from "@/lib/types";
import { fetchFactTopicDetail, fetchTopicsBySection } from "@/lib/api.facts";

jest.mock("@/lib/api.facts");
jest.mock("next/image", () => ({
  __esModule: true,
   
  default: (props: ComponentProps<"img">) => {
    const { priority, fill, alt, ...rest } = props;
    void priority;
    void fill;
    return <img alt={alt ?? ""} {...rest} />;
  },
}));
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const mockedFetchDetail = fetchFactTopicDetail as jest.MockedFunction<typeof fetchFactTopicDetail>;
const mockedFetchBySection = fetchTopicsBySection as jest.MockedFunction<typeof fetchTopicsBySection>;

const buildBlock = (overrides: Partial<FactContentBlock> = {}): FactContentBlock => ({
  order: 1,
  blockType: "image",
  heading: null,
  text: null,
  imageUrl: "http://backend:8000/media/blocks/sample.jpg",
  imageAlt: "Sample block image",
  ...overrides,
});

let summaryCounter = 0;
const buildSummary = (overrides: Partial<FactTopicSummary> = {}): FactTopicSummary => ({
  id: `topic-${summaryCounter++}`,
  slug: "sample-topic",
  title: "Sample Topic",
  subtitle: "Sample subtitle",
  excerpt: "Sample excerpt",
  section: "knowledge",
  heroImageUrl: "http://backend:8000/media/topics/sample.jpg",
  heroImageAlt: "Sample hero alt",
  viewCount: 5,
  ...overrides,
});

describe("Fact topic imagery", () => {
  afterEach(() => {
    jest.clearAllMocks();
    summaryCounter = 0;
  });

  it("renders hero image with provided alt text and falls back when missing", () => {
    render(
      <PastelHero
        cover="http://backend:8000/media/topics/retinol.jpg"
        title="Retinol Guide"
        subtitle="Everything about retinol"
        alt="Retinol hero"
      />
    );

    const heroImage = screen.getByRole("img", { name: "Retinol hero" });
    expect(heroImage).toHaveAttribute("src", "http://backend:8000/media/topics/retinol.jpg");

    render(
      <PastelHero
        cover="http://backend:8000/media/topics/vitamin-c.jpg"
        title="Vitamin C"
        subtitle="Brightening powerhouse"
        alt={null}
      />
    );

    expect(screen.getByRole("img", { name: "Brightening powerhouse" })).toHaveAttribute(
      "src",
      "http://backend:8000/media/topics/vitamin-c.jpg"
    );
  });

  it("renders article block imagery with explicit and fallback alt text", () => {
    const explicit = buildBlock({
      imageUrl: "http://backend:8000/media/blocks/retinol-benefits.jpg",
      imageAlt: "Retinol benefits diagram",
    });
    const fallback = buildBlock({
      order: 2,
      imageUrl: "http://backend:8000/media/blocks/application.jpg",
      imageAlt: null,
    });

    render(
      <>
        <ArticleBlock block={explicit} isLast={false} />
        <ArticleBlock block={fallback} isLast />
      </>
    );

    const explicitImage = screen.getByRole("img", { name: "Retinol benefits diagram" });
    expect(explicitImage).toHaveAttribute("src", explicit.imageUrl!);

    const fallbackImage = screen.getByRole("img", { name: "Content image" });
    expect(fallbackImage).toHaveAttribute("src", fallback.imageUrl!);
  });

  it("renders the topic page hero, content blocks, and related cards with correct imagery", async () => {
    const detail: FactTopicDetail = {
      ...buildSummary({
        slug: "vitamin-c",
        title: "Vitamin C Serum",
        heroImageAlt: "Vitamin C serum bottles",
        heroImageUrl: "http://backend:8000/media/topics/vitamin-c-hero.jpg",
      }),
      updatedAt: "2025-01-01T00:00:00Z",
      contentBlocks: [
        buildBlock({
          order: 1,
          blockType: "text",
          text: "Introduction",
          imageUrl: null,
          imageAlt: null,
        }),
        buildBlock({
          order: 2,
          blockType: "image",
          imageUrl: "http://backend:8000/media/blocks/vit-c-benefits.jpg",
          imageAlt: "Benefits of vitamin C",
        }),
        buildBlock({
          order: 3,
          blockType: "image",
          imageUrl: "http://backend:8000/media/blocks/vit-c-routine.jpg",
          imageAlt: "Morning routine with vitamin C",
        }),
      ],
    };

    const related = [
      buildSummary({
        id: "rel-1",
        slug: "niacinamide",
        title: "Niacinamide",
        heroImageAlt: "Niacinamide hero",
        heroImageUrl: "http://backend:8000/media/topics/niacinamide.jpg",
      }),
      buildSummary({
        id: "rel-2",
        slug: "aha",
        title: "AHA",
        heroImageAlt: null,
        heroImageUrl: null,
      }),
    ];

    mockedFetchDetail.mockResolvedValue(detail);
    mockedFetchBySection.mockResolvedValue([...related, buildSummary({ id: "vitamin-c", slug: "vitamin-c" })]);

    const view = await FactTopicPage({ params: { slug: "vitamin-c" } });
    render(view);

    await screen.findByRole("img", { name: "Vitamin C serum bottles" });

    expect(screen.getByRole("img", { name: "Vitamin C serum bottles" })).toHaveAttribute(
      "src",
      "http://backend:8000/media/topics/vitamin-c-hero.jpg"
    );
    expect(screen.getByRole("img", { name: "Benefits of vitamin C" })).toHaveAttribute(
      "src",
      "http://backend:8000/media/blocks/vit-c-benefits.jpg"
    );
    expect(screen.getByRole("img", { name: "Morning routine with vitamin C" })).toHaveAttribute(
      "src",
      "http://backend:8000/media/blocks/vit-c-routine.jpg"
    );

    expect(screen.getByRole("img", { name: "Niacinamide hero" })).toHaveAttribute(
      "src",
      "http://backend:8000/media/topics/niacinamide.jpg"
    );

    // related card fallback alt should use the title when hero alt missing
    expect(screen.getByRole("img", { name: "AHA" })).toBeInTheDocument();
  });
});
