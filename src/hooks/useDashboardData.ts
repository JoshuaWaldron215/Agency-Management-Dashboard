import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, endOfMonth, startOfMonth, format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const ET_TIMEZONE = "America/New_York";

export interface MonthSelection {
  month: number;
  year: number;
}

export interface ModelEarnings {
  modelId: string;
  modelName: string;
  today: number;
  last7: number;
  last30: number;
  allTime: number;
  filtered: number;
}

export interface DashboardData {
  totalRevenue: number;
  totalSales: number;
  revenueChange: number;
  commissionEarned: number;
  commissionPerHour: number;
  hoursWorked: number;
  totalShifts: number;
  avgSaleValue: number;
  salesPerShift: number;
  revenuePerHour: number;
  revenuePerShift: number;
  shiftBonusRate: number;
  legendCount: number;
  championCount: number;
  aceCount: number;
  bestDay: string;
  bestDayRevenue: number;
  bestDaySales: number;
  peakHour: string;
  peakHourRevenue: number;
  peakHourSales: number;
  saleTypes: Array<{ name: string; value: number; percentage: number }>;
  dailyPerformance: Array<{ day: string; revenue: number; sales: number }>;
  modelEarnings: ModelEarnings[];
  useMockData?: boolean;
}

const emptyData: DashboardData = {
  totalRevenue: 0,
  totalSales: 0,
  revenueChange: 0,
  commissionEarned: 0,
  commissionPerHour: 0,
  hoursWorked: 0,
  totalShifts: 0,
  avgSaleValue: 0,
  salesPerShift: 0,
  revenuePerHour: 0,
  revenuePerShift: 0,
  shiftBonusRate: 0,
  legendCount: 0,
  championCount: 0,
  aceCount: 0,
  bestDay: "N/A",
  bestDayRevenue: 0,
  bestDaySales: 0,
  peakHour: "N/A",
  peakHourRevenue: 0,
  peakHourSales: 0,
  saleTypes: [
    { name: "PPV Messages", value: 0, percentage: 0 },
    { name: "Tips", value: 0, percentage: 0 },
    { name: "Subscriptions", value: 0, percentage: 0 },
    { name: "Bundles", value: 0, percentage: 0 },
    { name: "Other", value: 0, percentage: 0 },
  ],
  dailyPerformance: [
    { day: "Sun", revenue: 0, sales: 0 },
    { day: "Mon", revenue: 0, sales: 0 },
    { day: "Tue", revenue: 0, sales: 0 },
    { day: "Wed", revenue: 0, sales: 0 },
    { day: "Thu", revenue: 0, sales: 0 },
    { day: "Fri", revenue: 0, sales: 0 },
    { day: "Sat", revenue: 0, sales: 0 },
  ],
  modelEarnings: [],
};

function getDateRange(timeFilter: string, monthSelection?: MonthSelection): { startDate: Date; endDate: Date } {
  // If specific month is selected, use that month's range
  if (monthSelection) {
    const monthStart = new Date(monthSelection.year, monthSelection.month, 1);
    const monthEnd = endOfMonth(monthStart);
    return { startDate: monthStart, endDate: addDays(monthEnd, 1) };
  }

  const now = new Date();
  const nowET = toZonedTime(now, ET_TIMEZONE);
  const endDate = startOfDay(nowET);
  
  let startDate: Date;
  
  switch (timeFilter) {
    case "today":
      startDate = endDate;
      break;
    case "7":
      startDate = subDays(endDate, 6);
      break;
    case "14":
      startDate = subDays(endDate, 13);
      break;
    case "30":
      startDate = subDays(endDate, 29);
      break;
    case "90":
      startDate = subDays(endDate, 89);
      break;
    case "365":
      startDate = subDays(endDate, 364);
      break;
    case "all":
    default:
      startDate = new Date(2020, 0, 1);
      break;
  }
  
  return { startDate, endDate: addDays(endDate, 1) };
}

function getDayName(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "EEE");
}

