"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionLink } from "@/components/action";
import { createClient } from "@/lib/supabase/client";

type Placement = "nav" | "cta";

function LandingAuthActions({ placement }: { placement: Placement }) {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    window.addEventListener("pageshow", syncSession);

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("pageshow", syncSession);
    };
  }, []);

  async function handleSignOut() {
    if (isSigningOut) return;
    const supabase = createClient();
    if (!supabase) return;

    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setIsSigningOut(false);
      return;
    }

    setIsSignedIn(false);
    router.replace("/");
    router.refresh();
  }

  if (placement === "nav") {
    if (isSignedIn) {
      return (
        <div className="flex items-center gap-2">
          <Link
            href="/home"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700"
          >
            내 홈
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded-full px-3 py-2 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-60"
          >
            {isSigningOut ? "로그아웃 중" : "로그아웃"}
          </button>
        </div>
      );
    }

    return (
      <Link
        href="/login"
        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700"
      >
        로그인
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
