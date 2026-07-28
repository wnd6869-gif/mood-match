"use client";

type ChoiceCardProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  description?: string;
  disabled?: boolean;
  multiSelect?: boolean;
};

export default function ChoiceCard({
  label,
  selected,
  onClick,
  description,
  disabled = false,
  multiSelect = false,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${label}${selected ? ", 선택됨" : ", 선택되지 않음"}`}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${
        selected
          ? "border-coral-400 bg-coral-50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
      }`}
    >
      <span className="min-w-0">
        <span
          className={`block text-sm font-semibold ${
            selected ? "text-coral-700" : "text-neutral-800"
          }`}
        >
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`flex size-6 shrink-0 items-center justify-center border transition-colors ${
          multiSelect ? "rounded-lg" : "rounded-full"
        } ${
          selected
            ? "border-coral-500 bg-coral-500 text-white"
            : "border-neutral-300 bg-white text-transparent"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-4">
          <path
            d="m5 10 3 3 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
