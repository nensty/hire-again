"use client";
import { useState } from "react";
import { Icon } from "./icon";
export function CopyButton({ path }: { path?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        path ? new URL(path, location.origin).href : location.href,
      );
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setFailed(true);
    }
  }
  return (
    <>
      <button className="button button-outline" onClick={copy}>
        <Icon name={copied ? "check" : "link"} />
        {copied ? "Link copied" : "Copy link"}
      </button>
      <span className={failed ? "hint" : "sr-only"} role="status">
        {copied
          ? "Copied to clipboard."
          : failed
            ? "Copy the link from your browser’s address bar."
            : ""}
      </span>
    </>
  );
}
