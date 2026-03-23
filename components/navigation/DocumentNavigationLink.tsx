"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type DocumentNavigationLinkProps = Readonly<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
  }
>;

export function DocumentNavigationLink({
  children,
  href,
  ...props
}: DocumentNavigationLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
