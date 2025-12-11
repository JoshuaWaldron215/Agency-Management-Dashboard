import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  period: string;
  created_at: string;
}

interface GoalsSectionProps {
  chatterName: string;
}

export const GoalsSection = ({ chatterName }: GoalsSectionProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalAmount, setNewGoalAmount] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, [chatterName]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      // Store goals in localStorage
      const storedGoals = localStorage.getItem(`goals_${chatterName}`);
      let parsedGoals: Goal[] = storedGoals ? JSON.parse(storedGoals) : [];

      // Fetch current month earnings to update progress
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      // Fetch daily sales for current month
      const { data: dailySales } = await supabase
        .from("chatter_sheet_daily_sales")
        .select(`
          sales_amount,
          chatter_sheets!inner(
            chatter_name,
            commission_rate
          )
        `)
        .eq("chatter_sheets.chatter_name", chatterName)
        .gte("sale_date", format(monthStart, "yyyy-MM-dd"))
        .lte("sale_date", format(monthEnd, "yyyy-MM-dd"));

      // Fetch daily hours for current month
      const { data: dailyHours } = await supabase
        .from("chatter_daily_hours")
        .select(`
          hours_worked,
          chatter_sheets!inner(
            chatter_name,
            hourly_rate
          )
        `)
        .eq("chatter_sheets.chatter_name", chatterName)
        .gte("work_date", format(monthStart, "yyyy-MM-dd"))
        .lte("work_date", format(monthEnd, "yyyy-MM-dd"));

      // Fetch bonuses for current month - get all sheets and filter client-side
      const { data: allSheets } = await supabase
        .from("chatter_sheets")
        .select("bonus, week_start_date")
        .eq("chatter_name", chatterName);

      const monthStartStr = format(monthStart, "yyyy-MM-dd");
      const monthEndStr = format(monthEnd, "yyyy-MM-dd");

      // Filter sheets where week_start_date is within the month
      const sheets = allSheets?.filter(sheet => 
        sheet.week_start_date >= monthStartStr && 
        sheet.week_start_date <= monthEndStr
      );

      let currentMonthEarnings = 0;

      // Calculate from sales
      dailySales?.forEach((sale: any) => {
        const amount = Number(sale.sales_amount || 0);
        const commission = Number(sale.chatter_sheets?.commission_rate || 0);
        currentMonthEarnings += amount * commission;
      });

      // Calculate from hours
      dailyHours?.forEach((hour: any) => {
        const hours = Number(hour.hours_worked || 0);
        const rate = Number(hour.chatter_sheets?.hourly_rate || 0);
        currentMonthEarnings += hours * rate;
      });

      // Add bonuses
      sheets?.forEach((sheet: any) => {
        currentMonthEarnings += Number(sheet.bonus || 0);
      });

      // Update current amounts
      parsedGoals = parsedGoals.map((goal) => ({
        ...goal,
        current_amount: currentMonthEarnings,
      }));

      setGoals(parsedGoals);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim() || !newGoalAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title: newGoalTitle,
      target_amount: Number(newGoalAmount),
      current_amount: 0,
      period: format(new Date(), "MMMM yyyy"),
      created_at: new Date().toISOString(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem(`goals_${chatterName}`, JSON.stringify(updatedGoals));

    setNewGoalTitle("");
    setNewGoalAmount("");
    setShowAddForm(false);
    toast.success("Goal added successfully!");
  };

  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter((g) => g.id !== goalId);
    setGoals(updatedGoals);
    localStorage.setItem(`goals_${chatterName}`, JSON.stringify(updatedGoals));
    toast.success("Goal deleted");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Personal Goals</CardTitle>
            <CardDescription>Track your earnings targets and progress</CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <div className="mb-6 p-4 rounded-lg border bg-muted/50 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input
                id="goal-title"
                placeholder="e.g., Monthly Earnings Target"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-amount">Target Amount ($)</Label>
              <Input
                id="goal-amount"
                type="number"
                placeholder="e.g., 10000"
                value={newGoalAmount}
                onChange={(e) => setNewGoalAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddGoal} size="sm" className="gap-2">
                <Check className="h-4 w-4" />
                Save Goal
              </Button>
              <Button
                onClick={() => setShowAddForm(false)}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No goals set yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Goal" to create your first earnings target
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              const isCompleted = goal.current_amount >= goal.target_amount;

              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{goal.title}</h4>
                        {isCompleted && (
                          <Badge className="bg-green-500 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{goal.period}</p>
                    </div>
                    <Button
                      onClick={() => handleDeleteGoal(goal.id)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        ${Math.round(goal.current_amount).toLocaleString()} / ${goal.target_amount.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(progress)}% complete</span>
                      {!isCompleted && (
                        <span>
                          ${Math.round(goal.target_amount - goal.current_amount).toLocaleString()} remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
