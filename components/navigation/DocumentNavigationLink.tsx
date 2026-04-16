"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type DocumentNavigationLinkProps = Readonly<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
    prefetch?: boolean;
  }
>;

export function DocumentNavigationLink({
  children,
  href,
  prefetch = true,
  ...props
}: DocumentNavigationLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch}
    >
      {children}
    </Link>
  );
}
