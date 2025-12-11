import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "manager" | "chatter" | null;
export type ProfileStatus = "pending" | "approved" | "denied" | null;

interface UserRoleContextType {
  role: UserRole;
  status: ProfileStatus;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  refreshRole: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType>({
  role: null,
  status: null,
  loading: true,
  isAdmin: false,
  isApproved: false,
  refreshRole: async () => {},
});

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [status, setStatus] = useState<ProfileStatus>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setStatus(null);
        setLoading(false);
        return;
      }

      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("profiles")
          .select("status")
          .eq("id", user.id)
          .single()
      ]);

      if (roleResult.error) {
        console.error("Error fetching user role:", roleResult.error);
        setRole(null);
      } else {
        const userRole = roleResult.data?.role;
        if (userRole === "admin" || userRole === "manager" || userRole === "chatter") {
          setRole(userRole);
        } else {
          setRole(null);
        }
      }

      if (profileResult.error) {
        console.error("Error fetching profile status:", profileResult.error);
        setStatus("approved");
      } else {
        const profileStatus = profileResult.data?.status as ProfileStatus;
        setStatus(profileStatus ?? "approved");
      }
    } catch (error) {
      console.error("Error in fetchUserRole:", error);
      setRole(null);
      setStatus("approved");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        fetchUserRole();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === "admin" || role === "manager";
  const isApproved = status === "approved" || status === null;

  return (
    <UserRoleContext.Provider value={{ role, status, loading, isAdmin, isApproved, refreshRole: fetchUserRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(UserRoleContext);
}
