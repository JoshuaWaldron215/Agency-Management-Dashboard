import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: Missing Supabase environment variables");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Rate limiting: Track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Security logging helper
async function logSecurityEvent(
  eventType: string,
  userId: string | null,
  details: Record<string, any>,
  ip: string
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event_type: eventType,
    user_id: userId,
    ip_address: ip,
    details,
  };
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
  
  // Also log to audit_log table for persistent record
  if (userId) {
    try {
      await supabaseAdmin.from("audit_log").insert({
        user_id: userId,
        action: eventType,
        entity_type: "security",
        entity_id: null,
        details: { ...details, ip_address: ip }
      });
    } catch (e) {
      console.error("Failed to log security event to database:", e);
    }
  }
}

// Middleware: Validate authorization and extract user
async function validateAuth(req: express.Request, res: express.Response): Promise<{ user: any; token: string } | null> {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  // Rate limit check
  if (!checkRateLimit(ip)) {
    await logSecurityEvent("RATE_LIMIT_EXCEEDED", null, { endpoint: req.path }, ip);
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return null;
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await logSecurityEvent("MISSING_AUTH", null, { endpoint: req.path }, ip);
    res.status(401).json({ error: "No authorization header" });
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  
  // Validate token format (basic check)
  if (token.length < 100) {
    await logSecurityEvent("INVALID_TOKEN_FORMAT", null, { endpoint: req.path }, ip);
    res.status(401).json({ error: "Invalid token format" });
    return null;
  }
  
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    await logSecurityEvent("INVALID_TOKEN", null, { endpoint: req.path, error: userError?.message }, ip);
    res.status(401).json({ error: "Unauthorized - invalid or expired token" });
    return null;
  }
  
  return { user, token };
}

// Middleware: Check if user is admin
async function requireAdmin(req: express.Request, res: express.Response, userId: string): Promise<boolean> {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (roleError || !roleData || roleData.role !== "admin") {
    await logSecurityEvent("UNAUTHORIZED_ADMIN_ACCESS", userId, { 
      endpoint: req.path, 
      actual_role: roleData?.role || "none" 
    }, ip);
    res.status(403).json({ error: "Only admins can perform this action" });
    return false;
  }
  
  return true;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// DELETE USER ENDPOINT (Admin only)
app.post("/api/delete-user", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  try {
    // Validate authentication
    const authResult = await validateAuth(req, res);
    if (!authResult) return;
    
    const { user } = authResult;
    
    // Require admin role
    const isAdmin = await requireAdmin(req, res, user.id);
    if (!isAdmin) return;

    const { userId } = req.body;

    // Input validation
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "Valid user ID is required" });
      return;
    }
    
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      res.status(400).json({ error: "Invalid user ID format" });
      return;
    }

    if (userId === user.id) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }

    // Check if target user exists and isn't already deleted
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, status")
      .eq("id", userId)
      .single();
    
    if (targetError || !targetProfile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    if (targetProfile.status === "deleted") {
      res.status(400).json({ error: "User is already deleted" });
      return;
    }

    // SOFT DELETE: Preserve business data, anonymize PII, disable access
    const deletedAt = new Date().toISOString();
    const anonymizedEmail = `deleted_${userId.substring(0, 8)}@removed.local`;
    
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        status: "deleted",
        name: "Deleted User",
        email: anonymizedEmail,
        team_id: null,
        status_updated_by: user.id,
        status_updated_at: deletedAt
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      res.status(500).json({ error: "Failed to update profile" });
      return;
    }
    
    // Delete user_roles to prevent login access
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    
    // Log the deletion
    await logSecurityEvent("USER_DELETED", user.id, {
      deleted_user_id: userId,
      deleted_user_name: targetProfile.name,
      deleted_at: deletedAt
    }, ip);

    res.json({ 
      success: true, 
      message: "User deleted successfully (data preserved for analytics)" 
    });
    
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

