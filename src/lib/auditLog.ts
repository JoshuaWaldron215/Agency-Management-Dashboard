import { supabase } from "@/integrations/supabase/client";

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
export type AuditResourceType = 'USER' | 'MODEL' | 'SHEET' | 'ROLE' | 'TEAM' | 'SCHEDULE' | 'SALES' | 'HOURS' | 'TIME_OFF' | 'ACCOUNT';

export interface LogAuditParams {
  actionType: AuditActionType;
  resourceType: AuditResourceType;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;
}

export const logAudit = async ({
  actionType,
  resourceType,
  resourceId,
  resourceName,
  details = {},
}: LogAuditParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.rpc('log_audit', {
      _action_type: actionType,
      _resource_type: resourceType,
      _resource_id: resourceId || null,
      _resource_name: resourceName || null,
      _details: details,
    });

    if (error) {
      console.error('Error logging audit:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error logging audit:', error);
    return { success: false, error: 'Failed to log audit' };
  }
};
