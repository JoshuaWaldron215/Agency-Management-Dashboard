import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeekStr } from "@/lib/etDate";
import { useToast } from "@/hooks/use-toast";

interface DailySalesData {
  modelId: string;
  modelName: string;
  date: string;
  grossAmount: number;
  netAmount: number;
  transactionCount: number;
  ppvCount: number;
  ppvAmount: number;
  subscriptionCount: number;
  subscriptionAmount: number;
  tipsAmount: number;
  bundlesAmount: number;
  otherAmount: number;
}

interface SaveToSheetResult {
  success: boolean;
  sheetId?: string;
  message: string;
}

interface Sheet {
  id: string;
  chatter_name: string;
  week_start_date: string;
  chatter_user_id: string;
}

export function useSaveToSheet() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [useMockData] = useState(false);

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  };

  const getWeekStartFromDate = (dateStr: string): string => {
    return startOfWeekStr(dateStr);
  };

  const findSheetForWeek = async (
    userId: string,
    weekStart: string
  ): Promise<{ found: boolean; sheet?: Sheet }> => {
    const { data, error } = await supabase
      .from("chatter_sheets")
      .select("id, chatter_name, week_start_date, chatter_user_id")
      .eq("chatter_user_id", userId)
      .eq("week_start_date", weekStart)
      .single();

    if (error || !data) {
      return { found: false };
    }

    return { found: true, sheet: data };
  };

  const getOrCreateChatterDetails = async (userId: string): Promise<string | null> => {
    const { data: existingDetails } = await supabase
      .from("chatter_details")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingDetails) {
      return existingDetails.id;
    }

    const { data: newDetails, error: insertError } = await supabase
      .from("chatter_details")
      .insert({
        user_id: userId,
        pay_class: "standard",
        start_date: new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating chatter details:", insertError);
      return null;
    }

    return newDetails.id;
  };

  const getUserProfile = async (userId: string): Promise<{ name: string; email: string } | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  };

  const createSheetForWeek = async (
    userId: string,
    weekStart: string
  ): Promise<{ created: boolean; sheet?: Sheet }> => {
    try {
      const profile = await getUserProfile(userId);
      if (!profile) {
        console.error("Could not find user profile");
        return { created: false };
      }

      const chatterDetailsId = await getOrCreateChatterDetails(userId);
      if (!chatterDetailsId) {
        console.error("Could not get or create chatter details");
        return { created: false };
      }

      const chatterName = profile.name || profile.email;

      const periodStart = new Date(weekStart);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
      const periodEndStr = periodEnd.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("chatter_sheets")
        .insert({
          chatter_id: chatterDetailsId,
          chatter_user_id: userId,
          chatter_name: chatterName,
          week_start_date: weekStart,
          period_start: weekStart,
          period_end: periodEndStr,
          commission_rate: 8,
          hourly_rate: 15,
          total_hours: 0,
          bonus: 0,
        })
        .select("id, chatter_name, week_start_date, chatter_user_id")
        .single();

      if (error) {
        console.error("Error creating sheet:", error);
        return { created: false };
      }

      return { created: true, sheet: data };
    } catch (error) {
      console.error("Error in createSheetForWeek:", error);
      return { created: false };
    }
  };

  const saveDailySales = async (
    sheetId: string,
    salesData: DailySalesData[]
  ): Promise<boolean> => {
    try {
      for (const sale of salesData) {
        const { data: existing, error: fetchError } = await supabase
          .from("chatter_sheet_daily_sales")
          .select("id, sales_amount, gross_amount, net_amount, transaction_count, ppv_amount, subscription_amount, tips_amount, bundles_amount, other_amount")
          .eq("sheet_id", sheetId)
          .eq("model_id", sale.modelId)
          .eq("sale_date", sale.date)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          console.error("Error checking existing sale:", fetchError);
          return false;
        }

        if (existing) {
          const { error: updateError } = await supabase
            .from("chatter_sheet_daily_sales")
            .update({
              sales_amount: sale.netAmount,
              gross_amount: sale.grossAmount,
              net_amount: sale.netAmount,
              transaction_count: sale.transactionCount,
              ppv_amount: sale.ppvAmount,
              subscription_amount: sale.subscriptionAmount,
              tips_amount: sale.tipsAmount,
              bundles_amount: sale.bundlesAmount,
              other_amount: sale.otherAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) {
            console.error("Error updating daily sale:", updateError);
            return false;
          }
        } else {
          const { error: insertError } = await supabase
            .from("chatter_sheet_daily_sales")
            .insert({
              sheet_id: sheetId,
              model_id: sale.modelId,
              sale_date: sale.date,
              sales_amount: sale.netAmount,
              gross_amount: sale.grossAmount,
              net_amount: sale.netAmount,
              transaction_count: sale.transactionCount,
              ppv_amount: sale.ppvAmount,
              subscription_amount: sale.subscriptionAmount,
              tips_amount: sale.tipsAmount,
              bundles_amount: sale.bundlesAmount,
              other_amount: sale.otherAmount,
            });

          if (insertError) {
            console.error("Error inserting daily sale:", insertError);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Error in saveDailySales:", error);
      return false;
    }
  };

  const saveToSheet = async (
    modelId: string,
    modelName: string,
    sessionDate: Date,
    transactions: Array<{
      gross: number;
      net: number;
      category: string;
    }>
  ): Promise<SaveToSheetResult> => {
    setIsSaving(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        return {
          success: false,
          message: "You must be logged in to save to a sheet.",
        };
      }

      const dateStr = sessionDate.toISOString().split("T")[0];
      const weekStart = getWeekStartFromDate(dateStr);

      let { found, sheet } = await findSheetForWeek(user.id, weekStart);

      if (!found || !sheet) {
        const { created, sheet: newSheet } = await createSheetForWeek(user.id, weekStart);
        if (!created || !newSheet) {
          return {
            success: false,
            message: `Could not create a sheet for the week of ${weekStart}. Please contact an admin.`,
          };
        }
        sheet = newSheet;
        toast({
          title: "Sheet created",
          description: `A new sheet was created for the week of ${weekStart}.`,
        });
      }

      const grossTotal = transactions.reduce((sum, t) => sum + t.gross, 0);
      const netTotal = transactions.reduce((sum, t) => sum + t.net, 0);

      const ppvCategories = ["PPV", "PPV Message", "Message", "Payment for message"];
      const tipCategories = ["Tip", "Tips"];
      const subCategories = ["Subscription", "Recurring Subscription", "Recurring subscription"];
      const bundleCategories = ["Bundle", "Bundles"];

      let ppvAmount = 0;
      let ppvCount = 0;
      let tipsAmount = 0;
      let subscriptionAmount = 0;
      let subscriptionCount = 0;
      let bundlesAmount = 0;
      let otherAmount = 0;

      transactions.forEach((t) => {
        const categoryLower = t.category.toLowerCase();
        
        if (ppvCategories.some(cat => categoryLower === cat.toLowerCase() || categoryLower.includes("ppv") || categoryLower.includes("message"))) {
          ppvAmount += t.net;
          ppvCount++;
        } else if (tipCategories.some(cat => categoryLower === cat.toLowerCase() || categoryLower.includes("tip"))) {
          tipsAmount += t.net;
        } else if (subCategories.some(cat => categoryLower === cat.toLowerCase() || categoryLower.includes("subscription"))) {
          subscriptionAmount += t.net;
          subscriptionCount++;
        } else if (bundleCategories.some(cat => categoryLower === cat.toLowerCase() || categoryLower.includes("bundle"))) {
          bundlesAmount += t.net;
        } else {
          otherAmount += t.net;
        }
      });

      const dailySalesData: DailySalesData[] = [
        {
          modelId,
          modelName,
          date: dateStr,
          grossAmount: grossTotal,
          netAmount: netTotal,
          transactionCount: transactions.length,
          ppvCount,
          ppvAmount,
          subscriptionCount,
          subscriptionAmount,
          tipsAmount,
          bundlesAmount,
          otherAmount,
        },
      ];

      const saveSuccess = await saveDailySales(sheet.id, dailySalesData);

      if (!saveSuccess) {
        return {
          success: false,
          message: "Failed to save daily sales data. Please try again.",
        };
      }

      // Save individual transactions to model_transactions table
      const transactionRecords = transactions.map((t) => ({
        model_id: modelId,
        chatter_id: user.id,
        transaction_date: dateStr,
        gross: t.gross,
        net: t.net,
        fee: t.gross - t.net,
        category: t.category,
        description: (t as any).description || null,
      }));

      if (transactionRecords.length > 0) {
        try {
          const { error: txError } = await supabase
            .from("model_transactions")
            .insert(transactionRecords);

          if (txError) {
            console.warn("Could not save individual transactions:", txError);
          }
        } catch (e) {
          console.warn("model_transactions table may not exist yet:", e);
        }
      }

      return {
        success: true,
        sheetId: sheet.id,
        message: `Saved $${netTotal.toFixed(2)} net for ${modelName} on ${dateStr} to your sheet.`,
      };
    } catch (error) {
      console.error("Error in saveToSheet:", error);
      return {
        success: false,
        message: "An unexpected error occurred. Please try again.",
      };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveToSheet,
    isSaving,
    useMockData,
  };
}
