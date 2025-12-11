import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";
import { ListSkeleton } from "@/components/ui/page-skeleton";
import { Plus, FileText, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/UserRoleContext";
import { CreateSheetDialog } from "@/components/sheets/CreateSheetDialog";
import { SheetCard } from "@/components/sheets/SheetCard";
import { downloadCSV, formatCurrency } from "@/lib/csvExport";

const SHEETS_PER_PAGE = 18;

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
  isDeleted?: boolean;
}


const ChatterSheets = () => {
  const [sheets, setSheets] = useState<ChatterSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { loading: roleLoading, isAdmin } = useUserRole();

  const totalPages = Math.ceil(totalCount / SHEETS_PER_PAGE);

  useEffect(() => {
    if (!roleLoading) {
      fetchSheets();
    }
  }, [roleLoading, isAdmin, currentPage]);

  const fetchSheets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // First get total count
      let countQuery = supabase
        .from("chatter_sheets")
        .select("*", { count: "exact", head: true });
      
      if (!isAdmin && user) {
        countQuery = countQuery.eq("chatter_user_id", user.id);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);
      
      // Then get paginated data
      const from = (currentPage - 1) * SHEETS_PER_PAGE;
      const to = from + SHEETS_PER_PAGE - 1;
      
      let query = supabase
        .from("chatter_sheets")
        .select("*")
        .order("week_start_date", { ascending: false })
        .order("chatter_name", { ascending: true })
        .range(from, to);

      if (!isAdmin && user) {
        query = query.eq("chatter_user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Get deleted user IDs to mark sheets
      const userIds = [...new Set((data || []).map(s => s.chatter_user_id).filter(Boolean))];
      let deletedUserIds: Set<string> = new Set();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, status")
          .in("id", userIds)
          .eq("status", "deleted");
        
        deletedUserIds = new Set((profiles || []).map(p => p.id));
      }
      
      // Mark sheets with deleted flag
      const sheetsWithStatus = (data || []).map(sheet => ({
        ...sheet,
        isDeleted: sheet.chatter_user_id ? deletedUserIds.has(sheet.chatter_user_id) : false
      }));
      
      setSheets(sheetsWithStatus);
    } catch (error) {
      console.error("Error fetching sheets:", error);
      toast.error("Failed to load sheets");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.info("Preparing export...");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from("chatter_sheets")
        .select("*")
        .order("week_start_date", { ascending: false })
        .order("chatter_name", { ascending: true });

      if (!isAdmin && user) {
        query = query.eq("chatter_user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const headers = [
        "Chatter Name",
        "Week Start",
        "Commission Rate",
        "Hourly Rate",
        "Total Hours",
        "Bonus",
        "Timezone"
      ];

      const rows = data.map(sheet => [
        sheet.chatter_name,
        sheet.week_start_date,
        `${(sheet.commission_rate * 100).toFixed(0)}%`,
        formatCurrency(sheet.hourly_rate),
        sheet.total_hours,
        formatCurrency(sheet.bonus),
        sheet.timezone
      ]);

      downloadCSV({
        filename: `chatter-sheets-${new Date().toISOString().split('T')[0]}`,
        headers,
        rows
      });

      toast.success(`Exported ${data.length} sheets`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <PageTransition className="flex-1 max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6 w-full">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Chatter Sheets</h1>
            {totalCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount} total sheets
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <Button variant="outline" onClick={handleExportCSV} className="gap-2" data-testid="button-export-sheets">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2" data-testid="button-new-sheet">
                <Plus className="h-4 w-4" />
                New Sheet
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          {isAdmin ? "View and manage chatter performance sheets" : "View your performance sheets"}
        </p>

        {loading ? (
          <ListSkeleton count={6} />
        ) : sheets.length === 0 && currentPage === 1 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sheets Yet</h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin 
                  ? "Create a new sheet to start tracking chatter performance."
                  : "No sheets have been assigned to you yet."}
              </p>
              {isAdmin && (
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Sheet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sheets.map((sheet) => (
                <SheetCard key={sheet.id} sheet={sheet} onUpdate={fetchSheets} />
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="w-9"
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        <CreateSheetDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen}
          onSuccess={fetchSheets}
        />
      </PageTransition>
      <Footer />
    </div>
  );
};

export default ChatterSheets;
