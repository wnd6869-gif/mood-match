import { ANIMAL_MANIFEST } from "@/lib/character/character-manifest";
import type { CharacterComposition } from "@/lib/character/character-types";

export function normalizeComposition(
  value: CharacterComposition,
): CharacterComposition {
  const result = { ...value } as CharacterComposition & {
    headAccessory?: unknown;
    neckAccessory?: unknown;
    handProp?: unknown;
  };
  delete result.headAccessory;
  delete result.neckAccessory;
  delete result.handProp;
  if (!ANIMAL_MANIFEST[result.animal]) result.animal = "golden-retriever";
  // Legacy recipes can contain accessory/prop slots removed from the public
  // contract. They are deliberately ignored during rendering and export.
  return result;
}

export function getCompositionWarnings(value: CharacterComposition) {
  void value;
  const warnings: string[] = [];
  return warnings;
}
