import React from "react";
import clsx from "clsx";

type PageContainerProps<T extends keyof JSX.IntrinsicElements = "div"> = {
  as?: T;
  className?: string;
  children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<T>;

export default function PageContainer<T extends keyof JSX.IntrinsicElements = "div">(
  { as, className, children, ...rest }: PageContainerProps<T>
) {
  const Tag = (as ?? "div") as React.ElementType;
  const composed = clsx("mx-auto w-full max-w-7xl px-6", className);

  return (
    <Tag className={composed} {...(rest as React.ComponentPropsWithoutRef<T>)}>
      {children}
    </Tag>
  );
}