// LEADERBOARD ENDPOINT (Authenticated users)
app.get("/api/leaderboard", async (req, res) => {
  try {
    // Validate authentication
    const authResult = await validateAuth(req, res);
    if (!authResult) return;

    const { timeframe = "month", teamId, specificMonth, specificYear } = req.query;

    const now = new Date();
    let startDate: Date;
    let endDate: Date | null = null;
    
    // If specific month is provided, use that instead of timeframe
    if (specificMonth && specificYear) {
      const month = parseInt(specificMonth as string);
      const year = parseInt(specificYear as string);
      
      // Validate month/year
      if (isNaN(month) || isNaN(year) || month < 0 || month > 11 || year < 2020 || year > 2100) {
        res.status(400).json({ error: "Invalid month or year" });
        return;
      }
      
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
    } else if (timeframe === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate ? endDate.toISOString().split('T')[0] : null;

    let sheetsQuery = supabaseAdmin
      .from("chatter_sheets")
      .select(`
        id,
        chatter_name,
        chatter_user_id,
        commission_rate,
        hourly_rate,
        total_hours,
        bonus,
        period_start,
        period_end,
        week_start_date,
        chatter_sheet_accounts (
          sales_amount
        ),
        chatter_sheet_daily_sales (
          sales_amount
        )
      `)
      .gte("week_start_date", startDateStr);
    
    if (endDateStr) {
      sheetsQuery = sheetsQuery.lte("week_start_date", endDateStr);
    }

    const { data: sheets, error: sheetsError } = await sheetsQuery;

    if (sheetsError) {
      console.error("Sheets query error:", sheetsError);
      res.status(500).json({ error: "Failed to fetch data" });
      return;
    }

    if (!sheets || sheets.length === 0) {
      res.json({
        topChatters: [],
        totalSales: 0,
        activeChatters: 0,
        avgPerChatter: 0,
        chartData: [],
      });
      return;
    }

    let teamUserIds: string[] | null = null;
    if (teamId && teamId !== "all") {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("team_id", teamId);
      
      teamUserIds = profiles?.map(p => p.id) || [];
    }

    // Get deleted users to exclude
    const { data: deletedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("status", "deleted");
    
    const deletedUserIds = new Set(deletedProfiles?.map(p => p.id) || []);

    const chatterMap = new Map<string, number>();

    sheets.forEach((sheet: any) => {
      if (sheet.chatter_user_id && deletedUserIds.has(sheet.chatter_user_id)) {
        return;
      }
      
      if (teamUserIds !== null && sheet.chatter_user_id) {
        if (!teamUserIds.includes(sheet.chatter_user_id)) {
          return;
        }
      }
      
      const chatterName = sheet.chatter_name;
      
      const accountSales = sheet.chatter_sheet_accounts?.reduce(
        (sum: number, acc: any) => sum + Number(acc.sales_amount || 0),
        0
      ) || 0;

      const dailySales = sheet.chatter_sheet_daily_sales?.reduce(
        (sum: number, sale: any) => sum + Number(sale.sales_amount || 0),
        0
      ) || 0;

      const totalSales = accountSales + dailySales;

      const existing = chatterMap.get(chatterName) || 0;
      chatterMap.set(chatterName, existing + totalSales);
    });

    const chattersArray = Array.from(chatterMap.entries())
      .map(([name, sales]) => ({
        name,
        sales,
        rank: 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    chattersArray.forEach((chatter, index) => {
      chatter.rank = index + 1;
    });

    const totalSales = chattersArray.reduce((sum, c) => sum + c.sales, 0);
    const activeChatters = chattersArray.length;
    const avgPerChatter = activeChatters > 0 ? totalSales / activeChatters : 0;

    const chartData = chattersArray.slice(0, 8).map(c => ({
      name: c.name,
      value: c.sales,
    }));

    res.json({
      topChatters: chattersArray,
      totalSales,
      activeChatters,
      avgPerChatter,
      chartData,
    });
    
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Security features: Rate limiting (${RATE_LIMIT_MAX}/min), JWT validation, Admin verification, Audit logging`);
});
