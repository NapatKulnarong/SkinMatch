"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

type FactBlockProps = {
  content: string;
};

export default function FactBlock({ content }: FactBlockProps) {
  return (
    <div className="prose prose-neutral max-w-none text-base leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-p:my-3 prose-ul:my-3 prose-li:my-1">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
