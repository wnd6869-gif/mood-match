import Link from "next/link";
import { ADMIN_ROLE_LABELS, requireAdmin } from "@/lib/admin";

const ADMIN_NAVIGATION = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/reports", label: "신고" },
  { href: "/admin/audit", label: "감사 로그" },
] as const;

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireAdmin();

  return (
    <div className="min-h-dvh bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-neutral-200 bg-white px-5 py-5 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-center justify-between gap-4 lg:block">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-coral-600">
                MOOD MATCH
              </p>
              <h1 className="mt-1 text-xl font-bold">운영 관리자</h1>
              <p className="mt-1 text-xs text-neutral-400">
                {ADMIN_ROLE_LABELS[role]}
              </p>
            </div>
            <Link
              href="/mypage"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              앱으로 돌아가기
            </Link>
          </div>

          <nav
            aria-label="관리자 메뉴"
            className="mt-5 flex gap-2 overflow-x-auto lg:mt-8 lg:flex-col"
          >
            {ADMIN_NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
