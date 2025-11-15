import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import PopularTopics from "@/app/facts/_PopularTopics";
import { fetchPopularTopics } from "@/lib/api.facts";
import type { FactTopicSummary } from "@/lib/types";
import "@testing-library/jest-dom";

jest.mock("@/lib/api.facts");
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: ComponentProps<"img">) => {
    const { priority, fill, alt, ...rest } = props;
    void priority;
    void fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt ?? ""} {...rest} />
    );
  },
}));

const mockedFetchPopularTopics = fetchPopularTopics as jest.MockedFunction<typeof fetchPopularTopics>;

let topicIdCounter = 0;
const buildTopic = (overrides: Partial<FactTopicSummary> = {}): FactTopicSummary => ({
  id: `topic-${topicIdCounter++}`,
  slug: "sample-topic",
  title: "Sample topic",
  subtitle: "Subtitle",
  excerpt: "Excerpt",
  section: "knowledge",
  heroImageUrl: "/media/topics/sample.jpg",
  heroImageAlt: "Sample hero",
  viewCount: 10,
  ...overrides,
});

const findHeroImageByAlt = async (altText: string) => {
  const matches = await screen.findAllByRole("img", { name: altText });
  const heroImage = matches.find((img) => img.hasAttribute("sizes"));
  if (!heroImage) {
    throw new Error(`Expected hero image with alt "${altText}" to have responsive sizes attribute`);
  }
  return heroImage;
};

describe("PopularTopics hero image rendering", () => {
  afterEach(() => {
    jest.clearAllMocks();
    topicIdCounter = 0;
  });

  it("renders each topic hero image with its provided alt text when navigating the carousel", async () => {
    const topics = [
      buildTopic({ id: "1", slug: "skincare-basics", title: "Skincare Basics", heroImageAlt: "Skincare hero" }),
      buildTopic({
        id: "2",
        slug: "sun-protection",
        title: "Sun Protection",
        heroImageUrl: "https://cdn.example.com/sun.jpg",
        heroImageAlt: "Sun protection hero",
      }),
      buildTopic({
        id: "3",
        slug: "anti-aging",
        title: "Anti-Aging",
        heroImageUrl: "/media/topics/anti-aging.jpg",
        heroImageAlt: "Anti aging hero",
      }),
    ];
    mockedFetchPopularTopics.mockResolvedValue(topics);

    render(<PopularTopics />);

    // initial slide
    const initialHero = await findHeroImageByAlt(topics[0].heroImageAlt!);
    expect(initialHero).toHaveAttribute("src", topics[0].heroImageUrl!);

    const goToSecond = await screen.findByText(topics[1].title);
    const secondButton = goToSecond.closest("button");
    if (!secondButton) {
      throw new Error(`Expected a button wrapper for topic "${topics[1].title}"`);
    }
    await userEvent.click(secondButton);

    const secondHero = await findHeroImageByAlt(topics[1].heroImageAlt!);
    expect(secondHero).toHaveAttribute("src", topics[1].heroImageUrl!);

    const goToThird = await screen.findByText(topics[2].title);
    const thirdButton = goToThird.closest("button");
    if (!thirdButton) {
      throw new Error(`Expected a button wrapper for topic "${topics[2].title}"`);
    }
    await userEvent.click(thirdButton);

    const thirdHero = await findHeroImageByAlt(topics[2].heroImageAlt!);
    expect(thirdHero).toHaveAttribute("src", topics[2].heroImageUrl!);
  });

  it("falls back to the default hero image and uses the topic title for alt text when URL or alt is missing", async () => {
    const topics = [
      buildTopic({
        id: "1",
        slug: "missing-hero",
        title: "Missing hero",
        heroImageUrl: null,
        heroImageAlt: null,
      }),
    ];
    mockedFetchPopularTopics.mockResolvedValue(topics);

    render(<PopularTopics />);

    const heroImage = await findHeroImageByAlt(topics[0].title);

    expect(heroImage.getAttribute("src")).toContain("/img/facts_img/sheet_mask.jpg");
  });
});
