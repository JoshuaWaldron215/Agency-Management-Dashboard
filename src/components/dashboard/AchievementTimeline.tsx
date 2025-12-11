import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Star, Crown, Zap } from "lucide-react";
import { format } from "date-fns";

interface Achievement {
  threshold: number;
  name: string;
  icon: any;
  color: string;
  gradient: string;
  dateEarned?: Date;
}

interface AchievementTimelineProps {
  chatterName: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    threshold: 5000,
    name: "$5k Club",
    icon: Star,
    color: "text-blue-500",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    threshold: 10000,
    name: "$10k Club",
    icon: Award,
    color: "text-green-500",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    threshold: 25000,
    name: "$25k Club",
    icon: Trophy,
    color: "text-purple-500",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    threshold: 50000,
    name: "$50k Club",
    icon: Crown,
    color: "text-amber-500",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    threshold: 100000,
    name: "$100k Elite",
    icon: Zap,
    color: "text-red-500",
    gradient: "from-red-500 to-rose-500",
  },
];

export const AchievementTimeline = ({ chatterName }: AchievementTimelineProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchAchievements();
  }, [chatterName]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      // Fetch all daily sales for this chatter
      const { data: allSales } = await supabase
        .from("chatter_sheet_daily_sales")
        .select(`
          sales_amount,
          sale_date,
          chatter_sheets!inner(
            chatter_name,
            commission_rate,
            period_end
          )
        `)
        .eq("chatter_sheets.chatter_name", chatterName)
        .order("sale_date", { ascending: true });

      // Fetch all daily hours for this chatter
      const { data: allHours } = await supabase
        .from("chatter_daily_hours")
        .select(`
          hours_worked,
          work_date,
          chatter_sheets!inner(
            chatter_name,
            hourly_rate,
            period_end
          )
        `)
        .eq("chatter_sheets.chatter_name", chatterName)
        .order("work_date", { ascending: true });

      // Fetch bonuses
      const { data: sheets } = await supabase
        .from("chatter_sheets")
        .select("bonus, period_end")
        .eq("chatter_name", chatterName)
        .order("period_end", { ascending: true });

      let runningTotal = 0;
      const achievementDates = new Map<number, Date>();

      // Calculate total from sales
      let salesTotal = 0;
      allSales?.forEach((sale: any) => {
        const amount = Number(sale.sales_amount || 0);
        const commission = Number(sale.chatter_sheets?.commission_rate || 0);
        salesTotal += amount * commission;
      });
      runningTotal += salesTotal;

      // Calculate total from hours
      let hoursTotal = 0;
      allHours?.forEach((hour: any) => {
        const hours = Number(hour.hours_worked || 0);
        const rate = Number(hour.chatter_sheets?.hourly_rate || 0);
        hoursTotal += hours * rate;
      });
      runningTotal += hoursTotal;

      // Add bonuses and check for milestone achievements by period
      let cumulativeEarnings = 0;
      sheets?.forEach((sheet: any) => {
        const bonus = Number(sheet.bonus || 0);
        cumulativeEarnings += bonus;
        
        const totalAtPeriodEnd = salesTotal + hoursTotal + cumulativeEarnings;
        
        // Check if any achievements were unlocked at this period
        ACHIEVEMENTS.forEach((achievement) => {
          if (totalAtPeriodEnd >= achievement.threshold && !achievementDates.has(achievement.threshold)) {
            achievementDates.set(achievement.threshold, new Date(sheet.period_end));
          }
        });
      });
      
      runningTotal += cumulativeEarnings;

      setTotalEarnings(runningTotal);

      // Create timeline with dates
      const timeline = ACHIEVEMENTS.map((achievement) => ({
        ...achievement,
        dateEarned: achievementDates.get(achievement.threshold),
      })).filter((a) => a.dateEarned);

      setAchievements(timeline);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextMilestone = ACHIEVEMENTS.find((a) => a.threshold > totalEarnings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievement Timeline</CardTitle>
        <CardDescription>Milestones you've unlocked over time</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Current Progress */}
            {nextMilestone && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Next Milestone</span>
                  <Badge variant="outline">{nextMilestone.name}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      ${totalEarnings.toLocaleString()} / ${nextMilestone.threshold.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${nextMilestone.gradient} transition-all`}
                      style={{ width: `${Math.min((totalEarnings / nextMilestone.threshold) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {achievements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No achievements unlocked yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Keep earning to unlock your first milestone!
                </p>
              </div>
            ) : (
              <div className="relative space-y-6">
                {/* Timeline line */}
                <div className="absolute left-6 top-6 bottom-0 w-0.5 bg-border" />

                {achievements.map((achievement, index) => {
                  const Icon = achievement.icon;
                  return (
                    <div key={achievement.threshold} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${achievement.gradient} shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-foreground">{achievement.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              ${achievement.threshold.toLocaleString()} earned
                            </p>
                          </div>
                          {achievement.dateEarned && (
                            <Badge variant="outline" className="text-xs">
                              {format(achievement.dateEarned, "MMM d, yyyy")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
