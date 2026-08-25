import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-soft transition-colors placeholder:text-text-secondary/70 focus:border-dusty-blue focus:outline-none focus:ring-2 focus:ring-dusty-blue/30",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!error && hint ? (
        <p className="text-sm text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
