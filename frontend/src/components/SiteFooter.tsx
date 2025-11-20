import Link from "next/link";

import PageContainer from "@/components/PageContainer";

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-black bg-[#3C3D37] text-white">
      <PageContainer className="py-8 sm:py-12">
        <div className="grid gap-6 sm:gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 md:col-span-3 lg:col-span-1 space-y-3 sm:space-y-4">
            <h3 className="text-xl sm:text-2xl font-bold">SkinMatch</h3>
            <p className="text-xs sm:text-sm text-white/70">
              &ldquo;Your skin, Your match, Your best care!&rdquo;
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Resources</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/ingredients" className="text-white/70 hover:text-white transition">
                  Ingredient Glossary
                </Link>
              </li>
              <li>
                <Link href="/facts" className="text-white/70 hover:text-white transition">
                  Skincare Facts
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/quiz" className="text-white/70 hover:text-white transition">
                  Take the Quiz
                </Link>
              </li>
              <li>
                <Link href="/account" className="text-white/70 hover:text-white transition">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/70 hover:text-white transition">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1 lg:col-span-1 space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Legal</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-sm text-white/60">
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 border-t border-white/10 pt-6 sm:pt-8 text-center text-[10px] sm:text-xs text-white/60">
          <p>© {new Date().getFullYear()} SkinMatch. All rights reserved.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
