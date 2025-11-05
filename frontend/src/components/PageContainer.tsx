import { PropsWithChildren, HTMLAttributes } from "react";

type PageContainerProps = PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}> &
  Omit<HTMLAttributes<HTMLElement>, "className">;

export default function PageContainer({
  as: Tag = "div",
  className,
  children,
  ...rest
}: PageContainerProps) {
  const base = "mx-auto w-full max-w-7xl px-6";
  const composed = className ? `${base} ${className}` : base;

  return (
    <Tag className={composed} {...rest}>
      {children}
    </Tag>
  );
}
