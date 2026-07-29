import { notFound } from "next/navigation";
import CharacterRenderer from "@/components/character-renderer";
import {
  resolveGoldenMvpLayers,
  type GoldenMvpSelection,
} from "@/lib/character/golden-retriever-mvp";

const compositions: Array<{ name: string; selection: GoldenMvpSelection }> = [
  {
    name: "gentle · cream knit sweater · minimal cream",
    selection: {
      expression: "gentle",
      outfit: "cream-knit-sweater",
      background: "minimal-cream",
    },
  },
  {
    name: "bright · coral hoodie · green park",
    selection: {
      expression: "bright",
      outfit: "coral-hoodie",
      background: "green-park",
    },
  },
  {
    name: "chic · navy shirt · round glasses · warm cafe",
    selection: {
      expression: "chic",
      outfit: "navy-shirt",
      background: "warm-cafe",
      faceAccessory: "round-glasses",
    },
  },
];

export default function GoldenMvpCompositionQaPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-dvh bg-[#f7f4ed] px-5 py-10 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-[#d9695b]">Mood Match Character QA</p>
        <h1 className="mt-2 text-3xl font-bold">Golden retriever MVP layer combinations</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Same approved base and expression anchors; only outfit, face accessory, and background layers are composed.
        </p>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {compositions.map(({ name, selection }) => {
            const layers = resolveGoldenMvpLayers(selection).map((src) => ({ src }));
            return (
              <article key={name} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
                <h2 className="text-base font-bold leading-6">{name}</h2>
                <div className="mt-5 flex flex-wrap items-end gap-5">
                  <figure className="text-center">
                    <CharacterRenderer animal="golden-retriever" layers={layers} variant="card" className="size-64 rounded-3xl" alt={name} />
                    <figcaption className="mt-2 text-xs text-neutral-500">256 profile</figcaption>
                  </figure>
                  <figure className="text-center">
                    <CharacterRenderer animal="golden-retriever" layers={layers} variant="card" className="size-32 rounded-2xl" alt={name} />
                    <figcaption className="mt-2 text-xs text-neutral-500">128 card</figcaption>
                  </figure>
                  <figure className="text-center">
                    <CharacterRenderer animal="golden-retriever" layers={layers} variant="avatar" className="size-16 rounded-xl" alt={name} />
                    <figcaption className="mt-2 text-xs text-neutral-500">64 square</figcaption>
                  </figure>
                  <figure className="text-center">
                    <CharacterRenderer animal="golden-retriever" layers={layers} variant="avatar" className="size-16 rounded-full" alt={name} />
                    <figcaption className="mt-2 text-xs text-neutral-500">64 circle</figcaption>
                  </figure>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
