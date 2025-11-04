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
        className="font-semibold text-[#2563eb] underline decoration-[#2563eb]/40 underline-offset-4 transition hover:text-[#1d4ed8]"
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
    <main className="min-h-screen bg-[#f4f8fb] text-[#1f2d26]">
      <section className="border-b border-[#1f2d26]/10 bg-[#ffe7da] py-24">
        <PageContainer className="space-y-6">
          <p className="inline-flex items-center rounded-full border-2 border-black/10 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1f2d26]/70 shadow-[4px_4px_0_rgba(31,45,38,0.18)]">
            Terms & Trust
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-[#1f2d26]/80 sm:text-xl">
            These terms outline the rules for using SkinMatch. Please read them carefully so
            you understand your rights, responsibilities, and the limits of our services.
          </p>
          <p className="text-sm font-semibold text-[#1f2d26]/60">
            Effective date: {TERMS_LAST_UPDATED}
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
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-base leading-relaxed text-[#1f2d26]/80">
                    {renderParagraph(paragraph)}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-3 rounded-2xl border border-[#1f2d26]/10 bg-[#fff7f0] p-5">
                    {section.bullets.map((item) => (
                      <li key={item} className="text-base leading-relaxed text-[#1f2d26]/80">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </article>

          <aside className="flex flex-col gap-6 rounded-3xl border-2 border-black bg-[#1f2d26] p-8 text-white shadow-[8px_10px_0_rgba(31,45,38,0.3)]">
            <h2 className="text-2xl font-bold">Quick Highlights</h2>
            <ul className="space-y-4 text-sm leading-relaxed">
              <li>
                SkinMatch is for personal skincare guidance—always consult a professional
                for medical decisions.
              </li>
              <li>
                Keep your account info accurate and secure; you are responsible for its
                use.
              </li>
              <li>
                We may update features or terms; continued use means you accept the
                changes.
              </li>
              <li>
                Contact our legal team if you have questions or see misuse of the
                platform.
              </li>
            </ul>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-relaxed">
              <p className="font-semibold uppercase tracking-[0.25em] text-white/70">
                Need a copy?
              </p>
              <TermsEmailRequest termsEmailBody={termsEmailBody} />
            </div>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
