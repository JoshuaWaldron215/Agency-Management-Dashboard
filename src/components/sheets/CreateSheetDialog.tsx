import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { startOfWeekStr, endOfWeekStr, todayETStr, formatET } from "@/lib/etDate";

interface CreateSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: string;
}

const getWeekLabel = (saturdayDate: string): string => {
  const endDate = endOfWeekStr(saturdayDate);
  const startLabel = formatET(saturdayDate, { month: "short", day: "numeric" });
  const endLabel = formatET(endDate, { month: "short", day: "numeric" });
  return `${startLabel} - ${endLabel}`;
};

export function CreateSheetDialog({ open, onOpenChange, onSuccess }: CreateSheetDialogProps) {
  const [chatters, setChatters] = useState<UserWithRole[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [chatterDetailsId, setChatterDetailsId] = useState("");
  const [chatterName, setChatterName] = useState("");
  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeekStr(todayETStr()));
  const [commissionRate, setCommissionRate] = useState("8");
  const [hourlyRate, setHourlyRate] = useState("15.00");
  const [loading, setLoading] = useState(false);
  const [loadingChatters, setLoadingChatters] = useState(false);

  const handleDateChange = (dateStr: string) => {
    const snappedToSaturday = startOfWeekStr(dateStr);
    setWeekStartDate(snappedToSaturday);
  };

  useEffect(() => {
    if (open) {
      fetchChatters();
      setWeekStartDate(startOfWeekStr(todayETStr()));
    }
  }, [open]);

  const fetchChatters = async () => {
    setLoadingChatters(true);
    try {
      // First get all user IDs with chatter role
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "chatter");

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setChatters([]);
        setLoadingChatters(false);
        return;
      }

      const chatterUserIds = rolesData.map(r => r.user_id);

      // Then get profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", chatterUserIds)
        .order("name", { ascending: true });

      if (profilesError) throw profilesError;

      // Get existing sheets to filter out chatters who already have sheets
      const { data: existingSheets, error: sheetsError } = await supabase
        .from("chatter_sheets")
        .select("chatter_user_id");

      if (sheetsError) throw sheetsError;

      const existingChatterUserIds = new Set(existingSheets?.map(sheet => sheet.chatter_user_id).filter(Boolean) || []);

      // Filter out chatters who already have sheets
      const formattedChatters = profilesData
        ?.filter(user => !existingChatterUserIds.has(user.id))
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: "chatter"
        })) || [];

      setChatters(formattedChatters);
    } catch (error) {
      console.error("Error fetching chatters:", error);
      toast.error("Failed to load chatters");
    } finally {
      setLoadingChatters(false);
    }
  };

  const handleChatterSelect = async (userId: string) => {
    setSelectedUserId(userId);
    
    const selectedChatter = chatters.find(c => c.id === userId);
    if (selectedChatter) {
      setChatterName(selectedChatter.name || selectedChatter.email);
    }

    // Get or create chatter_details record
    try {
      const { data: existingDetails, error: fetchError } = await supabase
        .from("chatter_details")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingDetails) {
        setChatterDetailsId(existingDetails.id);
      } else {
        // Create chatter_details if it doesn't exist
        const { data: newDetails, error: insertError } = await supabase
          .from("chatter_details")
          .insert({
            user_id: userId,
            pay_class: "standard",
            start_date: new Date().toISOString().split('T')[0]
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        setChatterDetailsId(newDetails.id);
      }
    } catch (error) {
      console.error("Error getting chatter details:", error);
      toast.error("Failed to get chatter details");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submit clicked:", { selectedUserId, chatterDetailsId, chatterName });
    
    if (!selectedUserId || !chatterName) {
      toast.error("Please select a chatter");
      return;
    }

    setLoading(true);

    try {
      // Get or create chatter_details if not already set
      let finalChatterDetailsId = chatterDetailsId;
      
      if (!finalChatterDetailsId) {
        const { data: existingDetails } = await supabase
          .from("chatter_details")
          .select("id")
          .eq("user_id", selectedUserId)
          .maybeSingle();

        if (existingDetails) {
          finalChatterDetailsId = existingDetails.id;
        } else {
          const { data: newDetails, error: insertError } = await supabase
            .from("chatter_details")
            .insert({
              user_id: selectedUserId,
              pay_class: "standard",
              start_date: new Date().toISOString().split('T')[0]
            })
            .select("id")
            .single();

          if (insertError) throw insertError;
          finalChatterDetailsId = newDetails.id;
        }
      }

      const { error } = await supabase.from("chatter_sheets").insert({
        chatter_id: finalChatterDetailsId,
        chatter_user_id: selectedUserId,
        chatter_name: chatterName,
        week_start_date: weekStartDate,
        commission_rate: parseFloat(commissionRate),
        hourly_rate: parseFloat(hourlyRate),
        total_hours: 0,
        bonus: 0,
      });

      if (error) throw error;

      logAudit({
        actionType: 'CREATE',
        resourceType: 'SHEET',
        resourceName: `${chatterName} - ${weekStartDate}`,
        details: { chatterName, weekStartDate, commissionRate, hourlyRate }
      });

      toast.success("Sheet created successfully");
      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error creating sheet:", error);
      toast.error("Failed to create sheet");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId("");
    setChatterDetailsId("");
    setChatterName("");
    setWeekStartDate(startOfWeekStr(todayETStr()));
    setCommissionRate("8");
    setHourlyRate("15.00");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Sheet</DialogTitle>
          <DialogDescription>
            Create a performance sheet for a chatter. Select the week and set commission rates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatter">Chatter</Label>
            <Select value={selectedUserId} onValueChange={handleChatterSelect} disabled={loadingChatters || chatters.length === 0}>
              <SelectTrigger className="bg-background" data-testid="select-chatter">
                <SelectValue placeholder={loadingChatters ? "Loading chatters..." : chatters.length === 0 ? "No chatters available" : "Select a chatter"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {chatters.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No chatters available. Go to Team Members to assign the "chatter" role to users.
                  </div>
                ) : (
                  chatters.map((chatter) => (
                    <SelectItem key={chatter.id} value={chatter.id}>
                      {chatter.name || chatter.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!loadingChatters && chatters.length === 0 && (
              <p className="text-xs text-amber-600">
                No chatters found. Please go to Team Members and assign the "chatter" role to users first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatterName">Chatter Name</Label>
            <Input
              id="chatterName"
              value={chatterName}
              onChange={(e) => setChatterName(e.target.value)}
              placeholder="Enter chatter name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekStartDate">Week</Label>
            <Input
              id="weekStartDate"
              type="date"
              value={weekStartDate}
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
            <p className="text-sm font-medium text-foreground">
              {getWeekLabel(weekStartDate)} (Sat-Fri)
            </p>
            <p className="text-xs text-muted-foreground">
              Pick any day - it will automatically snap to the Saturday that starts that week
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission %</Label>
              <Input
                id="commissionRate"
                type="number"
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
          </div>


          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Sheet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
