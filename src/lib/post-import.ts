import { normalizePostUrl, type PostKind } from "./posts";
import type { FUNCTIONS } from "./constants";
export interface PostDraft {
  url: string;
  title: string;
  author_name: string;
  role_label: string;
  function: (typeof FUNCTIONS)[number] | "";
  skills: string[];
  kind: PostKind;
  note: string;
}
export function suggestPostTags(role: string): {
  function: PostDraft["function"];
  skills: string[];
} {
  const skills: string[] = [];
  for (const [pattern, label] of [
    [/\bpython\b/i, "Python"],
    [/\btypescript\b/i, "TypeScript"],
    [/\breact\b/i, "React"],
    [/\bautomation\b/i, "Automation"],
    [/\bsdet\b/i, "SDET"],
    [/\bdevops\b/i, "DevOps"],
    [/\bux\b/i, "UX design"],
  ] as const)
    if (pattern.test(role)) skills.push(label);
  const group = /devops|\bsre\b/i.test(role)
    ? "DevOps / SRE"
    : /automation|sdet|quality|\bqa\b/i.test(role)
      ? "QA / Automation"
      : /design|\bux\b/i.test(role)
        ? "Design"
        : /engineer|developer/i.test(role)
          ? "Engineering"
          : "";
  return { function: group, skills: skills.slice(0, 5) };
}
export function parsePostList(text: string): {
  posts: PostDraft[];
  duplicates: number;
  ignored: number;
} {
  const posts: PostDraft[] = [];
  const seen = new Set<string>();
  let duplicates = 0,
    ignored = 0;
  for (const block of text.split(/\n\s*\n/)) {
    const urls = block.match(/https?:\/\/[^\s<>\[\]()]+/g) || [];
    const prefix = block
      .split(/https?:\/\//)[0]
      .replace(/[\[\]:]+$/g, "")
      .trim();
    const firstLine = prefix
      .split("\n")[0]
      .split(/\s{2,}/)[0]
      .trim();
    const parts = firstLine.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    const author = parts?.[1].trim().slice(0, 100) || "";
    const role =
      parts?.[2]
        .replace(/\s+(If you|Check |Please ).*$/i, "")
        .trim()
        .slice(0, 120) || "";
    const blockSeen = new Set<string>();
    for (const raw of urls) {
      let url: string;
      try {
        url = normalizePostUrl(raw.replace(/[.,;]+$/, ""));
      } catch {
        ignored++;
        continue;
      }
      // Markdown commonly contains both a visible short link and its safety-wrapper destination.
      if (blockSeen.has(url)) continue;
      blockSeen.add(url);
      if (seen.has(url)) {
        duplicates++;
        continue;
      }
      seen.add(url);
      posts.push({
        url,
        title: role || "Shared LinkedIn post",
        author_name: author,
        role_label: role,
        ...suggestPostTags(role),
        kind: role ? "looking" : "community",
        note: "",
      });
    }
  }
  return { posts, duplicates, ignored };
}
