import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { MessageSquare, Gift, CreditCard, Package, Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

interface SaleTypeBreakdownProps {
  modelId: string;
}

const COLORS = [
  "hsl(280, 85%, 65%)",
  "hsl(175, 70%, 45%)",
  "hsl(45, 95%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(220, 20%, 45%)",
];

type TimeRange = "7" | "30" | "90" | "all";

export function SaleTypeBreakdown({ modelId }: SaleTypeBreakdownProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    ppvAmount: 0,
    tipsAmount: 0,
    subscriptionAmount: 0,
    bundlesAmount: 0,
    otherAmount: 0,
  });

  useEffect(() => {
    loadSaleTypeData();
  }, [modelId, timeRange]);

  const loadSaleTypeData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("chatter_sheet_daily_sales")
        .select("ppv_amount, tips_amount, subscription_amount, bundles_amount, other_amount, sale_date")
        .eq("model_id", modelId);

      if (timeRange !== "all") {
        const daysAgo = parseInt(timeRange);
        const startDate = format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
        query = query.gte("sale_date", startDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading sale type data:", error);
        return;
      }

      let ppvTotal = 0, tipsTotal = 0, subsTotal = 0, bundlesTotal = 0, otherTotal = 0;
      data?.forEach((sale: any) => {
        ppvTotal += Number(sale.ppv_amount || 0);
        tipsTotal += Number(sale.tips_amount || 0);
        subsTotal += Number(sale.subscription_amount || 0);
        bundlesTotal += Number(sale.bundles_amount || 0);
        otherTotal += Number(sale.other_amount || 0);
      });

      setTotals({
        ppvAmount: ppvTotal,
        tipsAmount: tipsTotal,
        subscriptionAmount: subsTotal,
        bundlesAmount: bundlesTotal,
        otherAmount: otherTotal,
      });
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const total = totals.ppvAmount + totals.tipsAmount + totals.subscriptionAmount + totals.bundlesAmount + totals.otherAmount;

  const data = [
    { name: "PPV", value: totals.ppvAmount, icon: MessageSquare, color: COLORS[0] },
    { name: "Tips", value: totals.tipsAmount, icon: Gift, color: COLORS[1] },
    { name: "Subscriptions", value: totals.subscriptionAmount, icon: CreditCard, color: COLORS[2] },
    { name: "Bundles", value: totals.bundlesAmount, icon: Package, color: COLORS[3] },
    { name: "Other", value: totals.otherAmount, icon: Sparkles, color: COLORS[4] },
  ].filter(item => item.value > 0);

  const getPercentage = (value: number) => total > 0 ? ((value / total) * 100).toFixed(1) : "0";

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case "7": return "Last 7 Days";
      case "30": return "Last 30 Days";
      case "90": return "Last 90 Days";
      case "all": return "All Time";
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Sale Type Breakdown
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[150px]" data-testid="select-sale-type-timerange">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading...
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" />
            <p>No sales data for {getTimeRangeLabel(timeRange).toLowerCase()}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {data.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        ${item.value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPercentage(item.value)}%
                      </p>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    ${total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
