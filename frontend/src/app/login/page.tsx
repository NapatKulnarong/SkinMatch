"use client";

import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#D7CFE6] flex items-center justify-center">
      {/* Login box */}
      <div className="w-[540px] rounded-3xl border-2 border-black bg-white/95 overflow-hidden shadow-[6px_8px_0_rgba(0,0,0,0.35)]">
        <div className="p-8">
          <h2 className="text-3xl font-extrabold text-[#3B2F4A]">
            Join our <span className="text-[#3B2F4A]">MatchClub</span>
          </h2>

          <ul className="mt-6 text-[15.5px] text-gray-700 font-semibold">
            <li className="py-3.5 flex gap-3 items-start border-b border-black/10 whitespace-nowrap">
              <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
              <span>Save your match result</span>
            </li>
            <li className="py-3.5 flex gap-3 items-start border-b border-black/10 whitespace-nowrap">
              <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
              <span>Read &amp; write reviews on your product matches</span>
            </li>
            <li className="py-3.5 flex gap-3 items-start border-b border-black/10 whitespace-nowrap">
              <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
              <span>Be the first to get updates about the skincare industry</span>
            </li>
            <li className="py-3.5 flex gap-3 items-start whitespace-nowrap">
              <span className="mt-2 h-2 w-2 rounded-full bg-[#7C6DB1]" />
              <span>Product discount alerts</span>
            </li>
          </ul>
        </div>

        {/* Lavender footer with Google button */}
        <div className="bg-[#B6A6D8] p-6">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-3 rounded-full border-2 border-black bg-white px-6 py-4 text-lg font-semibold text-black shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10"
            onClick={() => console.log("Google sign up clicked")}
          >
            <Image src="/icon/google.png" alt="Google" width={26} height={26} />
            <span>Sign up with Google</span>
          </button>
        </div>
      </div>
    </main>
  );
}