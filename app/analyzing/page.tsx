import { redirect } from "next/navigation";
import AnalyzingView from "@/components/analyzing-view";
import { createProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalyzingPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const photoUrl = await createProfilePhotoSignedUrl(
    supabase,
    user.id,
  );

  return <AnalyzingView photoUrl={photoUrl} userId={user.id} />;
}
