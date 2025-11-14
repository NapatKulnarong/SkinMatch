import type { Metadata } from "next";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import TermsEmailRequest from "./TermsEmailRequest";

type TermsParagraph = {
  text: string;
  highlightEmail?: string;
};

type TermsSection = {
  title: string;
  paragraphs: TermsParagraph[];
  bullets?: string[];
};

export const metadata: Metadata = {
  title: "Terms of Service | SkinMatch",
  description:
    "Review the terms governing your use of SkinMatch, including user responsibilities and service limitations.",
};

const SECTIONS: TermsSection[] = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      {
        text: "By accessing or using SkinMatch, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please discontinue using the platform.",
      },
    ],
  },
  {
    title: "2. Eligibility & Account Responsibilities",
    paragraphs: [
      {
        text: "SkinMatch is intended for individuals who are at least 16 years old. When you create an account, you confirm that the information you provide is accurate, complete, and kept current.",
      },
      {
        text: "You are responsible for safeguarding your login credentials and notifying us immediately of any unauthorised use of your account.",
      },
    ],
  },
  {
    title: "3. Permitted Use",
    paragraphs: [
      {
        text: "SkinMatch offers ingredient insights, personalised routines, and educational resources for skincare guidance. You may use the platform only for lawful purposes and in accordance with these terms.",
      },
    ],
    bullets: [
      "Do not attempt to circumvent security features or access data that does not belong to you.",
      "Do not upload harmful code, automated scraping tools, or content that infringes on intellectual property rights.",
      "Do not use SkinMatch to publish misleading, defamatory, or discriminatory material.",
    ],
  },
  {
    title: "4. Intellectual Property",
    paragraphs: [
      {
        text: "All SkinMatch software, branding, text, graphics, and original content are owned by SkinMatch or its licensors and are protected by applicable intellectual property laws.",
      },
      {
        text: "You may not copy, modify, distribute, or create derivative works from our content without prior written permission, except where the functionality of the platform clearly allows it (such as exporting your own profile data).",
      },
    ],
  },
  {
    title: "5. Ingredient & Product Guidance",
    paragraphs: [
      {
        text: "SkinMatch provides information to help you make informed skincare decisions, but it is not a substitute for professional medical advice, diagnosis, or treatment.",
      },
      {
        text: "Always consult a qualified healthcare professional if you have specific concerns. Your reliance on platform recommendations is at your own discretion and risk.",
      },
    ],
  },
  {
    title: "6. Third-Party Links & Services",
    paragraphs: [
      {
        text: "SkinMatch may reference third-party products, articles, or shopping links. We do not endorse or assume responsibility for third-party content, websites, or services. Any interactions with third parties are solely between you and the third party.",
      },
    ],
  },
  {
    title: "7. Service Availability & Changes",
    paragraphs: [
      {
        text: "We strive to keep SkinMatch running smoothly, but we may suspend, discontinue, or modify parts of the service without prior notice. We reserve the right to restrict access to certain features if your usage threatens platform stability or security.",
      },
    ],
  },
  {
    title: "8. Disclaimers & Limitation of Liability",
    paragraphs: [
      {
        text: "SkinMatch is provided on an \"as is\" and \"as available\" basis without warranties of any kind, whether express or implied. We do not guarantee specific skincare outcomes, uninterrupted service, or error-free content.",
      },
      {
        text: "To the maximum extent permitted by law, SkinMatch and its team members shall not be liable for indirect, incidental, consequential, or punitive damages arising from your use of the platform.",
      },
    ],
  },
  {
    title: "9. Indemnification",
    paragraphs: [
      {
        text: "You agree to defend, indemnify, and hold harmless SkinMatch, its affiliates, and team members from any claims, liabilities, damages, and expenses (including reasonable legal fees) arising from your misuse of the platform, violation of these terms, or infringement of third-party rights.",
      },
    ],
  },
  {
    title: "10. Termination",
    paragraphs: [
      {
        text: "We may suspend or terminate your access to SkinMatch at any time if you breach these terms or engage in behaviour that compromises the safety or integrity of the platform.",
      },
      {
        text: "You may delete your account at any time; certain data may persist as outlined in our Privacy Policy to meet legal or legitimate business requirements.",
      },
    ],
  },
  {
    title: "11. Governing Law",
    paragraphs: [
      {
        text: "These terms are governed by the laws of Thailand, without regard to conflict of law provisions. Any disputes will be handled in the courts located in Bangkok, unless applicable law requires a different venue.",
      },
    ],
  },
  {
    title: "12. Changes to These Terms",
    paragraphs: [
      {
        text: "We may update these terms from time to time. When material changes occur, we will post the new terms and update the effective date below. Continued use of SkinMatch after changes means you accept the updated terms.",
      },
    ],
  },
  {
    title: "13. Contact",
    paragraphs: [
      {
        text: "If you have questions about these terms, reach the SkinMatch legal team at legal@skinmatch.app.",
        highlightEmail: "legal@skinmatch.app",
      },
    ],
  },
];

