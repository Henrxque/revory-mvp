"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type DocumentNavigationLinkProps = Readonly<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
  }
>;

function shouldKeepNativeNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export function DocumentNavigationLink({
  children,
  href,
  onClick,
  ...props
}: DocumentNavigationLinkProps) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (shouldKeepNativeNavigation(event)) {
          return;
        }

        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </a>
  );
}
