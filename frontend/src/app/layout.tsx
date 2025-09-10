import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";   // ⬅️ Import your Navbar

// import the Quicksand font with the weights you need
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
        <Navbar />
        {children}
      </body>
    </html>
  );
}