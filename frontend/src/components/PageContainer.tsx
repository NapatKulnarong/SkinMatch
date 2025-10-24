import { PropsWithChildren } from "react";

type PageContainerProps = PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}>;

export default function PageContainer({
  as: Tag = "div",
  className,
  children,
}: PageContainerProps) {
  const base = "mx-auto w-full max-w-7xl px-6";
  const composed = className ? `${base} ${className}` : base;

  return <Tag className={composed}>{children}</Tag>;
}
