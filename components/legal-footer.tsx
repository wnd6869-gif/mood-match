import Link from "next/link";
import { getContactHref } from "@/lib/legal";

const LEGAL_LINKS = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: getContactHref(), label: "문의" },
  { href: "/terms#beta", label: "베타 서비스 안내" },
] as const;

export default function LegalFooter() {
  return (
    <footer className="mx-auto mt-12 w-full max-w-md border-t border-neutral-200 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-6">
      <nav
        aria-label="서비스 정책 및 문의"
        className="flex flex-wrap justify-center gap-x-4 gap-y-2"
      >
        {LEGAL_LINKS.map((item) =>
          item.href.startsWith("mailto:") ? (
            <a
              key={item.label}
              href={item.href}
              className="text-xs font-medium text-neutral-500 underline-offset-4 hover:text-neutral-800 hover:underline"
            >
              {item.label}
            </a>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="text-xs font-medium text-neutral-500 underline-offset-4 hover:text-neutral-800 hover:underline"
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
      <p className="mt-3 text-center text-[11px] leading-5 text-neutral-400">
        현재 베타 서비스로 기능과 정책이 변경될 수 있어요.
      </p>
    </footer>
  );
}
