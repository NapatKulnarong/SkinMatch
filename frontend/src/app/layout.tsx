import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { NavWidthProvider } from "@/components/NavWidthContext";
import { EnvironmentAlertsProvider } from "@/components/EnvironmentAlertsProvider";
import { NotificationCenterProvider } from "@/components/NotificationCenter";

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
        <NotificationCenterProvider>
          <EnvironmentAlertsProvider>
            <NavWidthProvider>
              <Navbar />
              {children}
            </NavWidthProvider>
          </EnvironmentAlertsProvider>
        </NotificationCenterProvider>
      </body>
    </html>
  );
}