function isDateInRange(dateStr: string, startDate: Date, endDate: Date, startDateStr: string): boolean {
  const date = parseISO(dateStr);
  return (isAfter(date, startDate) || format(date, "yyyy-MM-dd") === startDateStr) && isBefore(date, endDate);
}

async function fetchDashboardDataFromDB(
  timeFilter: string,
  userId?: string | null,
  monthSelection?: MonthSelection
): Promise<DashboardData> {
  try {
    const { startDate, endDate } = getDateRange(timeFilter, monthSelection);
    const startDateStr = format(startDate, "yyyy-MM-dd");

    let sheetsQuery = supabase
      .from("chatter_sheets")
      .select(`
        id,
        chatter_user_id,
        commission_rate,
        hourly_rate,
        total_hours,
        bonus,
        week_start_date,
        chatter_sheet_daily_sales (
          sale_date,
          sales_amount,
          gross_amount,
          net_amount,
          transaction_count,
          ppv_amount,
          subscription_amount,
          tips_amount,
          bundles_amount,
          other_amount,
          model_id
        ),
        chatter_daily_hours (
          work_date,
          hours_worked
        )
      `);

    if (userId) {
      sheetsQuery = sheetsQuery.eq("chatter_user_id", userId);
    }

    const { data: sheets, error: sheetsError } = await sheetsQuery;

    if (sheetsError) {
      console.error("Error fetching sheets:", sheetsError);
      return { ...emptyData, useMockData: false };
    }

    if (!sheets || sheets.length === 0) {
      return { ...emptyData, useMockData: false };
    }

    const now = new Date();
    const nowET = toZonedTime(now, ET_TIMEZONE);
    const todayStart = startOfDay(nowET);
    const todayEnd = addDays(todayStart, 1);
    const todayStr = format(todayStart, "yyyy-MM-dd");
    
    const last7Start = subDays(todayStart, 6);
    const last7Str = format(last7Start, "yyyy-MM-dd");
    
    const last30Start = subDays(todayStart, 29);
    const last30Str = format(last30Start, "yyyy-MM-dd");
    
    const prevWeekStart = subDays(todayStart, 13);
    const prevWeekEnd = subDays(todayStart, 7);
    const prevWeekStartStr = format(prevWeekStart, "yyyy-MM-dd");

    let totalRevenue = 0;
    let prevWeekRevenue = 0;
    let currentWeekRevenue = 0;
    let totalSales = 0;
    let ppvTotal = 0;
    let tipsTotal = 0;
    let subscriptionsTotal = 0;
    let bundlesTotal = 0;
    let otherTotal = 0;
    let hoursWorked = 0;
    
    let weightedCommissionSum = 0;
    let totalBonusInRange = 0;
    const sheetsWithDataInRange = new Set<string>();

    const dailyMap = new Map<string, { revenue: number; sales: number }>();
    const specificDateMap = new Map<string, { revenue: number; sales: number }>();
    
    const modelEarningsMap = new Map<string, { today: number; last7: number; last30: number; allTime: number; filtered: number }>();
    
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayNames.forEach(day => dailyMap.set(day, { revenue: 0, sales: 0 }));

    sheets.forEach((sheet) => {
      const dailySales = sheet.chatter_sheet_daily_sales || [];
      const dailyHours = sheet.chatter_daily_hours || [];
      const sheetCommissionRate = Number(sheet.commission_rate) || 0;
      
      let sheetRevenueInRange = 0;
      
      dailySales.forEach((sale) => {
        const amount = Number(sale.net_amount) || Number(sale.sales_amount) || 0;
        const modelId = sale.model_id;
        
        if (modelId && amount > 0) {
          const existing = modelEarningsMap.get(modelId) || { today: 0, last7: 0, last30: 0, allTime: 0, filtered: 0 };
          existing.allTime += amount;
          
          if (isDateInRange(sale.sale_date, todayStart, todayEnd, todayStr)) {
            existing.today += amount;
          }
          if (isDateInRange(sale.sale_date, last7Start, todayEnd, last7Str)) {
            existing.last7 += amount;
          }
          if (isDateInRange(sale.sale_date, last30Start, todayEnd, last30Str)) {
            existing.last30 += amount;
          }
          if (isDateInRange(sale.sale_date, startDate, endDate, startDateStr)) {
            existing.filtered += amount;
          }
          
          modelEarningsMap.set(modelId, existing);
        }
        
        if (isDateInRange(sale.sale_date, prevWeekStart, prevWeekEnd, prevWeekStartStr)) {
          prevWeekRevenue += amount;
        }
        
        if (isDateInRange(sale.sale_date, last7Start, todayEnd, last7Str)) {
          currentWeekRevenue += amount;
        }
        
        if (isDateInRange(sale.sale_date, startDate, endDate, startDateStr)) {
          const transactionCount = Number(sale.transaction_count) || 1;
          
          totalRevenue += amount;
          totalSales += transactionCount;
          sheetRevenueInRange += amount;
          
          ppvTotal += Number(sale.ppv_amount) || 0;
          tipsTotal += Number(sale.tips_amount) || 0;
          subscriptionsTotal += Number(sale.subscription_amount) || 0;
          bundlesTotal += Number(sale.bundles_amount) || 0;
          otherTotal += Number(sale.other_amount) || 0;
          
          const dayName = getDayName(sale.sale_date);
          const existing = dailyMap.get(dayName) || { revenue: 0, sales: 0 };
          dailyMap.set(dayName, {
            revenue: existing.revenue + amount,
            sales: existing.sales + transactionCount,
          });
          
          const dateKey = sale.sale_date;
          const existingDate = specificDateMap.get(dateKey) || { revenue: 0, sales: 0 };
          specificDateMap.set(dateKey, {
            revenue: existingDate.revenue + amount,
            sales: existingDate.sales + transactionCount,
          });
          
          sheetsWithDataInRange.add(sheet.id);
        }
      });
      
      if (sheetRevenueInRange > 0) {
        weightedCommissionSum += sheetRevenueInRange * sheetCommissionRate;
      }
      
      dailyHours.forEach((hours) => {
        if (isDateInRange(hours.work_date, startDate, endDate, startDateStr)) {
          hoursWorked += Number(hours.hours_worked) || 0;
          sheetsWithDataInRange.add(sheet.id);
        }
      });
      
      if (sheetsWithDataInRange.has(sheet.id)) {
        totalBonusInRange += Number(sheet.bonus) || 0;
      }
    });

    const weightedCommissionRate = totalRevenue > 0 ? weightedCommissionSum / totalRevenue : 0;
    const commissionEarned = (totalRevenue * weightedCommissionRate) / 100;
    const commissionPerHour = hoursWorked > 0 ? commissionEarned / hoursWorked : 0;
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const revenuePerHour = hoursWorked > 0 ? totalRevenue / hoursWorked : 0;

    const totalShifts = Math.ceil(hoursWorked / 4);
    const salesPerShift = totalShifts > 0 ? totalSales / totalShifts : 0;
    const revenuePerShift = totalShifts > 0 ? totalRevenue / totalShifts : 0;

    const shiftBonusRate = totalShifts > 0 ? Math.round((totalBonusInRange / totalShifts) * 100) : 0;

    const totalSaleTypes = ppvTotal + tipsTotal + subscriptionsTotal + bundlesTotal + otherTotal;
    const saleTypes = [
      { 
        name: "PPV Messages", 
        value: ppvTotal, 
        percentage: totalSaleTypes > 0 ? Math.round((ppvTotal / totalSaleTypes) * 100) : 0 
      },
      { 
        name: "Tips", 
        value: tipsTotal, 
        percentage: totalSaleTypes > 0 ? Math.round((tipsTotal / totalSaleTypes) * 100) : 0 
      },
      { 
        name: "Subscriptions", 
        value: subscriptionsTotal, 
        percentage: totalSaleTypes > 0 ? Math.round((subscriptionsTotal / totalSaleTypes) * 100) : 0 
      },
      { 
        name: "Bundles", 
        value: bundlesTotal, 
        percentage: totalSaleTypes > 0 ? Math.round((bundlesTotal / totalSaleTypes) * 100) : 0 
      },
      { 
        name: "Other", 
        value: otherTotal, 
        percentage: totalSaleTypes > 0 ? Math.round((otherTotal / totalSaleTypes) * 100) : 0 
      },
    ];

    const dailyPerformance = dayNames.map(day => ({
      day,
      revenue: dailyMap.get(day)?.revenue || 0,
      sales: dailyMap.get(day)?.sales || 0,
    }));

    let bestDay = "N/A";
    let bestDayRevenue = 0;
    let bestDaySales = 0;
    dailyPerformance.forEach(dp => {
      if (dp.revenue > bestDayRevenue) {
        bestDay = dp.day;
        bestDayRevenue = dp.revenue;
        bestDaySales = dp.sales;
      }
    });
    
    let peakDateStr = "N/A";
    let peakDateRevenue = 0;
    let peakDateSales = 0;
    specificDateMap.forEach((data, dateStr) => {
      if (data.revenue > peakDateRevenue) {
        peakDateStr = dateStr;
        peakDateRevenue = data.revenue;
        peakDateSales = data.sales;
      }
    });
    
    const peakHour = peakDateStr !== "N/A" ? format(parseISO(peakDateStr), "MMM d") : "N/A";

    const legendCount = Math.floor(commissionEarned / 50000);
    const championCount = Math.floor(commissionEarned / 25000);
    const aceCount = Math.floor(commissionEarned / 10000);

    let modelEarnings: ModelEarnings[] = [];
    
    if (modelEarningsMap.size > 0) {
      const modelIds = Array.from(modelEarningsMap.keys());
      const { data: models } = await supabase
        .from('models')
        .select('id, name')
        .in('id', modelIds);
      
      const modelNameMap = new Map<string, string>();
      models?.forEach(m => modelNameMap.set(m.id, m.name));
      
      modelEarnings = modelIds.map(modelId => ({
        modelId,
        modelName: modelNameMap.get(modelId) || 'Unknown Model',
        ...modelEarningsMap.get(modelId)!
      })).sort((a, b) => b.allTime - a.allTime);
    }

    let revenueChange = 0;
    if (prevWeekRevenue > 0) {
      revenueChange = Math.round(((currentWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100);
    } else if (currentWeekRevenue > 0) {
      revenueChange = 100;
    }

    return {
      totalRevenue,
      totalSales,
      revenueChange,
      commissionEarned,
      commissionPerHour,
      hoursWorked,
      totalShifts,
      avgSaleValue,
      salesPerShift,
      revenuePerHour,
      revenuePerShift,
      shiftBonusRate,
      legendCount,
      championCount,
      aceCount,
      bestDay,
      bestDayRevenue,
      bestDaySales,
      peakHour,
      peakHourRevenue: peakDateRevenue,
      peakHourSales: peakDateSales,
      saleTypes,
      dailyPerformance,
      modelEarnings,
      useMockData: false,
    };
  } catch (error) {
    console.error("Error in fetchDashboardDataFromDB:", error);
    return { ...emptyData, useMockData: false };
  }
}

export function useAdminDashboardData(timeFilter: string, monthSelection?: MonthSelection): DashboardData & { loading: boolean; isRefreshing: boolean } {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["adminDashboard", timeFilter, monthSelection?.month, monthSelection?.year],
    queryFn: () => fetchDashboardDataFromDB(timeFilter, null, monthSelection),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const dashboardData = useMemo(() => data || emptyData, [data]);

  return { ...dashboardData, loading: isLoading, isRefreshing: isFetching && !isLoading };
}

export function useChatterDashboardData(timeFilter: string, targetUserId?: string | null): DashboardData & { loading: boolean; isRefreshing: boolean } {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["chatterDashboard", timeFilter, targetUserId],
    queryFn: async () => {
      let userId = targetUserId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      }
      return fetchDashboardDataFromDB(timeFilter, userId);
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const dashboardData = useMemo(() => data || emptyData, [data]);

  return { ...dashboardData, loading: isLoading, isRefreshing: isFetching && !isLoading };
}
