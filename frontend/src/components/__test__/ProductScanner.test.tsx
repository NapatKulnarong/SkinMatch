import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductScanner } from "../ProductScanner";

jest.mock("@/lib/api.scan", () => ({
  scanProductLabel: jest.fn(),
  scanIngredientsText: jest.fn(),
}));

jest.mock("@/lib/errors", () => ({
  getFriendlyErrorMessage: jest.fn((message: string) => message),
}));

const { scanProductLabel, scanIngredientsText } = jest.requireMock("@/lib/api.scan");

const mockResult = {
  raw_text: "Water, Niacinamide",
  benefits: ["Hydration: Locks in moisture."],
  actives: ["Niacinamide: Brightens skin tone."],
  concerns: ["Fragrance: May irritate sensitive skin."],
  notes: ["Dermatologist tested."],
  confidence: 0.83,
};

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:preview");
  global.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProductScanner", () => {
  it("submits manual text and renders AI insights", async () => {
    (scanIngredientsText as jest.Mock).mockResolvedValue(mockResult);

    render(<ProductScanner />);

    const textarea = screen.getByPlaceholderText(/Deionized Water/i);
    await userEvent.type(textarea, "Water, Niacinamide, Fragrance");

    const scanButton = screen.getByRole("button", { name: /scan product/i });
    await userEvent.click(scanButton);

    await waitFor(() => {
      expect(scanIngredientsText).toHaveBeenCalledWith("Water, Niacinamide, Fragrance");
    });

    expect(await screen.findByText(/Benefits/i)).toBeInTheDocument();
    expect(screen.getByText(/Hydration/)).toBeInTheDocument();
    expect(screen.getByText(/Active Ingredients/)).toBeInTheDocument();
  });

  it("uploads a file and calls scanProductLabel", async () => {
    (scanProductLabel as jest.Mock).mockResolvedValue(mockResult);

    render(<ProductScanner />);

    const file = new File(["fake"], "label.png", { type: "image/png" });
    const input = screen.getByLabelText(/Drop a photo or tap to browse/i);
    await userEvent.upload(input, file);

    const scanButton = screen.getByRole("button", { name: /scan product/i });
    await userEvent.click(scanButton);

    await waitFor(() => {
      expect(scanProductLabel).toHaveBeenCalledWith(file);
    });
    expect(await screen.findByText(/Watch Outs/i)).toBeInTheDocument();
  });
});
