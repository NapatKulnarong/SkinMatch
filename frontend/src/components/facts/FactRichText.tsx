"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

export default function FactRichText({ text }: { text: string }) {
  return (
    <div className="fact-markdown-content">
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ ...props }) => (
            <h1 className="mb-4 mt-6 text-3xl font-bold text-gray-900 first:mt-0" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="mb-3 mt-6 text-2xl font-bold text-gray-900 first:mt-0" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="mb-2 mt-4 text-xl font-semibold text-gray-900 first:mt-0" {...props} />
          ),
          // Paragraphs
          p: ({ ...props }) => (
            <p className="mb-4 text-base leading-relaxed text-gray-800 last:mb-0" {...props} />
          ),
          // Lists
          ul: ({ ...props }) => (
            <ul className="mb-4 ml-6 list-disc space-y-2 text-base text-gray-800 last:mb-0" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-2 text-base text-gray-800 last:mb-0" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          // Strong and emphasis
          strong: ({ ...props }) => (
            <strong className="font-semibold text-gray-900" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic" {...props} />
          ),
          // Links
          a: ({ ...props }) => (
            <a
              className="text-[#33574a] underline hover:text-[#1f2d26] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Code
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ className, children, ...props }: any) => {
            const inline = props.inline;
            const codeProps = { ...props };
            delete codeProps.inline;
            if (inline) {
              return (
                <code
                  className={`rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-900 ${className || ""}`}
                  {...codeProps}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`block overflow-x-auto rounded-lg bg-gray-100 p-4 text-sm font-mono text-gray-900 ${className || ""}`}
                {...codeProps}
              >
                {children}
              </code>
            );
          },
          // Blockquote
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-4 border-l-4 border-[#33574a] pl-4 italic text-gray-700"
              {...props}
            />
          ),
          // Horizontal rule
          hr: ({ ...props }) => (
            <hr className="my-6 border-gray-300" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
