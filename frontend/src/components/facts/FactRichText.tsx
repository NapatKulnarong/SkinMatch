"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

export default function FactRichText({ text }: { text: string }) {
  return (
    <div
  className={`
    prose max-w-none
    text-gray-800
    prose-p:text-gray-800
    prose-strong:text-gray-900
    prose-h2:text-gray-900
    prose-h3:text-gray-900
  `}
>
  <ReactMarkdown>{text}</ReactMarkdown>
</div>

  );
}
