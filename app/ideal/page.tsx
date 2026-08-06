import { redirect } from "next/navigation";

// Kept as a safe legacy URL for existing links and bookmarks. The previous
// preference step is no longer part of the conversation-first product flow.
export default function IdealPage() {
  redirect("/profile/conversation-preferences?next=/match-preview");
}
