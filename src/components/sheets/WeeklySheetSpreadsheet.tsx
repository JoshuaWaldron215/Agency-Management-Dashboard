import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/contexts/UserRoleContext";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { todayETStr, addDaysStr, startOfWeekStr, endOfWeekStr, formatET } from '@/lib/etDate';

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

interface DailyHours {
  id: string;
  work_date: string;
  hours_worked: number;
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

interface WeeklySheetSpreadsheetProps {
  sheet: SheetData;
  onUpdate: () => void;
}

export function WeeklySheetSpreadsheet({ sheet, onUpdate }: WeeklySheetSpreadsheetProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [dailyHours, setDailyHours] = useState<DailyHours[]>([]);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    // Always start with the current week (Saturday-Friday)
    return startOfWeekStr(todayETStr());
  });
  const [editableFields, setEditableFields] = useState({
    commission_rate: sheet.commission_rate,
    hourly_rate: sheet.hourly_rate,
    bonus: sheet.bonus,
    total_hours: sheet.total_hours
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchModels();
    fetchDailySales();
    fetchDailyHours();

    // Subscribe to real-time updates for hours
    const hoursChannel = supabase
      .channel('sheet-hours-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatter_daily_hours',
          filter: `sheet_id=eq.${sheet.id}`
        },
        () => {
          fetchDailyHours();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(hoursChannel);
    };
  }, [sheet.id, currentWeekStart]);

  const fetchModels = async () => {
    // Only show active models (not soft-deleted) in the dropdown
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .is("deleted_at", null)
      .order("name");
    
    if (!error && data) {
      setModels(data);
    }
  };

  const fetchDailySales = async () => {
    const { data, error } = await supabase
      .from("chatter_sheet_daily_sales")
      .select("*")
      .eq("sheet_id", sheet.id);
    
    if (!error && data) {
      setDailySales(data);
    }
  };

  const fetchDailyHours = async () => {
    const { data, error } = await supabase
      .from("chatter_daily_hours")
      .select("*")
      .eq("sheet_id", sheet.id);
    
    if (!error && data) {
      setDailyHours(data);
    }
  };

  const currentWeekEnd = endOfWeekStr(currentWeekStart);

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => addDaysStr(prev, -7));
    setSelectedCells(new Set());
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDaysStr(prev, 7));
    setSelectedCells(new Set());
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeekStr(todayETStr()));
    setSelectedCells(new Set());
  };

  const getDailySalesForWeek = (modelId: string): { date: string; amount: number }[] => {
    const days: { date: string; amount: number }[] = [];
    
    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysStr(currentWeekStart, i);
      const sale = dailySales.find(s => 
        s.model_id === modelId && s.sale_date === dateStr
      );
      days.push({ date: dateStr, amount: sale ? Number(sale.sales_amount) : 0 });
    }
    
    return days;
  };

  const getWeeklySales = (modelId: string): number => {
    const weekDates = new Set(
      Array.from({ length: 7 }, (_, i) => addDaysStr(currentWeekStart, i))
    );
    return dailySales
      .filter(sale => sale.model_id === modelId && weekDates.has(sale.sale_date))
      .reduce((sum, sale) => sum + Number(sale.sales_amount), 0);
  };

  const getModelTotal = (modelId: string): number => {
    return dailySales
      .filter(sale => sale.model_id === modelId)
      .reduce((sum, sale) => sum + Number(sale.sales_amount), 0);
  };

  const getWeekTotal = (): number => {
    const weekDates = new Set(
      Array.from({ length: 7 }, (_, i) => addDaysStr(currentWeekStart, i))
    );
    return dailySales
      .filter(sale => weekDates.has(sale.sale_date))
      .reduce((sum, sale) => sum + Number(sale.sales_amount), 0);
  };

  const handleUpdateDailySale = async (modelId: string, dayIndex: number, value: string) => {
    const dateStr = addDaysStr(currentWeekStart, dayIndex);
    const amount = parseFloat(value) || 0;

    try {
      const existingSale = dailySales.find(s => 
        s.model_id === modelId && s.sale_date === dateStr
      );

      if (existingSale) {
        await supabase
          .from("chatter_sheet_daily_sales")
          .update({ sales_amount: amount })
          .eq("id", existingSale.id);
      } else {
        await supabase
          .from("chatter_sheet_daily_sales")
          .insert({
            sheet_id: sheet.id,
            model_id: modelId,
            sale_date: dateStr,
            sales_amount: amount
          });
      }

      await fetchDailySales();
      toast.success("Updated");
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error("Failed to update");
    }
  };

  const handleUpdateHours = async (dayIndex: number, value: string) => {
    const dateStr = addDaysStr(currentWeekStart, dayIndex);
    const hours = parseFloat(value) || 0;

    try {
      const existingHours = dailyHours.find(h => h.work_date === dateStr);

      if (existingHours) {
        await supabase
          .from("chatter_daily_hours")
          .update({ hours_worked: hours })
          .eq("id", existingHours.id);
      } else {
        await supabase
          .from("chatter_daily_hours")
          .insert({
            sheet_id: sheet.id,
            work_date: dateStr,
            hours_worked: hours
          });
      }

      await fetchDailyHours();
      toast.success("Hours updated");
    } catch (error) {
      console.error("Error updating hours:", error);
      toast.error("Failed to update hours");
    }
  };

  const handleUpdateSheetField = async (field: string, value: number) => {
    try {
      await supabase
        .from("chatter_sheets")
        .update({ [field]: value })
        .eq("id", sheet.id);
      
      setEditableFields(prev => ({ ...prev, [field]: value }));
      onUpdate();
      toast.success("Updated");
    } catch (error) {
      console.error("Error updating sheet:", error);
      toast.error("Failed to update");
    }
  };

  const weekTotal = getWeekTotal();
  
  // Helper function to get daily hours
  const getDailyHours = (dayIndex: number): number => {
    const dateStr = addDaysStr(currentWeekStart, dayIndex);
    const hours = dailyHours.find(h => h.work_date === dateStr);
    return hours ? Number(hours.hours_worked) : 0;
  };
  
  // Calculate total hours for the current week only
  const getWeekTotalHours = (): number => {
    return Array.from({ length: 7 })
      .map((_, dayIndex) => getDailyHours(dayIndex))
      .reduce((sum, hours) => sum + hours, 0);
  };
  
  // Calculate total hours from daily hours
  const totalHoursWorked = dailyHours.reduce((sum, h) => sum + Number(h.hours_worked), 0);
  
  // Calculate week hours
  const weekHoursWorked: number = Array.from({ length: 7 }).reduce<number>((sum, _, dayIndex) => {
    return sum + getDailyHours(dayIndex);
  }, 0);
  
  const weekCommission = weekTotal * Number(editableFields.commission_rate);
  const weekHourlyPay = weekHoursWorked * Number(editableFields.hourly_rate);
  
  const grandTotal = dailySales.reduce((sum, sale) => sum + Number(sale.sales_amount), 0);
  const commission = grandTotal * Number(editableFields.commission_rate);
  const totalHourlyPay = totalHoursWorked * Number(editableFields.hourly_rate);
  const totalSalary = commission + totalHourlyPay + Number(editableFields.bonus);
  const percentBonus = grandTotal > 0 ? (Number(editableFields.bonus) / grandTotal) * 100 : 0;

  const canEdit = isAdmin || (currentUserId && sheet.chatter_user_id === currentUserId);

  const getCellId = (modelId: string, dayIndex: number) => `${modelId}-${dayIndex}`;

  const handleCellClick = (modelId: string, dayIndex: number, e: React.MouseEvent) => {
    const cellId = getCellId(modelId, dayIndex);
    
    if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(selectedCells);
      if (newSelected.has(cellId)) {
        newSelected.delete(cellId);
      } else {
        newSelected.add(cellId);
      }
      setSelectedCells(newSelected);
    } else {
      setSelectedCells(new Set([cellId]));
    }
  };

  const handleCopy = useCallback(() => {
    if (selectedCells.size === 0) return null;

    const cellsData: { modelId: string; dayIndex: number; value: number }[] = [];
    selectedCells.forEach(cellId => {
      const [modelId, dayIndexStr] = cellId.split('-');
      const dayIndex = parseInt(dayIndexStr);
      const dailySales = getDailySalesForWeek(modelId);
      const value = dailySales[dayIndex]?.amount || 0;
      cellsData.push({ modelId, dayIndex, value });
    });

    const text = cellsData.map(cell => cell.value.toFixed(2)).join('\t');
    toast.success("Copied to clipboard");
    return text;
  }, [selectedCells, dailySales, currentWeekStart]);

  const handlePaste = useCallback(async (text: string) => {
    if (!isAdmin || selectedCells.size === 0) return;

    const values = text.split(/[\t\n]/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    const cellsArray = Array.from(selectedCells);

    for (let i = 0; i < Math.min(values.length, cellsArray.length); i++) {
      const [modelId, dayIndexStr] = cellsArray[i].split('-');
      const dayIndex = parseInt(dayIndexStr);
      
      await handleUpdateDailySale(modelId, dayIndex, values[i].toString());
    }

    toast.success("Pasted values");
  }, [selectedCells, isAdmin, currentWeekStart, sheet.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const text = handleCopy();
        if (text) {
          navigator.clipboard.writeText(text);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        navigator.clipboard.readText().then(text => {
          if (text) handlePaste(text);
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste]);

  const renderMobileView = () => (
    <div className="space-y-4 md:hidden">
      <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg sticky top-0 z-20">
        <div>
          <div className="text-xs text-muted-foreground">Week Total</div>
          <div className="text-lg font-bold text-primary">${weekTotal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Week Hours</div>
          <div className="text-lg font-bold">{weekHoursWorked.toFixed(1)}h</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Commission</div>
          <div className="text-lg font-bold">${weekCommission.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Salary</div>
          <div className="text-lg font-bold text-primary">${totalSalary.toFixed(2)}</div>
        </div>
      </div>

      {Array.from({ length: 7 }).map((_, dayIndex) => {
        const dateStr = addDaysStr(currentWeekStart, dayIndex);
        const dayHours = getDailyHours(dayIndex);
        const dayTotal = dailySales
          .filter(s => s.sale_date === dateStr)
          .reduce((sum, s) => sum + Number(s.sales_amount), 0);

        return (
          <div key={dayIndex} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">
                  {formatET(dateStr, { weekday: 'short' })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatET(dateStr, { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">${dayTotal.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{dayHours || 0}h</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-accent/30 rounded">
                <span className="text-sm font-medium w-24">Hours:</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={dayHours || ''}
                  onChange={(e) => handleUpdateHours(dayIndex, e.target.value)}
                  className="flex-1 h-12 text-base"
                  placeholder="0"
                  data-testid={`input-hours-day-${dayIndex}`}
                />
              </div>

              {models.map((model) => {
                const dailySalesData = getDailySalesForWeek(model.id);
                const daySale = dailySalesData[dayIndex];

                return (
                  <div key={model.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30">
                    <span className="text-sm font-medium w-24 truncate">{model.name}:</span>
                    {canEdit ? (
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={daySale?.amount || ''}
                          onChange={(e) => handleUpdateDailySale(model.id, dayIndex, e.target.value)}
                          className="h-12 text-base pl-7"
                          placeholder="0.00"
                          data-testid={`input-sale-${model.id}-day-${dayIndex}`}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 text-right font-medium">${(daySale?.amount || 0).toFixed(2)}</div>
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
    <div className="space-y-4" ref={tableRef}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground hidden md:block">
          Tip: Click cells to select, Ctrl+C to copy, Ctrl+V to paste
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="touch-target" data-testid="button-prev-week">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={handleToday} className="flex-1 sm:flex-none touch-target" data-testid="button-this-week">
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek} className="touch-target" data-testid="button-next-week">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="text-center font-medium text-sm sm:text-base">
        Week of {formatET(currentWeekStart, { month: 'short', day: 'numeric' })} - {formatET(currentWeekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>

      {renderMobileView()}

      <div className="overflow-x-auto mobile-scroll-container hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border bg-muted p-2 text-left font-medium sticky left-0 z-10">
                Model
              </th>
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dateStr = addDaysStr(currentWeekStart, dayIndex);
                
                return (
                  <th key={dayIndex} className="border border-border bg-muted p-2 text-center font-medium min-w-[100px]">
                    <div className="text-xs">
                      {formatET(dateStr, { weekday: 'short' })}
                    </div>
                    <div className="text-xs font-normal">
                      {formatET(dateStr, { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                );
              })}
              <th className="border border-border bg-muted p-2 text-center font-medium min-w-[100px]">
                Week Total
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Hours Worked Row */}
            <tr className="bg-accent/50">
              <td className="border border-border p-2 font-medium sticky left-0 bg-accent/50 z-10">
                Hours Worked
              </td>
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const hours = getDailyHours(dayIndex);
                
                return (
                  <td key={dayIndex} className="border border-border p-0 text-center">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={hours || ''}
                        onChange={(e) => handleUpdateHours(dayIndex, e.target.value)}
                        className="border-0 rounded-none text-center h-auto p-2 bg-transparent"
                        placeholder="0"
                      />
                    </div>
                  </td>
                );
              })}
              <td className="border border-border p-2 text-center font-medium bg-accent/50">
                {getWeekTotalHours().toFixed(1)}h
              </td>
            </tr>

            {/* Model Sales Rows */}
            {models.map((model) => {
              const dailySalesData = getDailySalesForWeek(model.id);
              const modelWeekTotal = getWeeklySales(model.id);
              
              return (
                <tr key={model.id}>
                  <td className="border border-border p-2 font-medium sticky left-0 bg-background z-10">
                    {model.name}
                  </td>
                  {dailySalesData.map((daySale, dayIndex) => {
                    const cellId = getCellId(model.id, dayIndex);
                    const isSelected = selectedCells.has(cellId);
                    
                    return (
                      <td 
                        key={dayIndex} 
                        className={`border border-border p-0 text-center ${
                          canEdit ? 'cursor-pointer select-none transition-colors' : ''
                        } ${
                          isSelected ? 'bg-primary/20 ring-2 ring-primary' : canEdit ? 'hover:bg-muted/50' : ''
                        }`}
                        onClick={(e) => canEdit && handleCellClick(model.id, dayIndex, e)}
                      >
                        {canEdit ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={daySale.amount || ''}
                              onChange={(e) => handleUpdateDailySale(model.id, dayIndex, e.target.value)}
                              className="border-0 rounded-none text-center h-auto p-2 pl-6 bg-transparent"
                              placeholder="0.00"
                            />
                          </div>
                        ) : (
                          <div className="p-2">${daySale.amount.toFixed(2)}</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-border p-2 text-center font-medium bg-muted">
                    ${modelWeekTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted font-medium">
              <td className="border border-border p-2 sticky left-0 bg-muted z-10">
                Daily Total
              </td>
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dateStr = addDaysStr(currentWeekStart, dayIndex);
                const dayTotal = dailySales
                  .filter(s => s.sale_date === dateStr)
                  .reduce((sum, s) => sum + Number(s.sales_amount), 0);
                
                return (
                  <td key={dayIndex} className="border border-border p-2 text-center">
                    ${dayTotal.toFixed(2)}
                  </td>
                );
              })}
              <td className="border border-border p-2 text-center">
                ${weekTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 bg-muted rounded-lg">
        <div>
          <div className="text-sm text-muted-foreground">Week Hours</div>
          <div className="text-xl font-bold">{weekHoursWorked.toFixed(1)}h</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Week Hourly Pay</div>
          {isAdmin ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="text-xs">Rate:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editableFields.hourly_rate}
                  onChange={(e) => handleUpdateSheetField('hourly_rate', parseFloat(e.target.value) || 0)}
                  className="h-6 text-xs w-20"
                  placeholder="0.00"
                />
              </div>
              <div className="text-sm">{weekHoursWorked.toFixed(1)}h × ${Number(editableFields.hourly_rate).toFixed(2)} = <span className="font-bold">${weekHourlyPay.toFixed(2)}</span></div>
            </div>
          ) : (
            <div className="text-xl font-bold">${weekHourlyPay.toFixed(2)}</div>
          )}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Week Sales</div>
          <div className="text-xl font-bold">${weekTotal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            Week Commission
            {isAdmin && (
              <span className="text-xs ml-1">
                ({(Number(editableFields.commission_rate) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={editableFields.commission_rate}
                onChange={(e) => handleUpdateSheetField('commission_rate', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
                placeholder="0.00"
              />
              <span className="text-sm">= ${weekCommission.toFixed(2)}</span>
            </div>
          ) : (
            <div className="text-xl font-bold">${weekCommission.toFixed(2)}</div>
          )}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Total Hours</div>
          <div className="text-xl font-bold">{totalHoursWorked.toFixed(1)}h</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Total Hourly Pay</div>
          <div className="text-sm">{totalHoursWorked.toFixed(1)}h × ${Number(editableFields.hourly_rate).toFixed(2)}</div>
          <div className="text-xl font-bold">${totalHourlyPay.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Total Sales</div>
          <div className="text-xl font-bold">${grandTotal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            Total Commission
            {isAdmin && (
              <span className="text-xs ml-1">
                ({(Number(editableFields.commission_rate) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
          <div className="text-xl font-bold">${commission.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Bonus ({percentBonus.toFixed(1)}%)</div>
          {isAdmin ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editableFields.bonus}
              onChange={(e) => handleUpdateSheetField('bonus', parseFloat(e.target.value) || 0)}
              className="h-8"
              placeholder="0.00"
            />
          ) : (
            <div className="text-xl font-bold">${Number(editableFields.bonus).toFixed(2)}</div>
          )}
        </div>
        <div className="col-span-2 md:col-span-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Salary</div>
              <div className="text-2xl font-bold text-primary">${totalSalary.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-2">Chatter: {sheet.chatter_name}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Percentage based on sales</div>
              <div className="text-lg font-semibold">
                {weekTotal > 0 ? ((totalSalary / weekTotal) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
