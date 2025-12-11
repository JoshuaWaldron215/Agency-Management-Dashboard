import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { format, subMonths } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MonthSelection {
  month: number;
  year: number;
}

interface TimeFilterProps {
  value: string;
  onChange: (value: string) => void;
  selectedMonth?: string;
  onMonthChange?: (value: string) => void;
}

const filters = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "all", label: "All Time" },
];

export function TimeFilter({ value, onChange, selectedMonth = "current", onMonthChange }: TimeFilterProps) {
  // Generate last 12 months for picker
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      const optValue = `${date.getFullYear()}-${date.getMonth()}`;
      const label = format(date, "MMMM yyyy");
      options.push({ value: optValue, label });
    }
    return options;
  }, []);

  const handleMonthChange = (newMonth: string) => {
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  const isMonthSelected = selectedMonth !== "current";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className={`flex items-center gap-1 p-1 rounded-lg bg-secondary/50 ${isMonthSelected ? 'opacity-50' : ''}`} data-testid="time-filter">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              onChange(filter.value);
              if (onMonthChange) onMonthChange("current");
            }}
            disabled={isMonthSelected}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              value === filter.value && !isMonthSelected
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            } ${isMonthSelected ? 'cursor-not-allowed' : ''}`}
            data-testid={`filter-${filter.value}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {onMonthChange && (
        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[160px]" data-testid="select-month">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Pick Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Use Preset</SelectItem>
            {monthOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function parseMonthSelection(selectedMonth: string): MonthSelection | undefined {
  if (selectedMonth === "current") return undefined;
  const [year, month] = selectedMonth.split("-").map(Number);
  if (isNaN(year) || isNaN(month)) return undefined;
  return { month, year };
}
