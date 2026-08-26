// Shared field styling tab SEO admin — konsisten token design-system §2.

export const inputCls =
  "w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue";

export const textAreaCls = `${inputCls} min-h-28 font-mono text-xs leading-relaxed`;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-text-secondary/70">{hint}</span> : null}
    </label>
  );
}