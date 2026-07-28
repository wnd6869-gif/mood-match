import type { ReactNode } from "react";

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-neutral-600">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-coral-500">
      {children}
    </ul>
  );
}
