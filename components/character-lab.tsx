"use client";

import { useMemo, useState } from "react";
import ComposedCharacter from "@/components/composed-character";
import {
  ANIMAL_MANIFEST,
  DEFAULT_COMPOSITION,
} from "@/lib/character/character-manifest";
import { exportCharacterImage } from "@/lib/character/character-renderer";
import {
  getCompositionWarnings,
  normalizeComposition,
} from "@/lib/character/character-rules";
import type {
  AnimalId,
  CharacterComposition,
  EyeStyleId,
  MouthStyleId,
} from "@/lib/character/character-types";

const eyes: EyeStyleId[] = ["gentle","bright","chic","confident","focused","cozy","curious","delicate"];
const mouths: MouthStyleId[] = ["small-smile","warm-smile","big-smile","neutral","playful-smirk","shy-smile"];

export default function CharacterLab() {
  const [draft, setDraft] = useState(DEFAULT_COMPOSITION);
  const warnings = useMemo(() => getCompositionWarnings(draft), [draft]);
  const composition = useMemo(() => normalizeComposition(draft), [draft]);
  const update = <K extends keyof CharacterComposition>(
    key: K,
    value: CharacterComposition[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const download = async (type: "image/png" | "image/webp") => {
    const blob = await exportCharacterImage(composition, type);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mood-match-character.${type === "image/png" ? "png" : "webp"}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-5xl p-5">
      <h1 className="text-2xl font-bold">Character Lab</h1>
      <p className="mt-2 text-sm text-neutral-600">에셋 버전 1 · 1024×1024 레이어 QA</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <ComposedCharacter composition={composition} className="mx-auto aspect-square w-full max-w-xl rounded-[2rem]" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-2xl bg-neutral-900 px-4 py-3 text-white" onClick={() => download("image/png")}>PNG 내보내기</button>
            <button className="rounded-2xl border px-4 py-3" onClick={() => download("image/webp")}>WebP 내보내기</button>
          </div>
          {warnings.map((warning) => <p key={warning} className="mt-2 text-sm text-red-600">{warning}</p>)}
        </div>
        <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
          <Select label="동물" value={draft.animal} values={Object.keys(ANIMAL_MANIFEST)} onChange={(v) => update("animal", v as AnimalId)} />
          <Select label="눈·눈썹" value={draft.eyes} values={eyes} onChange={(v) => { update("eyes", v as EyeStyleId); update("eyebrows", v as EyeStyleId); }} />
          <Select label="입" value={draft.mouth} values={mouths} onChange={(v) => update("mouth", v as MouthStyleId)} />
          <Select label="얼굴 효과" value={draft.faceEffect ?? ""} values={["","soft-blush","bright-blush","freckles","sparkle-cheeks"]} onChange={(v) => update("faceEffect", (v || undefined) as CharacterComposition["faceEffect"])} />
          <Select label="의상" value={draft.outfit} values={["cream-knit","coral-hoodie","navy-shirt","sage-cardigan","charcoal-jacket","lavender-sweater"]} onChange={(v) => update("outfit", v as CharacterComposition["outfit"])} />
          <Select label="얼굴 액세서리" value={draft.faceAccessory ?? ""} values={["","round-glasses","thin-glasses"]} onChange={(v) => update("faceAccessory", (v || undefined) as CharacterComposition["faceAccessory"])} />
          <Select label="머리 액세서리" value={draft.headAccessory ?? ""} values={["","beret","beanie","hairpin"]} onChange={(v) => update("headAccessory", (v || undefined) as CharacterComposition["headAccessory"])} />
          <Select label="목 액세서리" value={draft.neckAccessory ?? ""} values={["","headphones","bow-tie","scarf"]} onChange={(v) => update("neckAccessory", (v || undefined) as CharacterComposition["neckAccessory"])} />
          <Select label="손 소품" value={draft.handProp ?? ""} values={["","coffee","book","camera","smartphone","flower","music-player"]} onChange={(v) => update("handProp", (v || undefined) as CharacterComposition["handProp"])} />
          <Select label="배경" value={draft.background} values={["minimal-coral","minimal-sage","minimal-lavender","warm-cafe","cozy-room","green-park","evening-sky","quiet-library"]} onChange={(v) => update("background", v as CharacterComposition["background"])} />
          <Select label="전경 효과" value={draft.foregroundEffect ?? ""} values={["","soft-hearts","tiny-stars","floating-leaves","music-notes","warm-sparkles"]} onChange={(v) => update("foregroundEffect", (v || undefined) as CharacterComposition["foregroundEffect"])} />
          <pre className="overflow-auto rounded-2xl bg-neutral-100 p-3 text-xs">{JSON.stringify(composition, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}

function Select({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold">{label}
      <select className="mt-1 w-full rounded-xl border border-neutral-200 p-2 font-normal" value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => <option key={item || "none"} value={item}>{item || "없음"}</option>)}
      </select>
    </label>
  );
}
