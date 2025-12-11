import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, User, Trash2, Check, X, Clock, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

const USERS_PER_PAGE = 10;
import { useToast } from "@/hooks/use-toast";
import { useUserRole, UserRole } from "@/contexts/UserRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  team_id: string | null;
  status: string | null;
}

interface Team {
  id: string;
  name: string;
  color_hex: string;
}


const TeamMembers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [page, setPage] = useState(1);
  
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * USERS_PER_PAGE;
    return users.slice(start, start + USERS_PER_PAGE);
  }, [users, page]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadTeams();
    }
  }, [isAdmin]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, color_hex")
        .order("name");

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error loading teams:", error);
      setTeams([]);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, created_at, team_id, status")
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserProfile[] = (profiles || []).map(profile => {
        const userRole = userRoles?.find(ur => ur.user_id === profile.id);
        return {
          ...profile,
          status: profile.status ?? "approved",
          role: (userRole?.role as UserRole) || null,
        };
      });
      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!newRole) return;

    try {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      const targetUser = users.find(u => u.id === userId);
      logAudit({
        actionType: 'UPDATE',
        resourceType: 'ROLE',
        resourceId: userId,
        resourceName: targetUser?.name || 'Unknown',
        details: { newRole }
      });

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      loadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleTeamChange = async (userId: string, teamId: string | null) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ team_id: teamId === "none" ? null : teamId })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team assignment updated successfully",
      });

      loadUsers();
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: "Failed to update team assignment",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (userId: string, newStatus: "approved" | "denied") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ 
          status: newStatus,
          status_updated_at: new Date().toISOString(),
          status_updated_by: user.id
        })
        .eq("id", userId);

      if (error) throw error;

      if (newStatus === "approved") {
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existingRole) {
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "chatter" });
        }
      }

      const targetUser = users.find(u => u.id === userId);
      logAudit({
        actionType: 'UPDATE',
        resourceType: 'USER',
        resourceId: userId,
        resourceName: targetUser?.name || 'Unknown',
        details: { action: newStatus === "approved" ? 'approved' : 'denied', newStatus }
      });

      toast({
        title: "Success",
        description: `User ${newStatus === "approved" ? "approved" : "denied"} successfully`,
      });

      loadUsers();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName}? Their historical data will be preserved for analytics, but they will no longer appear in the system or be able to log in.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove user");
      }

      toast({
        title: "Success",
        description: `${userName} has been removed. Historical data preserved for analytics.`,
      });

      loadUsers();
    } catch (error: any) {
      console.error("Error removing user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Team Members</h1>
        </div>
        <p className="text-muted-foreground">Manage your team members and their access</p>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.status === "pending" && (
                        <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/50">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                      {user.status === "approved" && (
                        <Badge variant="outline" className="gap-1 text-green-500 border-green-500/50">
                          <Check className="h-3 w-3" />
                          Approved
                        </Badge>
                      )}
                      {user.status === "denied" && (
                        <Badge variant="outline" className="gap-1 text-red-500 border-red-500/50">
                          <X className="h-3 w-3" />
                          Denied
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role || ""}
                        onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-role-${user.id}`}>
                          <SelectValue placeholder="No role">
                            {user.role ? (
                              <span className="flex items-center gap-2">
                                {user.role === "admin" ? (
                                  <Shield className="h-4 w-4 text-purple-400" />
                                ) : (
                                  <User className="h-4 w-4 text-teal-400" />
                                )}
                                {user.role}
                              </span>
                            ) : (
                              "No role"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </span>
                          </SelectItem>
                          <SelectItem value="chatter">
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Chatter
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.team_id || "none"}
                        onValueChange={(value) => handleTeamChange(user.id, value)}
                      >
                        <SelectTrigger className="w-[160px]" data-testid={`select-team-${user.id}`}>
                          <SelectValue placeholder="No team">
                            {user.team_id ? (
                              <span className="flex items-center gap-2">
                                <div 
                                  className="h-3 w-3 rounded-full" 
                                  style={{ backgroundColor: teams.find(t => t.id === user.team_id)?.color_hex }}
                                />
                                {teams.find(t => t.id === user.team_id)?.name || "Unknown"}
                              </span>
                            ) : (
                              "No team"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            No team
                          </SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <span className="flex items-center gap-2">
                                <div 
                                  className="h-3 w-3 rounded-full" 
                                  style={{ backgroundColor: team.color_hex }}
                                />
                                {team.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleStatusChange(user.id, "approved")}
                              className="h-8 w-8 text-green-500 hover:text-green-600 hover:border-green-500"
                              title="Approve User"
                              data-testid={`button-approve-${user.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleStatusChange(user.id, "denied")}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:border-red-500"
                              title="Deny User"
                              data-testid={`button-deny-${user.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {user.status === "denied" && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleStatusChange(user.id, "approved")}
                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:border-green-500"
                            title="Approve User"
                            data-testid={`button-approve-${user.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/chatter/${user.id}?name=${encodeURIComponent(user.name)}`)}
                          title="View Dashboard"
                          data-testid={`button-dashboard-${user.id}`}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          title="Delete User"
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * USERS_PER_PAGE + 1}-{Math.min(page * USERS_PER_PAGE, users.length)} of {users.length} members
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-members-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="button-members-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamMembers;
