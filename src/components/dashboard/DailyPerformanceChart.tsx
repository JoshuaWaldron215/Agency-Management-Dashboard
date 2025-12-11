import { Calendar } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface DayData {
  day: string;
  revenue: number;
  sales: number;
}

interface DailyPerformanceChartProps {
  data: DayData[];
  periodLabel?: string | null;
}

export function DailyPerformanceChart({ data, periodLabel }: DailyPerformanceChartProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="stat-card" data-testid="daily-performance-chart">
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="icon-container-purple">
          <Calendar className="h-5 w-5" />
        </div>
        <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
          DAILY PERFORMANCE PATTERN
        </span>
        {periodLabel && (
          <Badge variant="secondary" className="text-xs">
            {periodLabel}
          </Badge>
        )}
      </div>

      <div className="flex items-end justify-between gap-2 h-48 px-2">
        {data.map((day) => {
          const heightPercentage = (day.revenue / maxRevenue) * 100;
          const isSelected = selectedDay === day.day;
          const isHighest = day.revenue === maxRevenue;
          
          return (
            <div 
              key={day.day} 
              className="flex-1 flex flex-col items-center gap-2"
              onMouseEnter={() => setSelectedDay(day.day)}
              onMouseLeave={() => setSelectedDay(null)}
            >
              <div 
                className="relative w-full flex items-end justify-center"
                style={{ height: '140px' }}
              >
                {(isSelected || isHighest) && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-2 py-1 text-xs whitespace-nowrap z-10 shadow-lg">
                    <div className="font-semibold text-foreground">${day.revenue.toLocaleString()}</div>
                    <div className="text-muted-foreground">{day.sales} sales</div>
                  </div>
                )}
                <div 
                  className={`w-full max-w-12 rounded-t-lg transition-all duration-300 cursor-pointer ${
                    isHighest 
                      ? "bg-gradient-to-t from-purple-600 to-pink-500" 
                      : "bg-gradient-to-t from-purple-600/60 to-purple-400/60"
                  } ${isSelected ? "opacity-100 scale-105" : "opacity-80 hover:opacity-100"}`}
                  style={{ height: `${heightPercentage}%`, minHeight: '8px' }}
                />
              </div>
              <div className="text-center">
                <div className={`text-sm font-medium ${
                  isHighest ? "text-purple-400" : "text-foreground"
                }`}>
                  {day.day}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${(day.revenue / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-muted-foreground/60">
                  {day.sales} sales
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-600 to-pink-500" />
            <span className="text-xs text-muted-foreground">Highest Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500/60" />
            <span className="text-xs text-muted-foreground">Other Days</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Week: Sat - Fri (Pay Period)
        </div>
      </div>
    </div>
  );
}
