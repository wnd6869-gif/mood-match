import { redirect } from "next/navigation";
import ProfilePhotoUpload from "@/components/profile-photo-upload";
import { createProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
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
    redirect("/login");
  }

  const initialPhotoUrl = await createProfilePhotoSignedUrl(
    supabase,
    user.id,
  );
  const { data: existingPersona } = await supabase
    .from("personas")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <ProfilePhotoUpload
      initialPhotoUrl={initialPhotoUrl}
      hasExistingPersona={Boolean(existingPersona)}
    />
  );
}
