import Link from "next/link";

type MobileNavItem = {
  href: string;
  label: string;
  icon: string;
  key: "discover" | "requests" | "chats" | "mypage";
};

const ITEMS: MobileNavItem[] = [
  { href: "/discover", label: "둘러보기", icon: "◌", key: "discover" },
  { href: "/requests", label: "요청", icon: "↔", key: "requests" },
  { href: "/chats", label: "채팅", icon: "▢", key: "chats" },
  { href: "/mypage", label: "마이", icon: "○", key: "mypage" },
];

export default function MobileNav({
  current,
}: {
  current: MobileNavItem["key"];
}) {
  return (
    <>
      <div className="h-24" aria-hidden="true" />
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1">
          {ITEMS.map((item) => {
            const selected = current === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
                  selected
                    ? "bg-coral-50 text-coral-700"
                    : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                }`}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  {item.icon}
                </span>
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
