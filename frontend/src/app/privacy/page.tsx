import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PageContainer from "@/components/PageContainer";
import SiteFooter from "@/components/SiteFooter";

type PolicySection = {
  title: string;
  paragraphs: ReactNode[];
  bullets?: { label: string; description: string }[];
};

export const metadata: Metadata = {
  title: "Privacy Policy | SkinMatch",
  description:
    "Understand how SkinMatch collects, uses, and protects your personal information.",
};

const SECTIONS: PolicySection[] = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      "We collect the minimum data needed to personalise your SkinMatch experience and support our services.",
    ],
    bullets: [
      {
        label: "Account details",
        description:
          "Name, email address, and password you provide when creating or updating your profile.",
      },
      {
        label: "Skin profile inputs",
        description:
          "Skin concerns, goals, sensitivities, and quiz responses that help tailor ingredient insights.",
      },
      {
        label: "Usage data",
        description:
          "Interactions with our app, including log files, device information, and feature usage patterns.",
      },
      {
        label: "Communications",
        description:
          "Feedback, support requests, or survey responses you share with the SkinMatch team.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    paragraphs: [
      "Data is processed to deliver personalised routines, ingredient recommendations, and safety alerts. We also use aggregated insights to improve SkinMatch features, train detection models, and safeguard our platform.",
      "We do not sell your personal information. Partner collaborations, if any, use anonymised data and cannot identify you.",
    ],
  },
  {
    title: "3. How We Share Data",
    paragraphs: [
      "Access to your data is limited to SkinMatch team members and trusted suppliers who support our infrastructure (such as hosting and analytics). Everyone handling your data is bound by contractual confidentiality and security obligations.",
      "If required by law or to protect the rights and safety of SkinMatch, we may disclose information to law enforcement or regulatory agencies.",
    ],
  },
  {
    title: "4. Data Retention & Security",
    paragraphs: [
      "We keep personal data only as long as necessary for the purposes outlined here or as required by law. When data is no longer needed, it is securely deleted or anonymised.",
      "We use encryption, access controls, and ongoing monitoring to guard your information. While no system is perfectly secure, we proactively review and update our safeguards.",
    ],
  },
  {
    title: "5. Your Choices & Rights",
    paragraphs: [
      "You can update or delete your profile details at any time from your account settings. To request a full export or erasure of your personal data, contact us using the details below.",
      "If you receive promotional messages, you can opt out using the unsubscribe link or by adjusting your notification preferences.",
    ],
  },
  {
    title: "6. Children’s Privacy",
    paragraphs: [
      "SkinMatch is designed for individuals aged 16 and older. We do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please reach out so we can remove it promptly.",
    ],
  },
  {
    title: "7. Updates to This Policy",
    paragraphs: [
      "When we make material changes to this privacy policy, we will update the effective date and notify you through the app or by email where appropriate. Continued use of SkinMatch after changes means you accept the revised policy.",
    ],
  },
  {
    title: "8. Contact Us",
    paragraphs: [
      <>
        Questions or requests about your privacy are always welcome. Reach our
        data protection team at{" "}
        <Link
          href="mailto:skinmatch.contact@gmail.com"
          className="font-semibold text-[#2563eb] underline decoration-[#2563eb]/40 underline-offset-4 transition hover:text-[#1d4ed8]"
        >
          skinmatch.contact@gmail.com
        </Link>
        .
      </>,
    ],
  },
];

