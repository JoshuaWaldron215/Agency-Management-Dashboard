import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatET, endOfWeekStr } from "@/lib/etDate";
import { RotateCcw, Trash2 } from "lucide-react";
import { DailySheetSpreadsheet } from "./DailySheetSpreadsheet";
import { WeeklySheetSpreadsheet } from "./WeeklySheetSpreadsheet";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/contexts/UserRoleContext";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";

interface ChatterSheet {
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

interface SheetDetailsDialogProps {
  sheet: ChatterSheet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function SheetDetailsDialog({ sheet, open, onOpenChange, onUpdate }: SheetDetailsDialogProps) {
  const { isAdmin } = useUserRole();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleResetSheet = async () => {
    setIsResetting(true);
    
    try {
      // Delete all daily sales for this sheet
      const { error: salesError } = await supabase
        .from("chatter_sheet_daily_sales")
        .delete()
        .eq("sheet_id", sheet.id);

      if (salesError) throw salesError;

      // Delete all daily hours for this sheet
      const { error: hoursError } = await supabase
        .from("chatter_daily_hours")
        .delete()
        .eq("sheet_id", sheet.id);

      if (hoursError) throw hoursError;

      // Reset sheet totals
      const { error: sheetError } = await supabase
        .from("chatter_sheets")
        .update({ 
          total_hours: 0,
          bonus: 0
        })
        .eq("id", sheet.id);

      if (sheetError) throw sheetError;

      toast.success("Sheet reset successfully");
      setShowResetDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error resetting sheet:", error);
      toast.error("Failed to reset sheet");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteSheet = async () => {
    setIsDeleting(true);
    
    try {
      // Delete all related data first
      await supabase
        .from("chatter_sheet_daily_sales")
        .delete()
        .eq("sheet_id", sheet.id);

      await supabase
        .from("chatter_daily_hours")
        .delete()
        .eq("sheet_id", sheet.id);

      await supabase
        .from("chatter_sheet_accounts")
        .delete()
        .eq("sheet_id", sheet.id);

      // Delete the sheet itself
      const { error } = await supabase
        .from("chatter_sheets")
        .delete()
        .eq("id", sheet.id);

      if (error) throw error;

      logAudit({
        actionType: 'DELETE',
        resourceType: 'SHEET',
        resourceId: sheet.id,
        resourceName: `${sheet.chatter_name} - ${sheet.week_start_date}`,
        details: { chatterName: sheet.chatter_name, weekStartDate: sheet.week_start_date }
      });

      toast.success("Sheet deleted successfully");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting sheet:", error);
      toast.error("Failed to delete sheet");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">
                  Chatter: {sheet.chatter_name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Week Starting: {formatET(sheet.week_start_date, { month: "short", day: "numeric", year: "numeric" })}
                  <span className="ml-4">Timezone: {sheet.timezone}</span>
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowResetDialog(true)}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly">Weekly by Model</TabsTrigger>
              <TabsTrigger value="daily">Daily by Model</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly" className="mt-4">
              <WeeklySheetSpreadsheet sheet={sheet} onUpdate={onUpdate} />
            </TabsContent>
            <TabsContent value="daily" className="mt-4">
              <DailySheetSpreadsheet sheet={sheet} onUpdate={onUpdate} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Sheet Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all sales and hours data for <strong>{sheet.chatter_name}</strong>'s sheet 
              for the week starting {formatET(sheet.week_start_date, { month: "short", day: "numeric", year: "numeric" })}.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetSheet}
              disabled={isResetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Reset Sheet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{sheet.chatter_name}</strong>'s entire sheet 
              for the week starting {formatET(sheet.week_start_date, { month: "short", day: "numeric", year: "numeric" })}, 
              including all sales, hours, and account data.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSheet}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Sheet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
