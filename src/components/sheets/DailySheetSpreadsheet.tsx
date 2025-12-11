import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/UserRoleContext";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { addDaysStr, formatET } from "@/lib/etDate";

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
  week_start_date: string;
  commission_rate: number;
  hourly_rate: number;
  total_hours: number;
  bonus: number;
  timezone: string;
  chatter_user_id: string | null;
}

interface DailySheetSpreadsheetProps {
  sheet: SheetData;
  onUpdate: () => void;
}

export function DailySheetSpreadsheet({ sheet, onUpdate }: DailySheetSpreadsheetProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [editingCell, setEditingCell] = useState<{ modelId: string; date: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Generate week dates (Saturday through Friday) from week_start_date
  const days = Array.from({ length: 7 }, (_, i) => addDaysStr(sheet.week_start_date, i));

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
      toast.error("Failed to load models");
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

  const getSaleAmount = (modelId: string, date: string) => {
    const sale = dailySales.find(
      (s) => s.model_id === modelId && s.sale_date === date
    );
    return sale ? Number(sale.sales_amount) : 0;
  };

  const getModelTotal = (modelId: string) => {
    return dailySales
      .filter((s) => s.model_id === modelId)
      .reduce((sum, s) => sum + Number(s.sales_amount), 0);
  };

  const getDayTotal = (date: string) => {
    return dailySales
      .filter((s) => s.sale_date === date)
      .reduce((sum, s) => sum + Number(s.sales_amount), 0);
  };

  const getGrandTotal = () => {
    return dailySales.reduce((sum, s) => sum + Number(s.sales_amount), 0);
  };

  const handleUpdateSale = async (modelId: string, date: string, value: string) => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) {
      toast.error("Invalid amount");
      return;
    }

    try {
      const { error } = await supabase
        .from("chatter_sheet_daily_sales")
        .upsert({
          sheet_id: sheet.id,
          model_id: modelId,
          sale_date: date,
          sales_amount: amount,
        }, {
          onConflict: "sheet_id,model_id,sale_date"
        });

      if (error) throw error;

      await fetchDailySales();
      onUpdate();
      toast.success("Sale updated successfully");
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error("Failed to update sale");
    }
  };

  const grandTotal = getGrandTotal();
  const canEdit = isAdmin || (currentUserId && sheet.chatter_user_id === currentUserId);
  const commission = grandTotal * (sheet.commission_rate / 100);
  const hourlyPay = sheet.total_hours * sheet.hourly_rate;
  const totalSalary = hourlyPay + commission + sheet.bonus;
  const percentBonus = grandTotal > 0 ? ((sheet.bonus / totalSalary) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-4">
      <div className="w-full overflow-x-auto border rounded-lg bg-background">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-2 text-left font-semibold sticky left-0 bg-muted/50 z-10 min-w-[150px]">
                Model
              </th>
              {days.map((dateStr) => (
                <th
                  key={dateStr}
                  className="border border-border p-2 text-center font-semibold min-w-[100px]"
                >
                  {formatET(dateStr, { month: "short", day: "numeric" })}
                  <br />
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatET(dateStr, { weekday: "short" })}
                  </span>
                </th>
              ))}
              <th className="border border-border p-2 text-right font-semibold min-w-[120px] bg-primary/10">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="hover:bg-muted/30">
                <td className="border border-border p-2 font-medium sticky left-0 bg-background">
                  {model.name}
                </td>
                {days.map((dateStr) => {
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
                          }}
                          className="border-0 rounded-none text-center h-auto"
                        />
                      ) : (
                        <div
                          className={`p-2 text-center cursor-pointer hover:bg-muted/50 ${
                            amount > 0 ? "font-medium" : "text-muted-foreground"
                          }`}
                          onClick={() => canEdit && setEditingCell({ modelId: model.id, date: dateStr })}
                        >
                          {amount > 0 ? `$${amount.toFixed(2)}` : "-"}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border border-border p-2 text-right font-semibold bg-primary/5">
                  ${getModelTotal(model.id).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/50 font-semibold">
            <tr>
              <td className="border border-border p-2 sticky left-0 bg-muted/50">Daily Total:</td>
              {days.map((dateStr) => (
                <td
                  key={dateStr}
                  className="border border-border p-2 text-center"
                >
                  ${getDayTotal(dateStr).toFixed(2)}
                </td>
              ))}
              <td className="border border-border p-2 text-right text-lg bg-primary/10">
                ${grandTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Hours:</span>
          <span className="font-semibold">{sheet.total_hours.toFixed(1)}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Hourly Pay ({sheet.hourly_rate}$/h):</span>
          <span className="font-semibold">${hourlyPay.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Sales:</span>
          <span className="font-semibold">${grandTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commission ({sheet.commission_rate}%):</span>
          <span className="font-semibold">${commission.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bonus:</span>
          <span className="font-semibold">${sheet.bonus.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-border text-lg">
          <span className="font-bold">Total Salary:</span>
          <span className="font-bold">${totalSalary.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Bonus %:</span>
          <span>{percentBonus}%</span>
        </div>
      </div>
    </div>
  );
}