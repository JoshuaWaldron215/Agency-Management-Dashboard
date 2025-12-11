import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Filter, Calendar, User, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  timestamp: string;
  actor_name: string;
  action_type: string;
  resource_type: string;
  resource_name: string | null;
  details: any;
}

export default function AuditLog() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterResource, setFilterResource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/auth");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "UPDATE":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "DELETE":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "LOGIN":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "LOGOUT":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case "USER":
        return <User className="h-4 w-4" />;
      case "ROLE":
        return <User className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Resource Type", "Resource", "Details"];
    const csvData = filteredLogs.map(log => [
      format(new Date(log.timestamp), "PPpp"),
      log.actor_name,
      log.action_type,
      log.resource_type,
      log.resource_name || "-",
      JSON.stringify(log.details),
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Audit log exported");
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === "all" || log.action_type === filterAction;
    const matchesResource = filterResource === "all" || log.resource_type === filterResource;
    const matchesSearch = searchTerm === "" || 
      log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource_name && log.resource_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesAction && matchesResource && matchesSearch;
  });

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Audit Log</h1>
            <p className="text-muted-foreground">Track all system activities and changes</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>Showing {filteredLogs.length} of {logs.length} entries</CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by user or resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterResource} onValueChange={setFilterResource}>
                <SelectTrigger className="w-[180px]">
                  <Activity className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="USER">Users</SelectItem>
                  <SelectItem value="ROLE">Roles</SelectItem>
                  <SelectItem value="MODEL">Models</SelectItem>
                  <SelectItem value="SHEET">Sheets</SelectItem>
                  <SelectItem value="TEAM">Teams</SelectItem>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="HOURS">Hours</SelectItem>
                  <SelectItem value="ACCOUNT">Accounts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource Type</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(log.timestamp), "MMM d, yyyy HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{log.actor_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionColor(log.action_type)}>
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getResourceIcon(log.resource_type)}
                            <span className="text-sm">{log.resource_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.resource_name || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {JSON.stringify(log.details)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
