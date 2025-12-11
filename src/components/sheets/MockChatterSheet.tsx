import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Lock, Edit2 } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { useUserRole } from "@/contexts/UserRoleContext";

const MOCK_MODELS = [
  { id: "1", name: "Bella Rose" },
  { id: "2", name: "Crystal Divine" },
  { id: "3", name: "Luna Star" },
  { id: "4", name: "Mia Valentine" },
  { id: "5", name: "Scarlett Blaze" },
];

const generateMockSales = () => {
  const sales: Record<string, Record<number, number>> = {};
  MOCK_MODELS.forEach((model) => {
    sales[model.id] = {};
    for (let day = 0; day < 7; day++) {
      sales[model.id][day] = Math.random() > 0.2 
        ? Math.floor(Math.random() * 800) + 50 
        : 0;
    }
  });
  return sales;
};

const generateMockHours = () => {
  const hours: Record<number, number> = {};
  for (let day = 0; day < 7; day++) {
    hours[day] = Math.random() > 0.15 
      ? Math.floor(Math.random() * 6) + 4 
      : 0;
  }
  return hours;
};

interface MockChatterSheetProps {
  chatterName?: string;
  commissionRate?: number;
  hourlyRate?: number;
  bonus?: number;
}

export function MockChatterSheet({
  chatterName = "Alex Thompson",
  commissionRate: initialCommissionRate = 0.08,
  hourlyRate: initialHourlyRate = 15,
  bonus: initialBonus = 150,
}: MockChatterSheetProps) {
  const { isAdmin } = useUserRole();
  
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const saturday = startOfWeek(today, { weekStartsOn: 6 });
    return saturday;
  });
  
  const [dailySales, setDailySales] = useState(generateMockSales);
  const [dailyHours, setDailyHours] = useState(generateMockHours);
  
  const [commissionRate, setCommissionRate] = useState(initialCommissionRate);
  const [hourlyRate, setHourlyRate] = useState(initialHourlyRate);
  const [bonus, setBonus] = useState(initialBonus);
  const [isEditingRates, setIsEditingRates] = useState(false);

  const getDayDate = (dayIndex: number) => addDays(weekStart, dayIndex);
  const getDayName = (dayIndex: number) => format(getDayDate(dayIndex), "EEE");
  const getDayLabel = (dayIndex: number) => format(getDayDate(dayIndex), "MMM d");

  const handlePrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const handleNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
  const handleToday = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 6 }));
  };

  const handleSalesChange = (modelId: string, dayIndex: number, value: string) => {
    const amount = parseFloat(value) || 0;
    setDailySales((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [dayIndex]: amount,
      },
    }));
  };

  const handleHoursChange = (dayIndex: number, value: string) => {
    const hours = parseFloat(value) || 0;
    setDailyHours((prev) => ({
      ...prev,
      [dayIndex]: hours,
    }));
  };

  const getModelWeekTotal = (modelId: string) => {
    return Object.values(dailySales[modelId] || {}).reduce((sum, val) => sum + val, 0);
  };

  const getDayTotal = (dayIndex: number) => {
    return MOCK_MODELS.reduce((sum, model) => sum + (dailySales[model.id]?.[dayIndex] || 0), 0);
  };

  const getWeekTotal = () => {
    return MOCK_MODELS.reduce((sum, model) => sum + getModelWeekTotal(model.id), 0);
  };

  const getTotalHours = () => {
    return Object.values(dailyHours).reduce((sum, val) => sum + val, 0);
  };

  const weekTotal = getWeekTotal();
  const totalHours = getTotalHours();
  const commission = weekTotal * commissionRate;
  const hourlyPay = totalHours * hourlyRate;
  const totalSalary = commission + hourlyPay + bonus;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">{chatterName}'s Sheet</h2>
            <p className="text-sm text-muted-foreground">
              Week of {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="gap-2" data-testid="button-today">
              <Calendar className="h-4 w-4" />
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek} data-testid="button-next-week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="border border-border bg-muted p-2 text-left font-medium sticky left-0 z-10 min-w-[140px]">
                  Model
                </th>
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <th key={dayIndex} className="border border-border bg-muted p-2 text-center font-medium min-w-[100px]">
                    <div className="text-xs">{getDayName(dayIndex)}</div>
                    <div className="text-xs font-normal text-muted-foreground">{getDayLabel(dayIndex)}</div>
                  </th>
                ))}
                <th className="border border-border bg-muted p-2 text-center font-medium min-w-[100px]">
                  Week Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-accent/30">
                <td className="border border-border p-2 font-medium sticky left-0 bg-accent/30 z-10">
                  Hours Worked
                </td>
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <td key={dayIndex} className="border border-border p-0 text-center">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={dailyHours[dayIndex] || ""}
                      onChange={(e) => handleHoursChange(dayIndex, e.target.value)}
                      className="border-0 rounded-none text-center h-auto bg-transparent"
                      placeholder="0"
                      data-testid={`input-hours-${dayIndex}`}
                    />
                  </td>
                ))}
                <td className="border border-border p-2 text-center font-medium bg-accent/30">
                  {totalHours.toFixed(1)}h
                </td>
              </tr>

              {MOCK_MODELS.map((model) => (
                <tr key={model.id} className="hover-elevate">
                  <td className="border border-border p-2 font-medium sticky left-0 bg-background z-10">
                    {model.name}
                  </td>
                  {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <td key={dayIndex} className="border border-border p-0">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={dailySales[model.id]?.[dayIndex] || ""}
                        onChange={(e) => handleSalesChange(model.id, dayIndex, e.target.value)}
                        className="border-0 rounded-none text-center h-auto bg-transparent"
                        placeholder="0"
                        data-testid={`input-sales-${model.id}-${dayIndex}`}
                      />
                    </td>
                  ))}
                  <td className="border border-border p-2 text-center font-semibold gradient-text-teal">
                    ${getModelWeekTotal(model.id).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="bg-muted font-medium">
                <td className="border border-border p-2 sticky left-0 bg-muted z-10">
                  Daily Total
                </td>
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <td key={dayIndex} className="border border-border p-2 text-center">
                    ${getDayTotal(dayIndex).toFixed(2)}
                  </td>
                ))}
                <td className="border border-border p-2 text-center text-lg gradient-text-purple">
                  ${weekTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Week Sales</div>
          <div className="text-2xl font-bold gradient-text-teal">${weekTotal.toFixed(2)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Commission ({(commissionRate * 100).toFixed(0)}%)</div>
          <div className="text-2xl font-bold text-green-400">${commission.toFixed(2)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Hours Worked</div>
          <div className="text-2xl font-bold text-purple-400">{totalHours.toFixed(1)}h</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Hourly Pay (${hourlyRate}/hr)</div>
          <div className="text-2xl font-bold text-blue-400">${hourlyPay.toFixed(2)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bonus</div>
          <div className="text-2xl font-bold text-yellow-400">${bonus.toFixed(2)}</div>
        </Card>
        <Card className="p-4 text-center border-teal-500/50 bg-teal-500/10">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Salary</div>
          <div className="text-2xl font-bold gradient-text-teal">${totalSalary.toFixed(2)}</div>
        </Card>
      </div>

      <Card className="p-4 border-purple-500/30 bg-purple-500/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            Rate Configuration
            {!isAdmin && (
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
                <Lock className="h-3 w-3 mr-1" />
                View Only
              </Badge>
            )}
          </h3>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingRates(!isEditingRates)}
              className="gap-2"
              data-testid="button-edit-rates"
            >
              <Edit2 className="h-4 w-4" />
              {isEditingRates ? "Done" : "Edit Rates"}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Commission Rate</label>
            {isAdmin && isEditingRates ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={(commissionRate * 100).toFixed(0)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= 100) {
                      setCommissionRate(val / 100);
                    }
                  }}
                  className="w-20 h-8"
                  data-testid="input-commission-rate"
                />
                <span className="text-lg font-semibold">%</span>
              </div>
            ) : (
              <div className="text-lg font-semibold">{(commissionRate * 100).toFixed(0)}%</div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Hourly Rate</label>
            {isAdmin && isEditingRates ? (
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold">$</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="500"
                  value={hourlyRate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      setHourlyRate(Math.min(val, 500));
                    }
                  }}
                  className="w-20 h-8"
                  data-testid="input-hourly-rate"
                />
                <span className="text-sm text-muted-foreground">/hr</span>
              </div>
            ) : (
              <div className="text-lg font-semibold">${hourlyRate.toFixed(2)}/hr</div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Bonus</label>
            {isAdmin && isEditingRates ? (
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold">$</span>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="10000"
                  value={bonus}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      setBonus(Math.min(val, 10000));
                    }
                  }}
                  className="w-24 h-8"
                  data-testid="input-bonus"
                />
              </div>
            ) : (
              <div className="text-lg font-semibold">${bonus.toFixed(2)}</div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Effective Rate</label>
            <div className="text-lg font-semibold">
              {weekTotal > 0 ? ((totalSalary / weekTotal) * 100).toFixed(1) : "0.0"}%
            </div>
          </div>
        </div>
        {!isAdmin && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Rates and bonuses are set by administrators
          </p>
        )}
      </Card>
    </div>
  );
}
