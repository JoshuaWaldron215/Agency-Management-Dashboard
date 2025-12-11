import { cn } from "@/lib/utils";

interface SegmentedOption {
  label: string;
  value: string;
}

interface SegmentedProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedOption[];
  className?: string;
}

export function Segmented({ value, onChange, options, className }: SegmentedProps) {
  return (
    <div className={cn("inline-flex items-center rounded-lg bg-muted p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
