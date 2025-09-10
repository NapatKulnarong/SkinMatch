import Image from "next/image";              // Next.js <Image> component (optimized images)
import Navbar from "@/components/Navbar";     // Your custom Navbar component
import Button from "@/components/ui/Button";  // Your custom Button component
import { ArrowRightIcon } from "@heroicons/react/24/solid";

export default function HomePage() {
  return (
    // Main wrapper for the whole page
    <main className="min-h-screen bg-[#FFF6E9]">
      {/* Navigation bar at the top */}
      <Navbar />

      {/* Hero section = full-screen intro area */}
      <section className="relative w-full h-screen">
        {/* Background image that covers the entire hero section */}
        <Image
          src="/hero.jpg"           // image path (put hero.jpg in /public folder)
          alt="Skincare Model"      // alt text (important for accessibility/SEO)
          fill                      // Next.js: make image fill its parent container
          priority                  // preload this image (better for performance on hero images)
          className="object-cover"  // object-cover = crop/scale image to fully cover container
        />

        {/* Overlay container for text and button, sits above the image */}
        <div className="absolute inset-0 z-10 flex items-center justify-end px-6 md:pr-24">
          {/* Text block wrapper */}
          <div className="max-w-md md:max-w-3xl text-center md:text-right">
            {/* Main heading */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900">
              SkinMatch
            </h1>

            {/* Tagline text */}
            {/* md:whitespace-nowrap = keep this one line on medium+ screens */}
            <p className="mt-4 text-base md:text-2xl text-gray-700 font-semibold md:whitespace-nowrap">
              “Your skin, Your match, Your best care!”
            </p>

            {/* Button wrapper */}
            {/* justify-center = center button on mobile, justify-end = right-align on desktop */}
            <div className="mt-8 flex justify-center md:justify-end">
              {/* Styled button (could use <Button> component instead of raw classes) */}
              <button
                className="
                  inline-flex items-center gap-3 whitespace-nowrap
                  rounded-full border-2 border-black bg-white font-semibold
                  px-8 py-4 text-black
                  shadow-[0_6px_0_rgba(0,0,0,0.35)]
                  transition-all duration-150 ease-out
                  hover:translate-y-[-1px] hover:shadow-[0_8px_0_rgba(0,0,0,0.35)]
                  active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.35)]
                  focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10
                  "
              >
                  <span>Find your match</span>
                  {/* Heroicons arrow restored */}
                  <ArrowRightIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}