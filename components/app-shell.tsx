import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export default function AppShell({
  children,
  className = "",
}: AppShellProps) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-neutral-50 px-5 py-6 sm:py-8">
      <section className={`mx-auto w-full max-w-md ${className}`}>
        {children}
      </section>
    </main>
  );
}
