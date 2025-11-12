"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-storage";
import PageContainer from "@/components/PageContainer";

export default function PreferencesPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      // Redirect to login with return URL to quiz
      router.push("/login?redirect=/quiz");
    } else {
      // User is logged in, redirect to quiz
      router.push("/quiz");
    }
  }, [router]);

  return (
    <PageContainer as="main" className="min-h-screen flex items-center justify-center py-20">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#fff1d6] via-[#ffe9c8] to-[#f4f1df] p-8 shadow-[10px_12px_0_rgba(0,0,0,0.22)]">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-extrabold text-[#101b27]">
              Update Your Preferences
            </h1>
            <p className="text-[#2d3a2f] text-lg">
              Please log in to update your newsletter preferences and complete your skincare quiz.
            </p>
            <p className="text-[#3c4c3f] text-sm">
              Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

