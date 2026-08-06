"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getPrototypeStorageSnapshot,
  parsePrototypeStorage,
  subscribePrototypeStorage,
} from "@/lib/onboarding-draft-storage";

function getServerSnapshot() {
  return null;
}

export default function useOnboardingDraft() {
  const rawValue = useSyncExternalStore(
    subscribePrototypeStorage,
    getPrototypeStorageSnapshot,
    getServerSnapshot,
  );

  return useMemo(() => parsePrototypeStorage(rawValue), [rawValue]);
}
