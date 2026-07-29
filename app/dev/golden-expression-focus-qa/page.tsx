import { notFound } from "next/navigation";
import CharacterRenderer from "@/components/character-renderer";
import {
  GOLDEN_RETRIEVER_EXPRESSION_ASSETS,
  type GoldenRetrieverExpressionId,
} from "@/lib/character/character-manifest";

const BASE =
  "/character-assets/approval/golden-retriever-v2/b-animal-base.png";
const expressions: GoldenRetrieverExpressionId[] = [
  "bright",
  "confident",
  "playful",
];

function LayerZoom({ src, label }: { src: string; label: string }) {
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[radial-gradient(#d4d4d4_0.8px,transparent_0.8px)] bg-[length:8px_8px] ring-1 ring-black/10">
        {/* The source remains a full 1024px transparent canvas; this is display-only zoom. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-contain"
          style={{ transform: "translateY(15%) scale(2.4)", transformOrigin: "50% 50%" }}
        />
      </div>
      <p className="mt-2 text-center text-xs font-medium text-neutral-600">{label}</p>
    </div>
  );
}

export default function GoldenExpressionFocusQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-[#f7f4ed] px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-[#d9695b]">Mood Match Character QA</p>
        <h1 className="mt-2 text-3xl font-bold">bright · confident · playful 비교</h1>
        <p className="mt-2 text-sm text-neutral-600">
          동일한 승인 베이스와 display variant 위에서 눈·눈썹·입만 교체했습니다.
        </p>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {expressions.map((expression) => {
            const face = GOLDEN_RETRIEVER_EXPRESSION_ASSETS[expression];
            const layers = [
              { src: BASE },
              { src: face.eyes },
              { src: face.eyebrows },
              { src: face.mouth },
            ];

            return (
              <article key={expression} className="rounded-[2rem] bg-white p-5 shadow-sm">
                <h2 className="text-center text-2xl font-bold">{expression}</h2>
                <div className="mt-5 flex justify-center">
                  <CharacterRenderer
                    animal="golden-retriever"
                    layers={layers}
                    variant="card"
                    className="size-64 rounded-3xl ring-1 ring-black/5"
                    background="#fff8e6"
                    alt={`골든리트리버 ${expression} 256픽셀`}
                  />
                </div>

                <div className="mt-5 flex justify-center gap-8">
                  <div className="text-center">
                    <CharacterRenderer
                      animal="golden-retriever"
                      layers={layers}
                      variant="avatar"
                      className="size-16 ring-1 ring-black/10"
                      background="#fff8e6"
                      alt={`골든리트리버 ${expression} 64픽셀 정사각형`}
                    />
                    <p className="mt-2 text-xs text-neutral-500">64 square</p>
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
                    <p className="mt-2 text-xs text-neutral-500">64 circle</p>
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-3 gap-3">
                  <LayerZoom src={face.eyes} label="eyes" />
                  <LayerZoom src={face.eyebrows} label="eyebrows" />
                  <LayerZoom src={face.mouth} label="mouth" />
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