const TERMS_LAST_UPDATED = "April 15, 2024";
const TERMS_EMAIL_SUBJECT = "SkinMatch Terms of Service";

function renderParagraph({ text, highlightEmail }: TermsParagraph) {
  if (!highlightEmail || !text.includes(highlightEmail)) {
    return text;
  }

  const [before, after] = text.split(highlightEmail);
  return (
    <>
      {before}
      <Link
        href={`mailto:${highlightEmail}`}
        className="font-semibold text-[#2563eb] underline decoration-[#2563eb]/40 underline-offset-4 transition-colors hover:text-[#1d4ed8] hover:decoration-[#2563eb]/60"
      >
        {highlightEmail}
      </Link>
      {after}
    </>
  );
}

function buildTermsEmailBody(): string {
  const lines: string[] = [
    TERMS_EMAIL_SUBJECT,
    `Effective date: ${TERMS_LAST_UPDATED}`,
    "",
  ];

  SECTIONS.forEach((section) => {
    lines.push(section.title);
    section.paragraphs.forEach((paragraph) => {
      lines.push(paragraph.text);
    });

    if (section.bullets) {
      section.bullets.forEach((item) => {
        lines.push(` • ${item}`);
      });
    }

    lines.push("");
  });

  lines.push("— The SkinMatch Team");
  return lines.join("\n");
}

