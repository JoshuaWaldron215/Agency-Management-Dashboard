import { memo, useMemo } from "react";
import { PieChart } from "lucide-react";

interface SaleType {
  name: string;
  value: number;
  percentage: number;
}

interface SaleTypeBreakdownProps {
  data: SaleType[];
}

const colors = [
  "from-purple-500 to-pink-500",
  "from-teal-400 to-cyan-400",
  "from-yellow-400 to-amber-400",
  "from-blue-400 to-indigo-400",
  "from-rose-400 to-red-400",
];

const dotColors = [
  "bg-purple-500",
  "bg-teal-400",
  "bg-yellow-400",
  "bg-blue-400",
  "bg-rose-400",
];

export const SaleTypeBreakdown = memo(function SaleTypeBreakdown({ data }: SaleTypeBreakdownProps) {
  const total = useMemo(() => data.reduce((acc, item) => acc + item.value, 0), [data]);

  return (
    <div className="stat-card" data-testid="sale-type-breakdown">
      <div className="flex items-center gap-2 mb-6">
        <div className="icon-container-purple">
          <PieChart className="h-5 w-5" />
        </div>
        <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
          SALE TYPE BREAKDOWN
        </span>
      </div>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dotColors[index]}`} />
                <span className="text-foreground font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  ${item.value.toLocaleString()}
                </span>
                <span className="text-foreground font-semibold w-10 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${colors[index]} transition-all duration-700`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Revenue</span>
          <span className="text-lg font-bold gradient-text">
            ${total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
});
