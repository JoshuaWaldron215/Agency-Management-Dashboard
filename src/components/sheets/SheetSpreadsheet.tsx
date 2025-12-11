import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/UserRoleContext";

interface Account {
  id: string;
  account_name: string;
  sales_amount: number;
}

interface SheetData {
  id: string;
  chatter_name: string;
  period_start: string;
  period_end: string;
  commission_rate: number;
  hourly_rate: number;
  total_hours: number;
  bonus: number;
}

interface SheetSpreadsheetProps {
  sheet: SheetData;
  onUpdate: () => void;
}

export function SheetSpreadsheet({ sheet, onUpdate }: SheetSpreadsheetProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountSales, setNewAccountSales] = useState("");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    fetchAccounts();
  }, [sheet.id]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("chatter_sheet_accounts")
        .select("*")
        .eq("sheet_id", sheet.id)
        .order("account_name");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName) return;

    try {
      const { error } = await supabase.from("chatter_sheet_accounts").insert({
        sheet_id: sheet.id,
        account_name: newAccountName,
        sales_amount: parseFloat(newAccountSales) || 0,
      });

      if (error) throw error;

      toast.success("Account added");
      setNewAccountName("");
      setNewAccountSales("");
      fetchAccounts();
    } catch (error) {
      console.error("Error adding account:", error);
      toast.error("Failed to add account");
    }
  };

  const handleUpdateAccount = async (id: string, field: string, value: string) => {
    try {
      const updateData = field === "account_name" 
        ? { account_name: value }
        : { sales_amount: parseFloat(value) || 0 };

      const { error } = await supabase
        .from("chatter_sheet_accounts")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      fetchAccounts();
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from("chatter_sheet_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Account deleted");
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    }
  };

  const totalSales = accounts.reduce((sum, acc) => sum + Number(acc.sales_amount), 0);
  const commission = (totalSales * sheet.commission_rate) / 100;
  const hourlyPay = sheet.total_hours * sheet.hourly_rate;
  const totalSalary = hourlyPay + commission + sheet.bonus;
  const percentBonus = totalSales > 0 ? ((sheet.bonus / totalSalary) * 100).toFixed(2) : "0.00";

  return (
    <div className="w-full overflow-x-auto border rounded-lg bg-background">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="border border-border p-2 text-left font-semibold min-w-[200px]">Accounts</th>
            <th className="border border-border p-2 text-right font-semibold min-w-[120px]">Sales</th>
            {isAdmin && <th className="border border-border p-2 w-[60px]"></th>}
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-muted/30">
              <td className="border border-border p-0">
                {editingCell?.id === account.id && editingCell?.field === "account_name" ? (
                  <Input
                    autoFocus
                    defaultValue={account.account_name}
                    onBlur={(e) => {
                      handleUpdateAccount(account.id, "account_name", e.target.value);
                      setEditingCell(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateAccount(account.id, "account_name", e.currentTarget.value);
                        setEditingCell(null);
                      }
                    }}
                    className="border-0 rounded-none h-auto"
                  />
                ) : (
                  <div
                    className="p-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => isAdmin && setEditingCell({ id: account.id, field: "account_name" })}
                  >
                    {account.account_name}
                  </div>
                )}
              </td>
              <td className="border border-border p-0">
                {editingCell?.id === account.id && editingCell?.field === "sales_amount" ? (
                  <Input
                    autoFocus
                    type="number"
                    step="0.01"
                    defaultValue={account.sales_amount}
                    onBlur={(e) => {
                      handleUpdateAccount(account.id, "sales_amount", e.target.value);
                      setEditingCell(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateAccount(account.id, "sales_amount", e.currentTarget.value);
                        setEditingCell(null);
                      }
                    }}
                    className="border-0 rounded-none text-right h-auto"
                  />
                ) : (
                  <div
                    className="p-2 text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => isAdmin && setEditingCell({ id: account.id, field: "sales_amount" })}
                  >
                    ${account.sales_amount.toFixed(2)}
                  </div>
                )}
              </td>
              {isAdmin && (
                <td className="border border-border p-1 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
          {isAdmin && (
            <tr className="bg-muted/20">
              <td className="border border-border p-1">
                <Input
                  placeholder="New account..."
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddAccount();
                  }}
                  className="border-0 rounded-none h-auto"
                />
              </td>
              <td className="border border-border p-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAccountSales}
                  onChange={(e) => setNewAccountSales(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddAccount();
                  }}
                  className="border-0 rounded-none text-right h-auto"
                />
              </td>
              {isAdmin && (
                <td className="border border-border p-1 text-center">
                  <Button
                    size="sm"
                    onClick={handleAddAccount}
                    disabled={!newAccountName}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          )}
        </tbody>
        <tfoot className="bg-muted/50 font-semibold">
          <tr>
            <td className="border border-border p-2">Total:</td>
            <td className="border border-border p-2 text-right">${totalSales.toFixed(2)}</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
          <tr>
            <td className="border border-border p-2">Commission:</td>
            <td className="border border-border p-2 text-right">{sheet.commission_rate}% = ${commission.toFixed(2)}</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
          <tr>
            <td className="border border-border p-2">Total Hours:</td>
            <td className="border border-border p-2 text-right">{sheet.total_hours}</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
          <tr>
            <td className="border border-border p-2">Hourly Rate:</td>
            <td className="border border-border p-2 text-right">${sheet.hourly_rate.toFixed(2)} × 32 = ${(sheet.hourly_rate * 32).toFixed(2)}</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
          <tr className="bg-green-50 dark:bg-green-950/20">
            <td className="border border-border p-2 text-lg">Total Salary:</td>
            <td className="border border-border p-2 text-right text-lg text-green-600 dark:text-green-400">${totalSalary.toFixed(2)}</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
          <tr>
            <td className="border border-border p-2 text-sm text-muted-foreground">Chatter:</td>
            <td className="border border-border p-2 text-right">{sheet.chatter_name}</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
          <tr>
            <td className="border border-border p-2">Bonus:</td>
            <td className="border border-border p-2 text-right">${sheet.bonus.toFixed(2)}</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
          <tr className="bg-primary/10">
            <td className="border border-border p-2 text-xl">Bonus %:</td>
            <td className="border border-border p-2 text-right text-xl text-primary">{percentBonus}%</td>
            {isAdmin && <td className="border border-border"></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
