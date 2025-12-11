import { ParsedTransaction, TransactionCategory } from "./types";
import { parse } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "America/New_York";

// Primary regex pattern for flexible parsing
const PRIMARY_REGEX = /^(?<date>[A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*(?<time>\d{1,2}:\d{2}\s*[ap]m)\s+(?<gross>[$£€]?\s*\d[\d,]*\.?\d{0,2})\s+(?<fee>[$£€]?\s*\d[\d,]*\.?\d{0,2})?\s*(?<net>[$£€]?\s*\d[\d,]*\.?\d{0,2})\s+(?<desc>.+)$/i;

// Fallback regex without Fee column
const FALLBACK_REGEX = /^(?<date>[A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*(?<time>\d{1,2}:\d{2}\s*[ap]m)\s+(?<gross>[$£€]?\s*\d[\d,]*\.?\d{0,2})\s+(?<net>[$£€]?\s*\d[\d,]*\.?\d{0,2})\s+(?<desc>.+)$/i;

export function categorizeTransaction(description: string, gross: number): TransactionCategory {
  const desc = description.toLowerCase();
  const isWholeNumber = Math.round(gross * 100) % 100 === 0;
  const hasCents = !isWholeNumber;

  // Priority 1: "Tip from ..." pattern
  if (/^\s*tip\s+from\b/i.test(desc)) return "Tip";
  
  // Priority 2: "Subscription from ..." or "Recurring subscription from ..." pattern
  if (/^\s*(recurring\s+subscription|subscription)\s+from\b/i.test(desc)) return "Subscription";
  
  // Priority 3: "Welcome" pattern OR $15/$12/$11.99 amounts (unless explicitly a tip)
  if (/\bwelcome\b/i.test(desc)) return "Welcome";
  
  // Treat $15, $12, and $11.99 as Welcome Messages (tips are already caught above)
  if (gross === 15 || gross === 12 || gross === 11.99) return "Welcome";
  
  // Priority 4: "Payment for message" - decimals go to PPV, whole numbers to Bundle
  if (/\bpayment\s*for\s*message\b/i.test(desc)) {
    return hasCents ? "PPV Message" : "Bundle";
  }
  
  // Priority 5: Bundle patterns (whole-number only)
  if (isWholeNumber && /\b(bundle|mass\s*dm|locked\s*post|post\s*purchase)\b/i.test(desc)) return "Bundle";
  
  // Priority 6: PPV patterns (if has cents)
  if (hasCents && /\bppv\b/i.test(desc)) return "PPV Message";

  return "Other";
}

export function parseCurrency(value: string): number {
  // Strip currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$£€,\s]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function detectCurrency(text: string): string {
  const match = text.match(/[$£€]/);
  return match ? match[0] : "$";
}

function parseHour(date: string, time: string): number {
  try {
    const dateTimeStr = `${date} ${time}`;
    const parsedDate = parse(dateTimeStr, "MMM d, yyyy h:mm a", new Date());
    const zonedDate = toZonedTime(parsedDate, TIMEZONE);
    return zonedDate.getHours();
  } catch {
    // Fallback: extract hour from time string
    const hourMatch = time.match(/(\d+):/);
    if (hourMatch) {
      let hour = parseInt(hourMatch[1]);
      if (time.toLowerCase().includes("pm") && hour !== 12) {
        hour += 12;
      } else if (time.toLowerCase().includes("am") && hour === 12) {
        hour = 0;
      }
      return hour;
    }
    return 0;
  }
}

export function parseTransactionLine(
  line: string,
  currency: string
): ParsedTransaction | null {
  // Trim and skip empty or continuation lines
  const trimmed = line.trim();
  if (!trimmed || !trimmed.match(/[$£€]?\d/)) {
    return null; // Skip lines with no currency/numbers
  }

  // Try primary regex first (with optional Fee)
  let match = trimmed.match(PRIMARY_REGEX);
  let hasFee = true;

  // If no match, try fallback regex (no Fee column)
  if (!match) {
    match = trimmed.match(FALLBACK_REGEX);
    hasFee = false;
  }

  if (!match || !match.groups) {
    return null;
  }

  const { date, time, gross: grossStr, fee: feeStr, net: netStr, desc } = match.groups;

  const gross = parseCurrency(grossStr);
  const net = parseCurrency(netStr);
  let fee = 0;

  if (hasFee && feeStr) {
    fee = parseCurrency(feeStr);
  } else {
    // Infer fee from gross - net
    if (gross > 0 && net > 0) {
      fee = Math.max(0, gross - net);
    }
  }

  // Validate we have meaningful numeric values
  if (gross === 0 && net === 0) {
    return null;
  }

  const category = categorizeTransaction(desc, gross);
  const hour = parseHour(date, time);

  return {
    date,
    time,
    gross,
    fee,
    net,
    description: desc,
    category,
    hour,
  };
}

export function parseTransactions(text: string): {
  transactions: ParsedTransaction[];
  skippedLines: string[];
  currency: string;
} {
  const lines = text.split("\n").filter((line) => line.trim());
  const currency = detectCurrency(text);
  const transactions: ParsedTransaction[] = [];
  const skippedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseTransactionLine(line, currency);
    
    if (parsed) {
      // Check if next line is a wrapped description (no currency/amounts)
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.match(/[$£€]?\d/)) {
          // Append to current description
          parsed.description += " " + nextLine;
          i++; // Skip this line in next iteration
        } else {
          break;
        }
      }
      transactions.push(parsed);
    } else if (line.trim() && line.match(/[$£€]?\d/)) {
      // Only add to skipped if it looks like it should have been parseable
      skippedLines.push(line);
    }
  }

  return { transactions, skippedLines, currency };
}
