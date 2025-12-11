import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";

interface PerformanceTrendsSectionProps {
  type: "chatter" | "team";
}

const COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b", 
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#6366f1",
];

export const PerformanceTrendsSection = ({ type }: PerformanceTrendsSectionProps) => {
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");
  const [metric, setMetric] = useState<"earnings" | "sales">("earnings");
  const { chatterTrends, teamTrends, loading } = usePerformanceTrends(type, timeframe, 8);

  const trends = type === "chatter" ? chatterTrends : teamTrends;

  // Combine all data points into a single dataset
  const chartData = trends.length > 0 
    ? trends[0].data.map((_, index) => {
        const dataPoint: any = { period: trends[0].data[index].period };
        trends.forEach((trend, trendIndex) => {
          dataPoint[trend.name] = trend.data[index][metric];
        });
        return dataPoint;
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Performance Trends
          </h2>
          <p className="text-muted-foreground mt-1">
            {type === "chatter" ? "Top 8 chatters" : "All teams"} performance over time
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={metric} onValueChange={(value) => setMetric(value as "earnings" | "sales")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="earnings">Earnings</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as "week" | "month")}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {metric === "earnings" ? "Earnings" : "Sales"} Trends - Last 8 {timeframe === "week" ? "Weeks" : "Months"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading trends...</p>
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="period"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, ""]}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: "20px",
                    }}
                  />
                  {trends.map((trend, index) => (
                    <Line
                      key={trend.name}
                      type="monotone"
                      dataKey={trend.name}
                      stroke={type === "team" ? (trend as any).color : COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">No trend data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {trends.slice(0, 4).map((trend, index) => {
          const totalEarnings = trend.data.reduce((sum, d) => sum + d.earnings, 0);
          const avgEarnings = totalEarnings / trend.data.length;
          const lastPeriod = trend.data[trend.data.length - 1]?.earnings || 0;
          const prevPeriod = trend.data[trend.data.length - 2]?.earnings || 0;
          const change = prevPeriod > 0 ? ((lastPeriod - prevPeriod) / prevPeriod) * 100 : 0;

          return (
            <Card key={trend.name} className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: type === "team" ? (trend as any).color : COLORS[index % COLORS.length] }}
                  />
                  {trend.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Last Period</div>
                  <div className="text-xl font-bold text-foreground">
                    ${lastPeriod.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Change</span>
                  <span className={change >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Avg</span>
                  <span className="font-semibold">
                    ${avgEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