const POLICY_LAST_UPDATED = "April 15, 2024";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eef5ff] via-white to-[#eef5ff] text-[#0f1f2b]">
      <section className="relative overflow-hidden border-b border-[#0f1f2b]/10 bg-gradient-to-br from-[#cfe8ff] via-[#d9f0ff] to-[#edf6ff] px-4 py-12 sm:px-6 sm:py-20 lg:py-28 pb-10 md:pb-10 lg:pb-12">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-8 right-10 h-32 w-32 rounded-full bg-white/50 blur-3xl" />
          <div className="absolute bottom-12 left-8 h-36 w-36 rounded-full bg-[#6fc3ff]/30 blur-3xl" />
        </div>
        <div className="relative mx-auto lg:mx-42 mt-28 md:mt-12 lg:mt-0 max-w-4xl space-y-4 sm:space-y-6">
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-[#0d1b2a] sm:text-4xl lg:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#0f1f2b]/75 sm:text-lg">
            Your trust matters. This policy explains how SkinMatch collects, protects, and uses your personal information so you can feel confident every time you explore new skincare matches.
          </p>
          <div className="-mt-1 flex flex-wrap items-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f1f2b]/70 sm:text-xs">
            <span className="inline-flex items-center rounded-full border border-black/15 bg-white px-4 py-1 shadow-[2px_2px_0_rgba(0,0,0,0.15)]">
              Updated {POLICY_LAST_UPDATED}
            </span>
          </div>
        </div>
      </section>

      <PageContainer as="section" className="py-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
          <article className="space-y-8 overflow-hidden rounded-[24px] border-2 border-black/80 bg-white/95 p-6 shadow-[6px_8px_0_rgba(31,45,38,0.12)] sm:rounded-[32px] sm:p-8 lg:space-y-10 lg:p-10">
            <div className="sticky top-0 z-10 -mx-6 -mt-6 bg-gradient-to-b from-white via-white to-white/0 px-6 pb-4 pt-6 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pb-6 sm:pt-8 lg:hidden">
              <div className="flex items-center gap-3 rounded-xl border border-[#0f1f2b]/15 bg-[#eef5ff] px-4 py-2 text-xs font-medium text-[#0f1f2b]/70">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Scroll to review all {SECTIONS.length} sections
              </div>
            </div>

            {SECTIONS.map((section, idx) => (
              <section key={section.title} className="space-y-4 rounded-2xl border border-[#0f1f2b]/10 bg-[#f9fbff] p-5 sm:p-6">
                <div className="flex items-center gap-3 text-[#0f172a]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white text-base font-black shadow-[3px_3px_0_rgba(0,0,0,0.15)] sm:text-lg">
                    {idx + 1}
                  </span>
                  <h2 className="text-lg font-bold sm:text-2xl">{section.title}</h2>
                </div>
                {section.paragraphs.map((text, i) => (
                  <p key={i} className="text-sm leading-relaxed text-[#0f1f2b]/80 sm:text-base">
                    {text}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-3 rounded-xl border border-[#0f1f2b]/10 bg-white/60 p-4 text-sm text-[#0f1f2b]/80 sm:text-base">
                    {section.bullets.map((item) => (
                      <li key={item.label} className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f1f2b]/65 sm:text-sm">
                          {item.label}
                        </p>
                        <p>{item.description}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </article>

          <aside className="space-y-4 rounded-[24px] border-2 border-black bg-[#87a4be] p-6 text-white shadow-[6px_8px_0_rgba(15,31,43,0.2)] sm:rounded-[32px] sm:p-8 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-xl font-bold sm:text-2xl">Key Takeaways</h2>
            <ul className="space-y-3 text-sm leading-relaxed sm:text-base">
              <li>We only collect data that helps personalise skincare guidance and improve SkinMatch.</li>
              <li>Your information is never sold; sharing is limited to essential service providers.</li>
              <li>You control your profile and can request updates, exports, or deletions any time.</li>
              <li>Contact us if you have questions or suspect unauthorised access—we are here to help.</li>
            </ul>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-relaxed sm:p-5">
              <p className="font-semibold uppercase tracking-[0.25em] text-white/70">Need more details?</p>
              <p className="mt-2">
                Email us at{" "}
                <Link
                  href="mailto:privacy@skinmatch.app"
                  className="font-semibold text-[#9cd7ff] underline decoration-[#9cd7ff]/50 underline-offset-4 transition hover:text-white"
                >
                  privacy@skinmatch.app
                </Link>{" "}
                and we will respond within two business days.
              </p>
            </div>
          </aside>
        </div>
      </PageContainer>
      <SiteFooter />
    </main>
  );
}
