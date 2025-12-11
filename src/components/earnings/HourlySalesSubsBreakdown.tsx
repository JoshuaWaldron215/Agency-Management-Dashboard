import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { ParsedTransaction } from "./types";

interface HourlySalesSubsBreakdownProps {
  transactions: ParsedTransaction[];
  currency: string;
}

export function HourlySalesSubsBreakdown({ transactions, currency }: HourlySalesSubsBreakdownProps) {
  // Calculate hourly sales (excluding subscriptions)
  const hourlySalesMap = new Map<number, number>();
  const hourlySubsMap = new Map<number, number>();

  transactions.forEach((t) => {
    if (t.category === "Subscription") {
      const current = hourlySubsMap.get(t.hour) || 0;
      hourlySubsMap.set(t.hour, current + t.net);
    } else {
      const current = hourlySalesMap.get(t.hour) || 0;
      hourlySalesMap.set(t.hour, current + t.net);
    }
  });

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}${period}`;
  };

  const hourlySales = Array.from(hourlySalesMap.entries())
    .filter(([_, total]) => total > 0)
    .sort((a, b) => a[0] - b[0]);

  const hourlySubs = Array.from(hourlySubsMap.entries())
    .filter(([_, total]) => total > 0)
    .sort((a, b) => a[0] - b[0]);

  const totalSales = hourlySales.reduce((sum, [_, total]) => sum + total, 0);
  const totalSubs = hourlySubs.reduce((sum, [_, total]) => sum + total, 0);

  // Find peak hours
  const maxSales = Math.max(...hourlySales.map(([_, total]) => total), 0);
  const maxSubs = Math.max(...hourlySubs.map(([_, total]) => total), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Hourly Sales */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Hourly Sales</h3>
            <span className="text-sm font-bold text-primary">
              {currency}{totalSales.toFixed(2)}
            </span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {hourlySales.map(([hour, total]) => {
              const isPeak = total === maxSales && maxSales > 0;
              return (
                <div 
                  key={hour} 
                  className={`flex items-center justify-between text-xs p-2 rounded-md transition-colors ${
                    isPeak ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isPeak ? "text-primary font-semibold" : "text-muted-foreground"}>
                      {formatHour(hour)}
                    </span>
                    {isPeak && (
                      <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                        Peak
                      </Badge>
                    )}
                  </div>
                  <span className={`font-medium ${isPeak ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {currency}{total.toFixed(2)}
                  </span>
                </div>
              );
            })}
            {hourlySales.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No sales data</p>
            )}
          </div>
        </div>
      </Card>

      {/* Hourly Subscriptions */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Hourly Subscriptions</h3>
            <span className="text-sm font-bold text-primary">
              {currency}{totalSubs.toFixed(2)}
            </span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {hourlySubs.map(([hour, total]) => {
              const isPeak = total === maxSubs && maxSubs > 0;
              return (
                <div 
                  key={hour} 
                  className={`flex items-center justify-between text-xs p-2 rounded-md transition-colors ${
                    isPeak ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isPeak ? "text-primary font-semibold" : "text-muted-foreground"}>
                      {formatHour(hour)}
                    </span>
                    {isPeak && (
                      <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                        Peak
                      </Badge>
                    )}
                  </div>
                  <span className={`font-medium ${isPeak ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {currency}{total.toFixed(2)}
                  </span>
                </div>
              );
            })}
            {hourlySubs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No subscription data</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
