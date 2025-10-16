import type { Metadata } from "next";
import { Quicksand, Caveat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // ⬅️ Import your Navbar
import { NavWidthProvider } from "@/components/NavWidthContext";

// import the Quicksand font with the weights you need
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600"] });

export const fonts = {
  hand: caveat, // use fonts.hand.className to apply
};

// app-wide metadata
export const metadata: Metadata = {
  title: "SkinMatch",
  description: "Your skin, Your match, Your best care!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* apply the font to the whole body */}
      <body className={quicksand.className}>
        {/* Navbar appears on every page */}
        <NavWidthProvider>
          <Navbar />
          {children}
        </NavWidthProvider>
      </body>
    </html>
  );
}
