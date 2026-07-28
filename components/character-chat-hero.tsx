import Image from "next/image";

export default function CharacterChatHero() {
  return (
    <figure
      className="relative mx-auto aspect-[21/11] w-full max-w-[420px] overflow-hidden rounded-[2rem] border border-coral-100 bg-gradient-to-br from-white via-coral-50 to-[#fff1e8] shadow-[0_18px_50px_rgba(168,71,62,0.10)]"
      role="img"
      aria-label="사진 한 장을 올리면 AI가 내 분위기를 담은 동물 캐릭터를 만들고, 다른 캐릭터와 가볍게 대화를 시작하는 과정"
    >
      <Image
        src="/character-chat-flow.png"
        alt=""
        fill
        priority
        sizes="(max-width: 448px) calc(100vw - 40px), 420px"
        className="object-cover object-center"
      />

      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute inset-x-[3%] bottom-[7%] grid grid-cols-3 items-center">
          <span className="justify-self-center whitespace-nowrap rounded-full border border-neutral-200/80 bg-white/95 px-2.5 py-1 text-[9px] font-bold text-neutral-600 shadow-sm backdrop-blur-sm sm:text-[10px]">
            사진 한 장
          </span>
          <span className="justify-self-center whitespace-nowrap rounded-full border border-coral-100 bg-white/95 px-2.5 py-1 text-[9px] font-bold text-coral-700 shadow-sm backdrop-blur-sm sm:text-[10px]">
            AI 캐릭터
          </span>
          <span className="justify-self-center whitespace-nowrap rounded-full border border-neutral-200/80 bg-white/95 px-2.5 py-1 text-[9px] font-bold text-neutral-600 shadow-sm backdrop-blur-sm sm:text-[10px]">
            가볍게 대화
          </span>
        </div>
      </div>
    </figure>
  );
}
