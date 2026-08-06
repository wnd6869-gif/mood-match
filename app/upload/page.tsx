import { redirect } from "next/navigation";
import ProfilePhotoUpload from "@/components/profile-photo-upload";
import { createOwnProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/upload");
  }

  const [
    { data: baseProfile },
    initialPhotoUrl,
    { data: existingPersona },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle(),
    createOwnProfilePhotoSignedUrl(supabase, user.id),
    supabase
      .from("personas")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!baseProfile) {
    redirect("/onboarding/profile");
  }

  return (
    <ProfilePhotoUpload
      initialPhotoUrl={initialPhotoUrl}
      hasExistingPersona={Boolean(existingPersona)}
    />
  );
}
