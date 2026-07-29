import AvatarRenderer from "@/components/avatar-renderer";
import { AVATAR_CATALOG } from "@/lib/avatar-catalog";
import type { CharacterRecipe } from "@/lib/character-casting";

export const dynamic = "force-static";

const recipeFor = (index: number): CharacterRecipe => {
  const item = AVATAR_CATALOG[index];
  const expressionIds = ["gentle", "bright", "chic", "confident", "playful"] as const;
  return {
    systemVersion: "avatar-v1", animalId: item.animalId, outfitBaseId: item.outfitBaseId,
    faceFamily: item.faceFamily, faceRigVersion: item.faceRigVersion,
    expressionId: expressionIds[index % expressionIds.length],
    backgroundId: index % 3 === 0 ? "minimal-cream" : index % 3 === 1 ? "warm-cafe" : "green-park",
    glassesId: index % 4 === 2 ? "round-glasses" : undefined,
    effectId: index % 5 === 4 ? "warm-sparkles" : undefined,
    castingSeed: `qa-${item.outfitBaseId}`,
    signals: { warmth: 50, energy: 50, polish: 50, softness: 50, confidence: 50, playfulness: 40, expression: "neutral", palette: "neutral", settingMood: "clean", wearsGlasses: false, confidenceScore: 80 },
    rationale: "QA 고정 레시피",
  };
};

export default function AvatarCastingQaPage() {
  return (
    <main className="min-h-screen bg-[#fbf7ef] p-6 text-neutral-900 sm:p-10">
      <h1 className="text-3xl font-bold">Avatar casting QA · 13 fixed bases</h1>
      <p className="mt-2 text-sm text-neutral-600">Same persisted recipe at 256 / 128 / 64 square / 64 circle.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {AVATAR_CATALOG.map((item, index) => {
          const recipe = recipeFor(index);
          return <article key={item.outfitBaseId} className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold">{item.outfitBaseId}</h2>
            <p className="mt-1 text-xs text-neutral-500">{item.faceFamily} · {recipe.expressionId} · {recipe.backgroundId}</p>
            <div className="mt-4 flex items-end gap-3">
              <AvatarRenderer recipe={recipe} size={256} className="size-36" />
              <AvatarRenderer recipe={recipe} size={128} className="size-20" />
              <AvatarRenderer recipe={recipe} size={64} className="size-12" />
              <AvatarRenderer recipe={recipe} size={64} shape="circle" className="size-12" />
            </div>
          </article>;
        })}
      </div>
    </main>
  );
}
