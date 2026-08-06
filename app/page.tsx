import Link from "next/link";
import CharacterAvatar from "@/components/character-avatar";
import {
  LandingCtaAuthAction,
  LandingNavAuthAction,
} from "@/components/landing-auth-actions";
import LegalFooter from "@/components/legal-footer";
import type { CharacterRecipe } from "@/lib/character-casting";

type LandingCharacter = {
  name: string;
  handle: string;
  mood: string;
  topics: string;
  accent: string;
  recipe: CharacterRecipe;
};

const SIGNALS: CharacterRecipe["signals"] = {
  warmth: 70,
  energy: 55,
  polish: 58,
  softness: 72,
  confidence: 62,
  playfulness: 60,
  expression: "smiling",
  palette: "warm",
  settingMood: "cozy",
  wearsGlasses: false,
  confidenceScore: 68,
};

const LANDING_CHARACTERS: LandingCharacter[] = [
  {
    name: "다정한 수달형",
    handle: "@느긋한수달",
    mood: "가벼운 일상 대화",
    topics: "영화 · 맛집 · 여행",
    accent: "bg-[#dff2e7] text-[#267257]",
    recipe: {
      systemVersion: "avatar-v1",
      animalId: "otter",
      outfitBaseId: "otter-sage-green-hoodie",
      faceFamily: "round-muzzle",
      faceRigVersion: "round-muzzle-v1",
      expressionId: "gentle",
      backgroundId: "minimal-cream",
      castingSeed: "landing-otter-v1",
      signals: SIGNALS,
      rationale: "Landing character example.",
    },
  },
  {
    name: "시크한 고양이형",
    handle: "@차분한러시안블루",
    mood: "취향 깊은 대화",
    topics: "전시 · 음악 · 카페",
    accent: "bg-[#ede8ff] text-[#6852aa]",
    recipe: {
      systemVersion: "avatar-v1",
      animalId: "russian-blue",
      outfitBaseId: "russian-blue-navy-cardigan",
      faceFamily: "cat",
      faceRigVersion: "cat-v1",
      expressionId: "chic",
      backgroundId: "warm-cafe",
      glassesId: "round-glasses",
      castingSeed: "landing-russian-blue-v1",
      signals: { ...SIGNALS, polish: 84, palette: "cool", expression: "neutral" },
      rationale: "Landing character example.",
    },
  },
  {
    name: "활기찬 리트리버형",
    handle: "@밝은골든리트리버",
    mood: "새로운 사람과 수다",
    topics: "산책 · 취미 · 주말",
    accent: "bg-[#fff0dc] text-[#b46525]",
    recipe: {
      systemVersion: "avatar-v1",
      animalId: "golden-retriever",
      outfitBaseId: "golden-retriever-coral-hoodie",
      faceFamily: "round-muzzle",
      faceRigVersion: "round-muzzle-v1",
      expressionId: "bright",
      backgroundId: "green-park",
      castingSeed: "landing-golden-v1",
      signals: { ...SIGNALS, energy: 82, expression: "smiling", settingMood: "natural" },
      rationale: "Landing character example.",
    },
  },
];

const STEPS = [
  ["01", "사진 분석", "한 명의 얼굴과 눈·코·입이 잘 보이는 사진으로 분위기를 분석해요."],
  ["02", "내 캐릭터", "분석 결과를 바탕으로 나만의 동물 캐릭터와 ID가 완성돼요."],
  ["03", "대화 취향", "친구·가벼운 대화·취미처럼 원하는 연결 방식을 고릅니다."],
  ["04", "둘러보기·대화", "실제 공개 캐릭터를 만나거나 3~6명 소규모 대화에 참여해요."],
] as const;

