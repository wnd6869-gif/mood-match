import type { InputHTMLAttributes } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
};

export default function AuthField({
  id,
  label,
  className = "",
  ...props
}: AuthFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      <input
        id={id}
        className={`mt-2 min-h-14 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-coral-400 focus:ring-2 focus:ring-coral-100 disabled:cursor-not-allowed disabled:bg-neutral-100 ${className}`}
        {...props}
      />
    </label>
  );
}
