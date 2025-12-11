export interface ParsedTransaction {
  date: string;
  time: string;
  gross: number;
  fee: number;
  net: number;
  description: string;
  category: TransactionCategory;
  hour: number;
}

export type TransactionCategory =
  | "Tip"
  | "PPV Message"
  | "Bundle"
  | "Subscription"
  | "Recurring Subscription"
  | "Welcome Message"
  | "Welcome"
  | "MM PPV"
  | "Direct PPV"
  | "Solo"
  | "VIP"
  | "Sextape"
  | "BJ"
  | "Dildo"
  | "Anal"
  | "Titties"
  | "Pics"
  | "Titty Pics"
  | "Pussy Pics"
  | "GG Pics"
  | "GG Videos"
  | "Asshole Pics"
  | "Ahegao Pics"
  | "Customs"
  | "Twerking Vids"
  | "Ass Pics"
  | "Dick Rate"
  | "Voice Note"
  | "Panties"
  | "JOI"
  | "Other";

export const CATEGORY_OPTIONS: { label: string; value: TransactionCategory; group: "subscription" | "welcome" | "ppv" | "other" }[] = [
  { label: "Subscription", value: "Subscription", group: "subscription" },
  { label: "Recurring Subscription", value: "Recurring Subscription", group: "subscription" },
  { label: "Welcome Message", value: "Welcome", group: "welcome" },
  { label: "MM PPV (Mass PPV)", value: "MM PPV", group: "ppv" },
  { label: "Direct PPV (Bundles)", value: "Direct PPV", group: "ppv" },
  { label: "Solo", value: "Solo", group: "ppv" },
  { label: "VIP", value: "VIP", group: "ppv" },
  { label: "Sextape", value: "Sextape", group: "ppv" },
  { label: "BJ", value: "BJ", group: "ppv" },
  { label: "Dildo", value: "Dildo", group: "ppv" },
  { label: "Anal", value: "Anal", group: "ppv" },
  { label: "Titties", value: "Titties", group: "ppv" },
  { label: "Pics", value: "Pics", group: "ppv" },
  { label: "Titty Pics", value: "Titty Pics", group: "ppv" },
  { label: "Pussy Pics", value: "Pussy Pics", group: "ppv" },
  { label: "GG Pics", value: "GG Pics", group: "ppv" },
  { label: "GG Videos", value: "GG Videos", group: "ppv" },
  { label: "Asshole Pics", value: "Asshole Pics", group: "ppv" },
  { label: "Ahegao Pics", value: "Ahegao Pics", group: "ppv" },
  { label: "Customs", value: "Customs", group: "ppv" },
  { label: "Twerking Vids", value: "Twerking Vids", group: "ppv" },
  { label: "Ass Pics", value: "Ass Pics", group: "ppv" },
  { label: "Dick Rate (Premade)", value: "Dick Rate", group: "ppv" },
  { label: "Voice Note", value: "Voice Note", group: "ppv" },
  { label: "Panties", value: "Panties", group: "ppv" },
  { label: "JOI", value: "JOI", group: "ppv" },
  { label: "Tip", value: "Tip", group: "other" },
  { label: "PPV Message", value: "PPV Message", group: "ppv" },
  { label: "Bundle", value: "Bundle", group: "ppv" },
  { label: "Other", value: "Other", group: "other" },
];

export interface CategoryTotals {
  gross: number;
  net: number;
  count: number;
  wholeNumberCount?: number;
  tipCount?: number;
}

export interface EarningsStats {
  chatterSales: CategoryTotals;
  tips: CategoryTotals;
  ppvSales: CategoryTotals;
  bundleSales: CategoryTotals;
  subscriptions: CategoryTotals;
  welcomeMessages: CategoryTotals;
  overall: CategoryTotals;
  hourlyBreakdown: { hour: number; total: number }[];
}

export interface CategoryStats {
  average: number;
  total: number;
  minimum: number;
  maximum: number;
  count: number;
}
