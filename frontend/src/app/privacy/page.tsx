import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PageContainer from "@/components/PageContainer";

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
    <main className="min-h-screen bg-[#f4f8fb] text-[#1f2d26]">
      <section className="border-b border-[#1f2d26]/10 bg-[#e0f1ff] py-24">
        <PageContainer className="space-y-6">
          <p className="inline-flex items-center rounded-full border-2 border-black/10 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1f2d26]/70 shadow-[4px_4px_0_rgba(31,45,38,0.18)]">
            Privacy First
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-[#1f2d26]/80 sm:text-xl">
            Your trust matters. This policy explains how SkinMatch collects,
            protects, and uses your personal information so you can feel confident
            every time you explore new skincare matches.
          </p>
          <p className="text-sm font-semibold text-[#1f2d26]/60">
            Effective date: {POLICY_LAST_UPDATED}
          </p>
        </PageContainer>
      </section>

      <PageContainer as="section" className="py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <article className="space-y-10 rounded-3xl border-2 border-black bg-white p-8 shadow-[8px_10px_0_rgba(31,45,38,0.15)] lg:p-10">
            {SECTIONS.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-2xl font-bold text-[#0f172a]">
                  {section.title}
                </h2>
                {section.paragraphs.map((text, index) => (
                  <p key={index} className="text-base leading-relaxed text-[#1f2d26]/80">
                    {text}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-3 rounded-2xl border border-[#1f2d26]/10 bg-[#f7fbff] p-5">
                    {section.bullets.map((item) => (
                      <li key={item.label} className="space-y-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#1f2d26]/70">
                          {item.label}
                        </p>
                        <p className="text-base leading-relaxed text-[#1f2d26]/80">
                          {item.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </article>

          <aside className="flex flex-col gap-6 rounded-3xl border-2 border-black bg-[#1f2d26] p-8 text-white shadow-[8px_10px_0_rgba(31,45,38,0.3)]">
            <h2 className="text-2xl font-bold">Key Takeaways</h2>
            <ul className="space-y-4 text-sm leading-relaxed">
              <li>
                We only collect data that helps personalise skincare guidance and
                improve SkinMatch.
              </li>
              <li>
                Your information is never sold; sharing is limited to essential
                service providers.
              </li>
              <li>
                You control your profile and can request updates, exports, or deletions
                any time.
              </li>
              <li>
                Contact us if you have questions or suspect unauthorised access—we are
                here to help.
              </li>
            </ul>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-relaxed">
              <p className="font-semibold uppercase tracking-[0.25em] text-white/70">
                Need more details?
              </p>
              <p className="mt-2">
                Email us at{" "}
                <Link
                  href="mailto:skinmatch.contact@gmail.com"
                  className="font-semibold text-[#a5d8ff] underline decoration-[#a5d8ff]/50 underline-offset-4 transition hover:text-white"
                >
                  skinmatch.contact@gmail.com
                </Link>{" "}
                and we will respond within two business days.
              </p>
            </div>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