export default function LandingPage() {
  const [otter, cat, dog] = LANDING_CHARACTERS;

  return (
    <main className="overflow-x-hidden bg-[#fcfbf8] text-neutral-900">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-black tracking-tight">Mood Match</Link>
        <LandingNavAuthAction />
      </nav>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-7 sm:px-8 lg:grid-cols-[1fr_0.94fr] lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex rounded-full bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-700">
            사진의 분위기가 나만의 동물 캐릭터가 돼요
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.1] tracking-[-0.045em] sm:text-6xl">
            사진은 캐릭터로,
            <br />
            대화는 부담 없이.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg">
            AI가 사진의 분위기를 바탕으로 동물 캐릭터를 만들고, 대화 목적과 취향이 맞는 사람을 연결해요.
          </p>
          <div className="mt-8 max-w-sm"><LandingCtaAuthAction /></div>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            처음에는 동물 캐릭터만 보여요. 실제 사진은 서로 동의한 대화에서만 공개할 수 있어요.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-[#e9f3dd] via-[#f0eaff] to-[#fff0d8] blur-2xl" />
          <article className="relative overflow-hidden rounded-[2.25rem] border border-white bg-[#fffaf0] p-3 shadow-[0_28px_70px_rgba(33,30,25,0.16)]">
            <CharacterAvatar recipe={otter.recipe} priority className="aspect-[1/1] rounded-[1.75rem]" />
            <div className="absolute inset-x-3 bottom-3 rounded-b-[1.75rem] bg-gradient-to-t from-black/75 via-black/40 to-transparent px-5 pb-5 pt-16 text-white">
              <p className="text-[10px] font-black tracking-[0.16em] text-white/75">MY ANIMAL CHARACTER</p>
              <h2 className="mt-1 text-2xl font-black">{otter.name}</h2>
              <p className="mt-1 text-sm text-white/80">{otter.handle}</p>
            </div>
          </article>
          <div className="absolute -bottom-5 -left-5 rounded-2xl border border-white bg-white px-4 py-3 shadow-lg">
            <p className="text-xs font-bold text-coral-600">기본은 캐릭터 공개</p>
            <p className="mt-1 text-xs text-neutral-500">실제 사진은 상호 동의 후</p>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-100 bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-coral-600">실제 캐릭터 예시</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">분위기는 다르게, 대화는 자연스럽게</h2>
            </div>
            <Link href="/discover" className="text-sm font-bold text-neutral-600 underline underline-offset-4">캐릭터 둘러보기</Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {LANDING_CHARACTERS.map((character) => (
              <article key={character.name} className="overflow-hidden rounded-[1.75rem] border border-neutral-100 bg-[#fcfbf8] p-3 shadow-sm">
                <CharacterAvatar recipe={character.recipe} variant="card" className="aspect-square rounded-[1.25rem]" />
                <div className="px-2 pb-2 pt-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${character.accent}`}>{character.mood}</span>
                  <h3 className="mt-3 text-lg font-black">{character.name}</h3>
                  <p className="mt-1 text-sm text-neutral-500">{character.topics}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-bold text-coral-600">이용 과정</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">내 캐릭터부터 첫 대화까지</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([number, title, description]) => (
            <article key={number} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
              <span className="text-xs font-black text-coral-500">{number}</span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-neutral-900 py-16 text-white sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold text-coral-400">어떤 대화든 가볍게 시작</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">친구, 일상, 취미,
              <br />새로운 인연까지.</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-neutral-300">
              1:1 대화가 부담스럽다면 3~6명 소규모 단체방에서 먼저 함께 이야기할 수 있어요.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm font-bold">
              {['친구 찾기', '가벼운 일상', '취미 대화', '소규모 그룹'].map((goal) => (
                <div key={goal} className="rounded-2xl bg-white/10 px-4 py-3">{goal}</div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[1.75rem] bg-[#f8f6f2] p-4 text-neutral-900">
              <div className="flex gap-3">
                <CharacterAvatar recipe={cat.recipe} variant="avatar" className="size-16 shrink-0 rounded-2xl" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-coral-600">추천 캐릭터</p>
                  <h3 className="mt-1 font-black">{cat.name}</h3>
                  <p className="mt-1 text-xs text-neutral-500">{cat.topics}</p>
                </div>
              </div>
              <button type="button" className="mt-4 min-h-11 w-full rounded-xl bg-neutral-900 text-sm font-bold text-white">대화 요청</button>
            </article>
            <article className="rounded-[1.75rem] bg-white/10 p-4">
              <div className="flex items-center gap-3 border-b border-white/15 pb-3">
                <CharacterAvatar recipe={dog.recipe} variant="avatar" className="size-11 rounded-full" />
                <div><p className="text-sm font-bold">{dog.handle}</p><p className="text-xs text-white/60">취미 대화 중</p></div>
              </div>
              <div className="mt-4 space-y-2 text-xs leading-5">
                <p className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-white/15 px-3 py-2.5">이번 주말에 가볍게 갈 만한 곳 있어요?</p>
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-coral-500 px-3 py-2.5">좋아요. 취향 비슷한 것 같아요!</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[2.5rem] bg-coral-50 px-6 py-12">
          <p className="text-sm font-bold text-coral-600">BETA OPEN</p>
          <h2 className="mt-3 text-3xl font-black">내 분위기의 동물 캐릭터를 만나보세요.</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">사진 한 장으로 시작하고, 대화는 천천히 선택하면 돼요.</p>
          <div className="mx-auto mt-6 max-w-sm"><LandingCtaAuthAction /></div>
        </div>
      </section>
      <LegalFooter />
    </main>
  );
}
