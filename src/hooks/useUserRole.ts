import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "manager" | "chatter" | null;

// Set to false to use real Supabase authentication
const BYPASS_ROLE_CHECK = false;
const TEST_AS_CHATTER = false;

export function useUserRole() {
  const testRole: UserRole = TEST_AS_CHATTER ? "chatter" : "admin";
  const [role, setRole] = useState<UserRole>(BYPASS_ROLE_CHECK ? testRole : null);
  const [loading, setLoading] = useState(!BYPASS_ROLE_CHECK);

  useEffect(() => {
    if (BYPASS_ROLE_CHECK) {
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else {
          const userRole = data?.role;
          if (userRole === "admin" || userRole === "manager" || userRole === "chatter") {
            setRole(userRole);
          } else {
            setRole(null);
          }
        }
      } catch (error) {
        console.error("Error in fetchUserRole:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = BYPASS_ROLE_CHECK ? !TEST_AS_CHATTER : (role === "admin" || role === "manager");
  return { role, loading, isAdmin };
}
