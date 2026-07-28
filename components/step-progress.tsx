type StepProgressProps = {
  current: number;
  total: number;
  label: string;
};

export default function StepProgress({
  current,
  total,
  label,
}: StepProgressProps) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div className="mt-4" aria-label={`전체 과정 중 ${label}`}>
      <div className="flex items-center justify-between gap-4 text-xs font-semibold">
        <span className="text-neutral-500">{label}</span>
        <span className="text-coral-600">
          {current} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} 진행률`}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          className="h-full rounded-full bg-coral-500 transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
