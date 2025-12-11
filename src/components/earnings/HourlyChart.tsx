import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HourlyChartProps {
  data: { hour: number; total: number }[];
  currency: string;
}

export function HourlyChart({ data, currency }: HourlyChartProps) {
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}${period}`;
  };

  const chartData = data.map((d) => ({
    hour: formatHour(d.hour),
    earnings: d.total,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Hourly Earnings Breakdown</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="hour" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              formatter={(value: number) => [`${currency}${value.toFixed(2)}`, "Earnings"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
