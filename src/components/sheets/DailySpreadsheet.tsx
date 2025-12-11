import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/UserRoleContext";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface Model {
  id: string;
  name: string;
}

interface DailySale {
  id: string;
  model_id: string;
  sale_date: string;
  sales_amount: number;
}

interface SheetData {
  id: string;
  chatter_name: string;
  period_start: string;
  period_end: string;
  commission_rate: number;
  hourly_rate: number;
  total_hours: number;
  bonus: number;
  timezone: string;
}

interface DailySpreadsheetProps {
  sheet: SheetData;
  onUpdate: () => void;
}

export function DailySpreadsheet({ sheet, onUpdate }: DailySpreadsheetProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [editingCell, setEditingCell] = useState<{ modelId: string; date: string } | null>(null);
  const { isAdmin } = useUserRole();

  const timezone = sheet.timezone || "America/New_York";
  const days = eachDayOfInterval({
    start: parseISO(sheet.period_start),
    end: parseISO(sheet.period_end)
  });

  useEffect(() => {
    fetchModels();
    fetchDailySales();
  }, [sheet.id]);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  const fetchDailySales = async () => {
    try {
      const { data, error } = await supabase
        .from("chatter_sheet_daily_sales")
        .select("*")
        .eq("sheet_id", sheet.id);

      if (error) throw error;
      setDailySales(data || []);
    } catch (error) {
      console.error("Error fetching daily sales:", error);
    }
  };

  const getSaleAmount = (modelId: string, date: string): number => {
    const sale = dailySales.find(
      s => s.model_id === modelId && s.sale_date === date
    );
    return sale?.sales_amount || 0;
  };

  const handleUpdateSale = async (modelId: string, date: string, value: string) => {
    const amount = parseFloat(value) || 0;

    try {
      const existing = dailySales.find(
        s => s.model_id === modelId && s.sale_date === date
      );

      if (existing) {
        const { error } = await supabase
          .from("chatter_sheet_daily_sales")
          .update({ sales_amount: amount })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chatter_sheet_daily_sales")
          .insert({
            sheet_id: sheet.id,
            model_id: modelId,
            sale_date: date,
            sales_amount: amount
          });

        if (error) throw error;
      }

      fetchDailySales();
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error("Failed to update sale");
    }
  };

  const getModelTotal = (modelId: string): number => {
    return dailySales
      .filter(s => s.model_id === modelId)
      .reduce((sum, s) => sum + Number(s.sales_amount), 0);
  };

  const getDayTotal = (date: string): number => {
    return dailySales
      .filter(s => s.sale_date === date)
      .reduce((sum, s) => sum + Number(s.sales_amount), 0);
  };

  const grandTotal = dailySales.reduce((sum, s) => sum + Number(s.sales_amount), 0);
  const commission = (grandTotal * sheet.commission_rate) / 100;
  const hourlyPay = sheet.total_hours * sheet.hourly_rate;
  const totalSalary = hourlyPay + commission + sheet.bonus;
  const percentBonus = totalSalary > 0 ? ((sheet.bonus / totalSalary) * 100).toFixed(2) : "0.00";

  const renderMobileView = () => (
    <div className="space-y-4 md:hidden">
      <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg sticky top-0 z-20">
        <div>
          <div className="text-xs text-muted-foreground">Total Sales</div>
          <div className="text-lg font-bold text-primary">${grandTotal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Commission</div>
          <div className="text-lg font-bold">${commission.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Hourly Pay</div>
          <div className="text-lg font-bold">${hourlyPay.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total Salary</div>
          <div className="text-lg font-bold text-primary">${totalSalary.toFixed(2)}</div>
        </div>
      </div>

      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayTotal = getDayTotal(dateStr);

        return (
          <div key={dateStr} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">
                  {format(toZonedTime(day, timezone), "EEE")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(toZonedTime(day, timezone), "MMM d")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">${dayTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-2">
              {models.map((model) => {
                const amount = getSaleAmount(model.id, dateStr);
                const isEditing = editingCell?.modelId === model.id && editingCell?.date === dateStr;

                return (
                  <div key={model.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30">
                    <span className="text-sm font-medium w-24 truncate">{model.name}:</span>
                    {isEditing ? (
                      <Input
                        autoFocus
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        defaultValue={amount}
                        onBlur={(e) => {
                          handleUpdateSale(model.id, dateStr, e.target.value);
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateSale(model.id, dateStr, e.currentTarget.value);
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") {
                            setEditingCell(null);
                          }
                        }}
                        className="flex-1 h-12 text-base"
                        data-testid={`input-sale-mobile-${model.id}-${dateStr}`}
                      />
                    ) : (
                      <div
                        className={`flex-1 text-right font-medium p-3 min-h-[44px] flex items-center justify-end rounded cursor-pointer ${isAdmin ? 'hover:bg-muted active:bg-muted/80' : ''}`}
                        onClick={() => isAdmin && setEditingCell({ modelId: model.id, date: dateStr })}
                      >
                        {amount > 0 ? `$${amount.toFixed(2)}` : '-'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderMobileView()}

      <div className="w-full overflow-x-auto border rounded-lg bg-background mobile-scroll-container hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-2 text-left font-semibold sticky left-0 bg-muted/50 z-10 min-w-[150px]">
                Model
              </th>
              {days.map((day) => (
                <th key={day.toISOString()} className="border border-border p-2 text-center font-semibold min-w-[100px]">
                  {format(toZonedTime(day, timezone), "MM/dd")}
                  <br />
                  <span className="text-xs text-muted-foreground font-normal">
                    {format(toZonedTime(day, timezone), "EEE")}
                  </span>
                </th>
              ))}
              <th className="border border-border p-2 text-right font-semibold sticky right-0 bg-muted/50 z-10 min-w-[120px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="hover:bg-muted/30">
                <td className="border border-border p-2 font-medium sticky left-0 bg-background z-10">
                  {model.name}
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isEditing = editingCell?.modelId === model.id && editingCell?.date === dateStr;
                  const amount = getSaleAmount(model.id, dateStr);

                  return (
                    <td key={dateStr} className="border border-border p-0">
                      {isEditing ? (
                        <Input
                          autoFocus
                          type="number"
                          step="0.01"
                          defaultValue={amount}
                          onBlur={(e) => {
                            handleUpdateSale(model.id, dateStr, e.target.value);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateSale(model.id, dateStr, e.currentTarget.value);
                              setEditingCell(null);
                            }
                            if (e.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                          className="border-0 rounded-none text-right h-auto"
                        />
                      ) : (
                        <div
                          className={`p-2 text-right cursor-pointer hover:bg-muted/50 ${amount > 0 ? 'font-medium' : 'text-muted-foreground'}`}
                          onClick={() => isAdmin && setEditingCell({ modelId: model.id, date: dateStr })}
                        >
                          {amount > 0 ? `$${amount.toFixed(2)}` : '-'}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border border-border p-2 text-right font-bold sticky right-0 bg-background z-10">
                  ${getModelTotal(model.id).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/50 font-semibold">
            <tr>
              <td className="border border-border p-2 sticky left-0 bg-muted/50 z-10">
                Daily Total:
              </td>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                return (
                  <td key={dateStr} className="border border-border p-2 text-right">
                    ${getDayTotal(dateStr).toFixed(2)}
                  </td>
                );
              })}
              <td className="border border-border p-2 text-right text-lg sticky right-0 bg-muted/50 z-10">
                ${grandTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
        <div>
          <div className="text-sm text-muted-foreground">Total Sales</div>
          <div className="text-xl font-bold">${grandTotal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Commission ({sheet.commission_rate}%)</div>
          <div className="text-xl font-bold">${commission.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Hourly Pay ({sheet.total_hours}h)</div>
          <div className="text-xl font-bold">${hourlyPay.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Bonus</div>
          <div className="text-xl font-bold">${sheet.bonus.toFixed(2)}</div>
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Total Salary</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${totalSalary.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Bonus Percentage</div>
            <div className="text-3xl font-bold text-primary">{percentBonus}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
