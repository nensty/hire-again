import type { EntityType } from "./constants";
export function reminderEmail(
  kind: EntityType,
  title: string,
  url: string,
  contact?: string,
) {
  return {
    subject:
      kind === "candidate"
        ? "Still looking for your next team?"
        : "Still hiring?",
    text: `Hi there,\n\nYour ${kind === "candidate" ? "profile" : "role"} (${title}) on People I’d Hire Again expires in five days or less.\n\nKeep it public for another 30 days, or hide it here:\n${url}\n\nYou’re in control. If you do nothing, it will quietly disappear when it expires.\n\nBuilt with care for PandaDoc people.\nIndependent community initiative. Not affiliated with or endorsed by PandaDoc.${contact ? `\nQuestions? ${contact}` : ""}`,
  };
}
