import Link from "next/link";
import { ActionLink } from "@/components/action";
import CharacterAvatar from "@/components/character-avatar";
import LegalFooter from "@/components/legal-footer";

const EXAMPLES = [
  {
    key: "otter" as const,
    name: "다정한 수달형",
    description: "편안한 일상 대화를 좋아하는 포근한 캐릭터",
  },
  {
    key: "cat" as const,
    name: "시크한 고양이형",
    description: "차분한 취향 이야기에 끌리는 세련된 캐릭터",
  },
  {
    key: "dog" as const,
    name: "활기찬 강아지형",
    description: "가벼운 농담과 새로운 경험을 즐기는 캐릭터",
  },
] as const;

const STEPS = [
  ["01", "사진 분석", "한 명의 얼굴이 선명한 사진으로 분위기를 분석해요."],
  ["02", "캐릭터 생성", "대표 동물과 분위기로 나만의 동물 아바타를 만들어요."],
  ["03", "취향으로 연결", "대화 목적과 관심사가 가까운 실제 사용자를 찾아요."],
  ["04", "대화", "캐릭터로 먼저 인사하고 편하게 이야기를 이어가요."],
] as const;

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden bg-[#fbfaf8] text-neutral-900">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-black tracking-tight">
          Mood Match
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700"
        >
          로그인
        </Link>
      </nav>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-24">
        <div>
          <span className="inline-flex rounded-full bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-700">
            얼굴 대신, 나를 닮은 동물 캐릭터
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.12] tracking-[-0.04em] sm:text-6xl">
            내 분위기를 담은
            <br />
            동물 캐릭터로
            <br />
            먼저 인사해요
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg">
            사진에서 느껴지는 분위기를 실제 동물 아바타로 만들고, 대화
            목적과 취향이 맞는 사람을 캐릭터로 먼저 만나보세요.
          </p>
          <div className="mt-8 max-w-sm">
            <ActionLink
              href="/login?next=/upload"
              ariaLabel="로그인하고 내 동물 캐릭터 만들기"
            >
              내 캐릭터 만들기
            </ActionLink>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            실제 사진은 기본 비공개이며 서로 동의한 경우에만 공개돼요.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-[#dff7ed] via-[#eee7ff] to-[#fff0d9] blur-2xl" />
          <div className="relative grid grid-cols-2 gap-3 rounded-[2.5rem] border border-white/80 bg-white/75 p-3 shadow-[0_30px_80px_rgba(23,23,23,0.12)] backdrop-blur">
            <CharacterAvatar
              avatarKey="otter"
              priority
              className="col-span-2 aspect-[16/10] rounded-[2rem]"
              imageClassName="object-[center_38%]"
            />
            <CharacterAvatar
              avatarKey="cat"
              priority
              className="aspect-square rounded-[1.5rem]"
            />
            <CharacterAvatar
              avatarKey="dog"
              priority
              className="aspect-square rounded-[1.5rem]"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <p className="text-sm font-bold text-coral-600">캐릭터 예시</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">
            같은 스타일, 서로 다른 분위기
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {EXAMPLES.map((example) => (
              <article key={example.key} className="group">
                <CharacterAvatar
                  avatarKey={example.key}
                  className="aspect-square rounded-[2rem]"
                />
                <h3 className="mt-4 text-xl font-bold">{example.name}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {example.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <p className="text-sm font-bold text-coral-600">이용 과정</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">
          사진 한 장에서 대화까지
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([number, title, description]) => (
            <article
              key={number}
              className="rounded-[1.75rem] bg-white p-5 shadow-sm"
            >
              <span className="text-xs font-black text-coral-500">
                {number}
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-neutral-900 py-20 text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-coral-400">안전한 사진 공개</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">
              처음에는 캐릭터만,
              <br />
              실제 사진은 서로 선택할 때만
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-neutral-300">
              공개 프로필과 추천 카드에는 동물 캐릭터가 기본으로 표시돼요.
              1:1 대화에서 두 사람이 각각 동의한 경우에만 실제 사진을
              확인할 수 있고, 한쪽이 철회하면 다시 숨겨집니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["친구", "가벼운 대화", "취미 대화", "새로운 인연"].map(
              (goal, index) => (
                <div
                  key={goal}
                  className="flex min-h-28 flex-col justify-between rounded-[1.75rem] bg-white/10 p-4"
                >
                  <span className="text-xl" aria-hidden="true">
                    {["☁", "◡", "✦", "↗"][index]}
                  </span>
                  <p className="font-bold">{goal}</p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <p className="text-sm font-bold text-coral-600">서비스 미리보기</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">
          캐릭터를 보고, 이유를 확인하고, 대화해요
        </h2>
        <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-2">
          <article className="overflow-hidden rounded-[2.25rem] bg-white p-4 shadow-[0_18px_50px_rgba(23,23,23,0.09)]">
            <div className="grid grid-cols-[7rem_1fr] gap-4">
              <CharacterAvatar
                avatarKey="otter"
                className="aspect-square rounded-[1.5rem]"
              />
              <div className="py-2">
                <span className="rounded-full bg-[#eef7f2] px-2.5 py-1 text-xs font-bold text-[#35705a]">
                  추천 82%
                </span>
                <h3 className="mt-3 font-bold">@포근한 느긋한 수달</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  영화 · 맛집 · 여행
                </p>
                <p className="mt-2 text-xs font-semibold text-coral-600">
                  보통 저녁에 접속
                </p>
              </div>
            </div>
            <button className="mt-4 min-h-12 w-full rounded-2xl bg-neutral-900 text-sm font-bold text-white">
              대화 요청
            </button>
          </article>

          <article className="rounded-[2.25rem] bg-[#f1eee9] p-5 shadow-[0_18px_50px_rgba(23,23,23,0.07)]">
            <div className="flex items-center gap-3 border-b border-neutral-300/60 pb-4">
              <CharacterAvatar
                avatarKey="cat"
                className="size-11 rounded-full"
              />
              <div>
                <p className="text-sm font-bold">@조용한 시크한 고양이</p>
                <p className="text-xs text-neutral-500">차분한 취향 대화</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <p className="mr-auto max-w-[82%] rounded-2xl rounded-bl-md bg-white px-4 py-3">
                요즘 본 영화 중에 기억에 남는 작품 있어요?
              </p>
              <p className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-3 text-white">
                있어요! 취향이 비슷한 것 같아서 반갑네요.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="px-5 pb-16 text-center sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[2.5rem] bg-coral-50 px-6 py-12">
          <h2 className="text-3xl font-black">내 동물 캐릭터를 만나볼까요?</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            로그인 후 사진 한 장으로 바로 시작할 수 있어요.
          </p>
          <div className="mx-auto mt-6 max-w-sm">
            <ActionLink
              href="/login?next=/upload"
              ariaLabel="로그인하고 내 동물 캐릭터 만들기"
            >
              내 캐릭터 만들기
            </ActionLink>
          </div>
        </div>
      </section>
      <LegalFooter />
    </main>
  );
}
