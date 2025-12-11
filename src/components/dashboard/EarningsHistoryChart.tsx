import { useState, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";

interface EarningsHistoryChartProps {
  chatterName: string;
}

async function fetchEarningsHistory(chatterName: string, timeframe: "week" | "month") {
  const periods = 12;
  const now = new Date();
  
  let overallStart: Date;
  let overallEnd: Date;
  
  if (timeframe === "week") {
    overallStart = startOfWeek(subWeeks(now, periods - 1), { weekStartsOn: 1 });
    overallEnd = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    overallStart = startOfMonth(subMonths(now, periods - 1));
    overallEnd = endOfMonth(now);
  }
  
  const [salesResult, hoursResult, sheetsResult] = await Promise.all([
    supabase
      .from("chatter_sheet_daily_sales")
      .select(`
        sale_date,
        sales_amount,
        chatter_sheets!inner(chatter_name, commission_rate)
      `)
      .eq("chatter_sheets.chatter_name", chatterName)
      .gte("sale_date", format(overallStart, "yyyy-MM-dd"))
      .lte("sale_date", format(overallEnd, "yyyy-MM-dd")),
    supabase
      .from("chatter_daily_hours")
      .select(`
        work_date,
        hours_worked,
        chatter_sheets!inner(chatter_name, hourly_rate)
      `)
      .eq("chatter_sheets.chatter_name", chatterName)
      .gte("work_date", format(overallStart, "yyyy-MM-dd"))
      .lte("work_date", format(overallEnd, "yyyy-MM-dd")),
    supabase
      .from("chatter_sheets")
      .select("bonus, week_start_date")
      .eq("chatter_name", chatterName)
      .gte("week_start_date", format(overallStart, "yyyy-MM-dd"))
      .lte("week_start_date", format(overallEnd, "yyyy-MM-dd"))
  ]);

  const dailySales = salesResult.data || [];
  const dailyHours = hoursResult.data || [];
  const sheets = sheetsResult.data || [];

  const earningsData: Array<{ period: string; earnings: number; sales: number }> = [];

  for (let i = periods - 1; i >= 0; i--) {
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

    const startStr = format(periodStart, "yyyy-MM-dd");
    const endStr = format(periodEnd, "yyyy-MM-dd");

    let totalSales = 0;
    let totalEarnings = 0;

    dailySales.forEach((sale: any) => {
      if (sale.sale_date >= startStr && sale.sale_date <= endStr) {
        const amount = Number(sale.sales_amount || 0);
        const commission = Number(sale.chatter_sheets?.commission_rate || 0);
        totalSales += amount;
        totalEarnings += amount * commission;
      }
    });

    dailyHours.forEach((hour: any) => {
      if (hour.work_date >= startStr && hour.work_date <= endStr) {
        const hours = Number(hour.hours_worked || 0);
        const rate = Number(hour.chatter_sheets?.hourly_rate || 0);
        totalEarnings += hours * rate;
      }
    });

    sheets.forEach((sheet: any) => {
      if (sheet.week_start_date === startStr) {
        totalEarnings += Number(sheet.bonus || 0);
      }
    });

    earningsData.push({
      period: periodLabel,
      earnings: Math.round(totalEarnings),
      sales: Math.round(totalSales),
    });
  }

  return earningsData;
}

export const EarningsHistoryChart = memo(function EarningsHistoryChart({ chatterName }: EarningsHistoryChartProps) {
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");

  const { data, isLoading } = useQuery({
    queryKey: ["earningsHistory", chatterName, timeframe],
    queryFn: () => fetchEarningsHistory(chatterName, timeframe),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    enabled: !!chatterName,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>Your earnings and sales over time</CardDescription>
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
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No earnings data available</p>
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
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number) => [`$${value}`, ""]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="earnings"
                name="Earnings"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--chart-2))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
