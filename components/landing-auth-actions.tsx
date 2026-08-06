"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionLink } from "@/components/action";
import { createClient } from "@/lib/supabase/client";

type Placement = "nav" | "cta";

function LandingAuthActions({ placement }: { placement: Placement }) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let isActive = true;
    const syncSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (isActive) setIsSignedIn(Boolean(user));
    };

    void syncSession();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsSignedIn(Boolean(session?.user)),
    );
    // Browsers can restore the pre-login landing page from back/forward cache.
    // Read the current Supabase session again instead of showing stale guest UI.
    window.addEventListener("pageshow", syncSession);

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("pageshow", syncSession);
    };
  }, []);

  if (placement === "nav") {
    return (
      <Link
        href={isSignedIn ? "/home" : "/login"}
        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700"
      >
        {isSignedIn ? "내 홈" : "로그인"}
      </Link>
    );
  }

  return (
    <ActionLink
      href={isSignedIn ? "/upload" : "/login?next=/upload"}
      ariaLabel="로그인 상태에 맞춰 내 동물 캐릭터 만들기"
    >
      {isSignedIn ? "내 캐릭터 만들기" : "로그인하고 내 캐릭터 만들기"}
    </ActionLink>
  );
}

export function LandingNavAuthAction() {
  return <LandingAuthActions placement="nav" />;
}

export function LandingCtaAuthAction() {
  return <LandingAuthActions placement="cta" />;
}
