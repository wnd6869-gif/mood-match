import { notFound } from "next/navigation";
import CharacterRenderer from "@/components/character-renderer";
import { APPROVED_GOLDEN_RETRIEVER_LAYERS } from "@/lib/character/character-manifest";
import type { CharacterDisplayVariant } from "@/lib/character/character-types";

const previews: {
  variant: CharacterDisplayVariant;
  size: number;
  label: string;
  purpose: string;
}[] = [
  { variant: "full", size: 512, label: "full · 512×512", purpose: "상세 및 결과" },
  { variant: "card", size: 128, label: "card · 128×128", purpose: "둘러보기 및 프로필 카드" },
  { variant: "avatar", size: 64, label: "avatar · 64×64", purpose: "채팅 목록과 하단 UI" },
  { variant: "avatar-small", size: 40, label: "avatar-small · 40×40", purpose: "40×40 이하 아바타" },
];

const layers = APPROVED_GOLDEN_RETRIEVER_LAYERS.map((src) => ({ src }));

export default function CharacterDisplayVariantsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-[#f7f4ed] px-5 py-10 text-neutral-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-[#d9695b]">Mood Match Character QA</p>
        <h1 className="mt-2 text-3xl font-bold">골든리트리버 표시 variant 비교</h1>
        <p className="mt-2 text-sm text-neutral-600">
          승인된 동일 1024×1024 레이어 4개를 CSS transform으로만 확대·크롭했습니다.
        </p>

        <section className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="font-bold">full · 512×512</h2>
            <p className="mt-1 text-sm text-neutral-500">전체 몸과 앞발, 양쪽 귀 유지</p>
            <CharacterRenderer
              animal="golden-retriever"
              layers={layers}
              variant="full"
              className="mx-auto mt-5 aspect-square w-full max-w-[512px] rounded-3xl"
              background="#fff8e6"
            />
          </article>

          <div className="space-y-5">
            {previews.slice(1).map((preview) => (
              <article
                key={preview.variant}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <div>
                  <h2 className="font-bold">{preview.label}</h2>
                  <p className="mt-1 text-xs text-neutral-500">{preview.purpose}</p>
                </div>
                <div className="mt-4 flex min-h-36 items-center justify-center rounded-2xl bg-neutral-100">
                  <div
                    className="shrink-0"
                    style={{ width: preview.size, height: preview.size }}
                  >
                    <CharacterRenderer
                      animal="golden-retriever"
                      layers={layers}
                      variant={preview.variant}
                      className="size-full rounded-full ring-1 ring-black/10"
                      background="#fff8e6"
                      alt={`골든리트리버 ${preview.variant} 미리보기`}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
