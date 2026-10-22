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
        <Link href="/#directory">Find people</Link>
        <Link href="/add/person">Add yourself</Link>
        <Link href="/manage">Manage your posts</Link>
        <Link href="/about">About</Link>
      </nav>
    </details>
  );
}