export default function TermsPage() {
  const termsEmailBody = buildTermsEmailBody();

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f4f8fb] via-[#fef5f1] to-[#f4f8fb] text-[#1f2d26]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#1f2d26]/10 bg-gradient-to-br from-[#ffe7da] via-[#ffd5c8] to-[#ffccb8] px-4 py-12 sm:px-6 sm:py-20 lg:py-28">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-white/40 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-[#ff9b82]/20 blur-3xl" />
        </div>
        
        <div className="mt-28 lg:mt-0 relative mx-auto max-w-7xl space-y-4 sm:space-y-6">
          <div className="hidden md:inline-flex items-center gap-2 rounded-full border-2 border-black/10 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#1f2d26]/70 shadow-[2px_2px_0_rgba(31,45,38,0.1)] sm:px-4 sm:text-xs sm:tracking-[0.2em] sm:shadow-[3px_3px_0_rgba(31,45,38,0.12)]">
            <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Terms & Trust
          </div>
          
          <h1 className="max-w-3xl text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
            Terms of Service
          </h1>
          
          <p className="max-w-2xl text-sm leading-relaxed text-[#1f2d26]/75 sm:text-lg lg:text-xl">
            These terms outline the rules for using SkinMatch. Please read them carefully so
            you understand your rights, responsibilities, and the limits of our services.
          </p>
          
          <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pt-2">
            <p className="text-xs font-semibold text-[#1f2d26]/60 sm:text-base">
              Effective: {TERMS_LAST_UPDATED}
            </p>
            <span className="hidden h-1 w-1 rounded-full bg-[#1f2d26]/30 sm:block" />
            <p className="text-xs text-[#1f2d26]/60 sm:text-base">
              Last updated: {TERMS_LAST_UPDATED}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <PageContainer as="section" className="py-10 sm:py-16 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
          {/* Terms Content */}
          <article className="space-y-8 overflow-hidden rounded-2xl border-2 border-black/80 bg-white p-6 shadow-[6px_8px_0_rgba(31,45,38,0.12)] transition-shadow hover:shadow-[8px_10px_0_rgba(31,45,38,0.15)] sm:rounded-3xl sm:p-8 lg:space-y-10 lg:p-10">
            {/* Progress indicator for mobile */}
            <div className="sticky top-0 z-10 -mx-6 -mt-6 bg-gradient-to-b from-white via-white to-white/0 px-6 pb-4 pt-6 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pb-6 sm:pt-8 lg:hidden">
              <div className="flex items-center gap-3 rounded-xl border border-[#1f2d26]/10 bg-[#f4f8fb] px-4 py-2.5 text-xs font-medium text-[#1f2d26]/70">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Scroll to read all {SECTIONS.length} sections</span>
              </div>
            </div>

            {SECTIONS.map((section, idx) => (
              <section 
                key={section.title} 
                id={`section-${idx + 1}`}
                className="group scroll-mt-24 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffe7da] to-[#ffd5c8] text-sm font-bold text-[#1f2d26] shadow-sm">
                    {idx + 1}
                  </span>
                  <h2 className="flex-1 text-xl font-bold text-[#0f172a] transition-colors group-hover:text-[#1f2d26] sm:text-2xl">
                    {section.title.replace(/^\d+\.\s*/, '')}
                  </h2>
                </div>
                
                <div className="space-y-3 pl-11">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-sm leading-relaxed text-[#1f2d26]/80 sm:text-base">
                      {renderParagraph(paragraph)}
                    </p>
                  ))}
                  
                  {section.bullets && (
                    <ul className="space-y-2.5 rounded-xl border border-[#1f2d26]/10 bg-gradient-to-br from-[#fff7f0] to-[#fef5f1] p-4 sm:rounded-2xl sm:p-5">
                      {section.bullets.map((item, bulletIdx) => (
                        <li key={bulletIdx} className="flex gap-3 text-sm leading-relaxed text-[#1f2d26]/80 sm:text-base">
                          <span className="mt-1.5 flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ff9b82]" />
                          <span className="flex-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {idx < SECTIONS.length - 1 && (
                  <div className="pl-11 pt-2">
                    <div className="h-px bg-gradient-to-r from-[#1f2d26]/10 via-[#1f2d26]/5 to-transparent" />
                  </div>
                )}
              </section>
            ))}

            {/* Footer CTA */}
            <div className="mt-8 rounded-2xl border-2 border-[#1f2d26]/10 bg-gradient-to-br from-[#f4f8fb] to-[#fef5f1] p-6 sm:p-8">
              <h3 className="mb-3 text-lg font-bold text-[#1f2d26] sm:text-xl">
                Questions about these terms?
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-[#1f2d26]/70 sm:text-base">
                Our legal team is here to help clarify any concerns you may have.
              </p>
              <Link
                href="mailto:legal@skinmatch.app"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-[#ffb3c6] px-5 py-2.5 text-sm font-semibold text-[#1f2d26] shadow-[4px_4px_0_rgba(255,107,157,0.3)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffc9d4] hover:shadow-[2px_2px_0_rgba(255,107,157,0.3)] sm:px-6 sm:py-3 sm:text-base"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Legal Team
              </Link>
            </div>
          </article>

          {/* Sidebar - Desktop Sticky, Mobile Full Width */}
          <aside className="space-y-6">
            {/* Table of Contents - Desktop Only */}
            <nav className="hidden rounded-2xl border-2 border-black/10 bg-white p-6 shadow-sm lg:block">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-[#1f2d26]/60">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Contents
              </h3>
              <ol className="space-y-2 text-sm">
                {SECTIONS.map((section, idx) => (
                  <li key={idx}>
                    <a
                      href={`#section-${idx + 1}`}
                      className="block rounded-lg px-3 py-2 text-[#1f2d26]/70 transition-colors hover:bg-[#f4f8fb] hover:text-[#1f2d26]"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Quick Highlights */}
            <div className="rounded-2xl border-2 border-black bg-gradient-to-br from-[#ffc2c3] via-[#ffecee] to-[#ffc2c3] p-6 shadow-[6px_8px_0_rgba(255,155,181,0.3)] sm:rounded-3xl sm:p-8 lg:sticky lg:top-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm shadow-sm">
                  <svg className="h-5 w-5 text-[#ff6b9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#1f2d26] sm:text-2xl">Quick Highlights</h2>
              </div>
              
              <ul className="space-y-4 text-sm leading-relaxed sm:text-base">
                {[
                  "SkinMatch is for personal skincare guidance—always consult a professional for medical decisions.",
                  "Keep your account info accurate and secure; you are responsible for its use.",
                  "We may update features or terms; continued use means you accept the changes.",
                  "Contact our legal team if you have questions or see misuse of the platform."
                ].map((highlight, idx) => (
                  <li key={idx} className="flex gap-3 text-[#1f2d26]/80">
                    <span className="mt-1.5 flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ff6b9d]" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* Email Request Card */}
              <div className="mt-6 rounded-xl border-2 border-blackimage.png/60 bg-white/40 p-5 backdrop-blur-sm shadow-inner">
                <div className="mb-3 flex items-center gap-2">
                  <svg className="h-5 w-5 text-[#ff6b9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#1f2d26]/70">
                    Need a Copy?
                  </p>
                </div>
                <TermsEmailRequest termsEmailBody={termsEmailBody} />
              </div>
            </div>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
