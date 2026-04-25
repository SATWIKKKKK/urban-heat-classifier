"use client";

import Link from 'next/link';
import React from 'react';

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  children?: React.ReactNode;
}

export default function DownloadLinkClient({ href, className, style, 'aria-label': ariaLabel, children, ...rest }: Props) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <Link href={href} onClick={handleClick} className={className} style={style} aria-label={ariaLabel} {...rest}>
      {children}
    </Link>
  );
}
