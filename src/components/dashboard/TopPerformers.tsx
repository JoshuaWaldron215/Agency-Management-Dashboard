import { Star, Calendar, Clock } from "lucide-react";

interface TopPerformersProps {
  bestDay: string;
  bestDayRevenue: number;
  bestDaySales: number;
  peakHour: string;
  peakHourRevenue: number;
  peakHourSales: number;
}

export function TopPerformers({ 
  bestDay, 
  bestDayRevenue, 
  bestDaySales,
  peakHour,
  peakHourRevenue,
  peakHourSales
}: TopPerformersProps) {
  return (
    <div className="stat-card" data-testid="top-performers">
      <div className="flex items-center gap-2 mb-6">
        <div className="icon-container-yellow">
          <Star className="h-5 w-5" />
        </div>
        <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
          TOP PERFORMERS
        </span>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-teal-400" />
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
              BEST DAY
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            {bestDay}
          </div>
          <div className="text-sm text-muted-foreground">
            ${bestDayRevenue.toLocaleString()} avg revenue · {bestDaySales} sales
          </div>
        </div>

        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-pink-400" />
            <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">
              PEAK HOUR
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            {peakHour}
          </div>
          <div className="text-sm text-muted-foreground">
            ${peakHourRevenue.toLocaleString()} revenue · {peakHourSales} sales
          </div>
        </div>
      </div>
    </div>
  );
}
