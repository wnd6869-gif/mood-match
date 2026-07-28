"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getPrototypeStorageSnapshot,
  parsePrototypeStorage,
  subscribePrototypeStorage,
} from "@/lib/prototype-storage";

function getServerSnapshot() {
  return null;
}

export default function usePrototypeData() {
  const rawValue = useSyncExternalStore(
    subscribePrototypeStorage,
    getPrototypeStorageSnapshot,
    getServerSnapshot,
  );

  return useMemo(() => parsePrototypeStorage(rawValue), [rawValue]);
}
