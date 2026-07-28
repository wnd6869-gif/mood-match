import { ANIMAL_MANIFEST } from "@/lib/character/character-manifest";
import type { CharacterComposition } from "@/lib/character/character-types";

export function normalizeComposition(
  value: CharacterComposition,
): CharacterComposition {
  const result = { ...value };
  if (!ANIMAL_MANIFEST[result.animal]) {
    result.animal = "golden-retriever";
  }
  if (result.headAccessory && result.headAccessory === "beret") {
    result.neckAccessory =
      result.neckAccessory === "headphones" ? undefined : result.neckAccessory;
  }
  if (result.neckAccessory === "scarf" && result.outfit === "charcoal-jacket") {
    result.outfit = "cream-knit";
  }
  if (result.handProp && result.foregroundEffect) {
    result.foregroundEffect = undefined;
  }
  return result;
}

export function getCompositionWarnings(value: CharacterComposition) {
  const warnings: string[] = [];
  if (value.headAccessory === "beret" && value.neckAccessory === "headphones") {
    warnings.push("베레모와 헤드폰은 동시에 사용할 수 없어요.");
  }
  if (value.neckAccessory === "scarf" && value.outfit === "charcoal-jacket") {
    warnings.push("목도리와 재킷이 겹쳐 기본 니트로 교체돼요.");
  }
  if (value.handProp && value.foregroundEffect) {
    warnings.push("소품과 전경 효과가 복잡해 전경 효과를 숨겨요.");
  }
  return warnings;
}
