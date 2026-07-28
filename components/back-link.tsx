import Link from "next/link";

type BackLinkProps = {
  href: string;
  ariaLabel: string;
  label?: string;
};

export default function BackLink({
  href,
  ariaLabel,
  label = "돌아가기",
}: BackLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="flex min-h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-neutral-600 transition-colors duration-200 hover:bg-white hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 active:bg-neutral-100"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
      >
        <path
          d="m15 18-6-6 6-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </Link>
  );
}
