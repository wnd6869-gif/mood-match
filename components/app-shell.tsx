import type { ReactNode } from "react";
import LegalFooter from "@/components/legal-footer";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export default function AppShell({
  children,
  className = "",
}: AppShellProps) {
  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden bg-neutral-50 px-5 py-6 sm:py-8">
      <section className={`mx-auto w-full max-w-md flex-1 ${className}`}>
        {children}
      </section>
      <LegalFooter />
    </main>
  );
}
