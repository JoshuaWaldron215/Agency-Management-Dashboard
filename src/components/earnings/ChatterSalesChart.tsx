import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ParsedTransaction } from "./types";

interface ChatterSalesChartProps {
  transactions: ParsedTransaction[];
  currency: string;
}

export function ChatterSalesChart({ transactions, currency }: ChatterSalesChartProps) {
  // Filter for chatter's sales (whole-number sales excluding subs/welcome + all tips)
  const chatterSalesTransactions = transactions.filter((t) => {
    const isWholeNumber = Math.round(t.gross * 100) % 100 === 0;
    const isTip = t.category === "Tip";
    const isSubscription = t.category === "Subscription";
    const isWelcome = t.category === "Welcome";
    return (isWholeNumber && !isTip && !isSubscription && !isWelcome) || isTip;
  });

  // Group by hour to calculate average per shift hour
  const hourlyMap = new Map<number, { total: number; count: number }>();
  
  chatterSalesTransactions.forEach((t) => {
    const current = hourlyMap.get(t.hour) || { total: 0, count: 0 };
    hourlyMap.set(t.hour, {
      total: current.total + t.net,
      count: current.count + 1,
    });
  });

  // Calculate average and format data
  const chartData = Array.from(hourlyMap.entries())
    .map(([hour, data]) => {
      const formatHour = (h: number) => {
        const period = h >= 12 ? "PM" : "AM";
        const displayHour = h % 12 || 12;
        return `${displayHour}${period}`;
      };

      return {
        hour: formatHour(hour),
        average: data.total / data.count,
        hourNum: hour,
      };
    })
    .sort((a, b) => a.hourNum - b.hourNum);

  const maxAverage = Math.max(...chartData.map(d => d.average));

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Average Chatter's Sales per Shift Hour</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Average earnings from your sales activities by hour
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="hour" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              formatter={(value: number) => [`${currency}${value.toFixed(2)}`, "Average Sales"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="average" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.average === maxAverage ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.7)"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
