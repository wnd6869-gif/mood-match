import { notFound } from "next/navigation";
import CharacterRenderer from "@/components/character-renderer";
import {
  GOLDEN_RETRIEVER_EXPRESSION_ASSETS,
  GOLDEN_RETRIEVER_EXPRESSION_IDS,
} from "@/lib/character/character-manifest";

const BASE =
  "/character-assets/approval/golden-retriever-v2/b-animal-base.png";

const labels = {
  gentle: "gentle",
  bright: "bright",
  chic: "chic",
  confident: "confident",
  playful: "playful",
} as const;

export default function GoldenExpressionQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-[#f7f4ed] px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-[1520px]">
        <p className="text-sm font-semibold text-[#d9695b]">
          Mood Match Character QA
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          골든리트리버 표정 5종 비교
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          승인된 동물 베이스에 독립된 눈·눈썹·입 레이어만 교체했습니다.
        </p>

        <section className="mt-8 grid grid-cols-5 gap-4">
          {GOLDEN_RETRIEVER_EXPRESSION_IDS.map((expression) => {
            const face = GOLDEN_RETRIEVER_EXPRESSION_ASSETS[expression];
            const layers = [
              { src: BASE },
              { src: face.eyes },
              { src: face.eyebrows },
              { src: face.mouth },
            ];

            return (
              <article
                key={expression}
                className="rounded-[1.75rem] bg-white p-4 shadow-sm"
                data-expression={expression}
              >
                <h2 className="text-center text-lg font-bold">
                  {labels[expression]}
                </h2>

                <div className="mt-4 flex justify-center">
                  <CharacterRenderer
                    animal="golden-retriever"
                    layers={layers}
                    variant="card"
                    className="size-64 rounded-3xl ring-1 ring-black/5"
                    background="#fff8e6"
                    alt={`골든리트리버 ${expression} 256픽셀 상반신`}
                  />
                </div>

                <div className="mt-5 flex items-center justify-center gap-6">
                  <div className="text-center">
                    <CharacterRenderer
                      animal="golden-retriever"
                      layers={layers}
                      variant="avatar"
                      className="size-16 ring-1 ring-black/10"
                      background="#fff8e6"
                      alt={`골든리트리버 ${expression} 64픽셀 정사각형`}
                    />
                    <p className="mt-2 text-[11px] text-neutral-500">
                      64 square
                    </p>
                  </div>

                  <div className="text-center">
                    <CharacterRenderer
                      animal="golden-retriever"
                      layers={layers}
                      variant="avatar"
                      className="size-16 rounded-full ring-1 ring-black/10"
                      background="#fff8e6"
                      alt={`골든리트리버 ${expression} 64픽셀 원형`}
                    />
                    <p className="mt-2 text-[11px] text-neutral-500">
                      64 circle
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
