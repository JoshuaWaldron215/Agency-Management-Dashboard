import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";

interface RankProgressionChartProps {
  chatterName: string;
}

export const RankProgressionChart = ({ chatterName }: RankProgressionChartProps) => {
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");
  const [data, setData] = useState<Array<{ period: string; rank: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankProgression();
  }, [chatterName, timeframe]);

  const fetchRankProgression = async () => {
    setLoading(true);
    try {
      const periods = 12;
      const rankData: Array<{ period: string; rank: number }> = [];

      for (let i = periods - 1; i >= 0; i--) {
        const now = new Date();
        let periodStart: Date;
        let periodEnd: Date;
        let periodLabel: string;

        if (timeframe === "week") {
          const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          periodStart = weekStart;
          periodEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          periodLabel = format(weekStart, "MMM d");
        } else {
          const monthStart = startOfMonth(subMonths(now, i));
          periodStart = monthStart;
          periodEnd = endOfMonth(monthStart);
          periodLabel = format(monthStart, "MMM yyyy");
        }

        // Fetch all daily sales for this period
        const { data: allSales } = await supabase
          .from("chatter_sheet_daily_sales")
          .select(`
            sales_amount,
            chatter_sheets!inner(
              chatter_name,
              commission_rate,
              id
            )
          `)
          .gte("sale_date", format(periodStart, "yyyy-MM-dd"))
          .lte("sale_date", format(periodEnd, "yyyy-MM-dd"));

        // Fetch all daily hours for this period
        const { data: allHours } = await supabase
          .from("chatter_daily_hours")
          .select(`
            hours_worked,
            chatter_sheets!inner(
              chatter_name,
              hourly_rate,
              id
            )
          `)
          .gte("work_date", format(periodStart, "yyyy-MM-dd"))
          .lte("work_date", format(periodEnd, "yyyy-MM-dd"));

        // Fetch bonuses for this period - week-based
        const periodStartStr = format(periodStart, "yyyy-MM-dd");
        const { data: sheets } = await supabase
          .from("chatter_sheets")
          .select("chatter_name, bonus, week_start_date")
          .eq("week_start_date", periodStartStr);

        // Calculate earnings per chatter
        const chatterEarnings = new Map<string, number>();

        // Add sales earnings
        allSales?.forEach((sale: any) => {
          const name = sale.chatter_sheets?.chatter_name;
          const amount = Number(sale.sales_amount || 0);
          const commission = Number(sale.chatter_sheets?.commission_rate || 0);
          const earnings = amount * commission;
          chatterEarnings.set(name, (chatterEarnings.get(name) || 0) + earnings);
        });

        // Add hourly earnings
        allHours?.forEach((hour: any) => {
          const name = hour.chatter_sheets?.chatter_name;
          const hours = Number(hour.hours_worked || 0);
          const rate = Number(hour.chatter_sheets?.hourly_rate || 0);
          const earnings = hours * rate;
          chatterEarnings.set(name, (chatterEarnings.get(name) || 0) + earnings);
        });

        // Add bonuses
        sheets?.forEach((sheet: any) => {
          const name = sheet.chatter_name;
          const bonus = Number(sheet.bonus || 0);
          chatterEarnings.set(name, (chatterEarnings.get(name) || 0) + bonus);
        });

        // Sort chatters by earnings and find rank
        const sortedChatters = Array.from(chatterEarnings.entries())
          .sort((a, b) => b[1] - a[1]);
        
        const rank = sortedChatters.findIndex(([name]) => name === chatterName) + 1;

        rankData.push({
          period: periodLabel,
          rank: rank || sortedChatters.length + 1,
        });
      }

      setData(rankData);
    } catch (error) {
      console.error("Error fetching rank progression:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rank Progression</CardTitle>
            <CardDescription>Your rank over time (lower is better)</CardDescription>
          </div>
          <Select value={timeframe} onValueChange={(value: "week" | "month") => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No rank data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                reversed
                domain={[1, 'dataMax']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number) => [`#${value}`, "Rank"]}
              />
              <Line
                type="monotone"
                dataKey="rank"
                name="Rank"
                stroke="hsl(var(--chart-3))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-3))", r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
