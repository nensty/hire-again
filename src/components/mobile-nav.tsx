"use client";
import Link from "next/link";
import { useRef } from "react";
export function MobileNav() {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details className="mobile-menu" ref={menu}>
      <summary>Menu</summary>
      <nav
        aria-label="Mobile navigation"
        onClick={() => {
          if (menu.current) menu.current.open = false;
        }}
      >
        <Link href="/#directory">Browse people</Link>
        <Link href="/?view=roles#directory">Hiring now</Link>
        <Link href="/add/role">We’re hiring</Link>
        <Link href="/manage">Manage listing</Link>
      </nav>
    </details>
  );
}
