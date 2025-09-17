// src/mocks/homepage.mock.ts
export const homepageMock = {
  hero: {
    title: "Your Skin, Your Match",
    subtitle: "Personalized skincare starts here.",
    ctaText: "Get Started",
  },
  highlights: [
    { id: "h1", title: "Skin Profile", blurb: "Tell us your skin type & concerns", href: "/profile" },
    { id: "h2", title: "Compatibility Check", blurb: "See what works well together", href: "/checker" },
    { id: "h3", title: "Routine Builder", blurb: "Build AM/PM steps in minutes", href: "/routine" },
  ],
  featuredProducts: [
    { id: "p1", name: "Gentle Cleanser", price: 299, imageUrl: "/img/placeholder.png" },
    { id: "p2", name: "Hydrating Serum", price: 499, imageUrl: "/img/placeholder.png" },
    { id: "p3", name: "Daily Sunscreen SPF50", price: 399, imageUrl: "/img/placeholder.png" },
  ],
};