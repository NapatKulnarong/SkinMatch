import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { NavWidthProvider } from "@/components/NavWidthContext";

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
      <body className="font-body">
        <NavWidthProvider>
          <Navbar />
          {children}
        </NavWidthProvider>
      </body>
    </html>
  );
}
