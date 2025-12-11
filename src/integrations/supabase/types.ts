export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          actor_id: string | null
          actor_name: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: Database["public"]["Enums"]["audit_resource_type"]
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          actor_id?: string | null
          actor_name: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: Database["public"]["Enums"]["audit_resource_type"]
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["audit_action_type"]
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: Database["public"]["Enums"]["audit_resource_type"]
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      chatter_daily_hours: {
        Row: {
          created_at: string
          hours_worked: number
          id: string
          sheet_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          hours_worked?: number
          id?: string
          sheet_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          hours_worked?: number
          id?: string
          sheet_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatter_daily_hours_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "chatter_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      chatter_details: {
        Row: {
          created_at: string
          discord_username: string | null
          fansmetric_email: string | null
          id: string
          pay_class: string
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_username?: string | null
          fansmetric_email?: string | null
          id?: string
          pay_class: string
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_username?: string | null
          fansmetric_email?: string | null
          id?: string
          pay_class?: string
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatter_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatter_sheet_accounts: {
        Row: {
          account_name: string
          created_at: string
          id: string
          sales_amount: number
          sheet_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          id?: string
          sales_amount?: number
          sheet_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          id?: string
          sales_amount?: number
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatter_sheet_accounts_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "chatter_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      chatter_sheet_daily_sales: {
        Row: {
          created_at: string
          id: string
          model_id: string
          sale_date: string
          sales_amount: number
          sheet_id: string
          updated_at: string
          gross_amount: number
          net_amount: number
          transaction_count: number
          ppv_count: number
          ppv_amount: number
          subscription_count: number
          subscription_amount: number
          tips_amount: number
          bundles_amount: number
          other_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          sale_date: string
          sales_amount?: number
          sheet_id: string
          updated_at?: string
          gross_amount?: number
          net_amount?: number
          transaction_count?: number
          ppv_count?: number
          ppv_amount?: number
          subscription_count?: number
          subscription_amount?: number
          tips_amount?: number
          bundles_amount?: number
          other_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          sale_date?: string
          sales_amount?: number
          sheet_id?: string
          updated_at?: string
          gross_amount?: number
          net_amount?: number
          transaction_count?: number
          ppv_count?: number
          ppv_amount?: number
          subscription_count?: number
          subscription_amount?: number
          tips_amount?: number
          bundles_amount?: number
          other_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "chatter_sheet_daily_sales_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatter_sheet_daily_sales_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "chatter_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      chatter_sheets: {
        Row: {
          bonus: number
          chatter_id: string
          chatter_name: string
          chatter_user_id: string | null
          commission_rate: number
          created_at: string
          hourly_rate: number
          id: string
          period_end: string | null
          period_start: string | null
          timezone: string
          total_hours: number
          updated_at: string
          week_start_date: string
        }
        Insert: {
          bonus?: number
          chatter_id: string
          chatter_name: string
          chatter_user_id?: string | null
          commission_rate?: number
          created_at?: string
          hourly_rate?: number
          id?: string
          period_end?: string | null
          period_start?: string | null
          timezone?: string
          total_hours?: number
          updated_at?: string
          week_start_date: string
        }
        Update: {
          bonus?: number
          chatter_id?: string
          chatter_name?: string
          chatter_user_id?: string | null
          commission_rate?: number
          created_at?: string
          hourly_rate?: number
          id?: string
          period_end?: string | null
          period_start?: string | null
          timezone?: string
          total_hours?: number
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatter_sheets_chatter_id_fkey"
            columns: ["chatter_id"]
            isOneToOne: false
            referencedRelation: "chatter_details"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_transactions: {
        Row: {
          id: string
          model_id: string
          chatter_id: string
          transaction_date: string
          gross: number
          net: number
          fee: number
          category: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          model_id: string
          chatter_id: string
          transaction_date: string
          gross: number
          net: number
          fee?: number
          category: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          chatter_id?: string
          transaction_date?: string
          gross?: number
          net?: number
          fee?: number
          category?: string
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_transactions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_records: {
        Row: {
          bonus_percent: number
          chatter_id: string
          created_at: string
          gg_swap_pay: number
          id: string
          misc_pay: number
          month: number
          schedule_pay: number
          shift_pay: number
          total_pay: number
          year: number
        }
        Insert: {
          bonus_percent?: number
          chatter_id: string
          created_at?: string
          gg_swap_pay?: number
          id?: string
          misc_pay?: number
          month: number
          schedule_pay?: number
          shift_pay?: number
          total_pay?: number
          year: number
        }
        Update: {
          bonus_percent?: number
          chatter_id?: string
          created_at?: string
          gg_swap_pay?: number
          id?: string
          misc_pay?: number
          month?: number
          schedule_pay?: number
          shift_pay?: number
          total_pay?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pay_records_chatter_id_fkey"
            columns: ["chatter_id"]
            isOneToOne: false
            referencedRelation: "chatter_details"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dob: string
          email: string
          id: string
          name: string
          team_id: string | null
          status: string | null
          status_updated_at: string | null
          status_updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dob: string
          email: string
          id: string
          name: string
          team_id?: string | null
          status?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dob?: string
          email?: string
          id?: string
          name?: string
          team_id?: string | null
          status?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_weeks: {
        Row: {
          assigned_models: string[] | null
          created_at: string
          id: string
          team_id: string
          timezone: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          assigned_models?: string[] | null
          created_at?: string
          id?: string
          team_id: string
          timezone?: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          assigned_models?: string[] | null
          created_at?: string
          id?: string
          team_id?: string
          timezone?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_weeks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_slots: {
        Row: {
          assigned: string | null
          color: string | null
          created_at: string
          day_index: number
          end_local: string
          id: string
          label: string
          notes: string | null
          start_local: string
          updated_at: string
          week_id: string
        }
        Insert: {
          assigned?: string | null
          color?: string | null
          created_at?: string
          day_index: number
          end_local: string
          id?: string
          label: string
          notes?: string | null
          start_local: string
          updated_at?: string
          week_id: string
        }
        Update: {
          assigned?: string | null
          color?: string | null
          created_at?: string
          day_index?: number
          end_local?: string
          id?: string
          label?: string
          notes?: string | null
          start_local?: string
          updated_at?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_slots_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color_hex: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color_hex: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["time_off_status"]
          type: Database["public"]["Enums"]["time_off_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["time_off_status"]
          type?: Database["public"]["Enums"]["time_off_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["time_off_status"]
          type?: Database["public"]["Enums"]["time_off_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action_type: Database["public"]["Enums"]["audit_action_type"]
          _details?: Json
          _resource_id?: string
          _resource_name?: string
          _resource_type: Database["public"]["Enums"]["audit_resource_type"]
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "chatter"
      audit_action_type: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT"
      audit_resource_type:
        | "USER"
        | "MODEL"
        | "SHEET"
        | "ROLE"
        | "TEAM"
        | "SCHEDULE"
        | "SALES"
        | "HOURS"
        | "TIME_OFF"
        | "ACCOUNT"
      time_off_status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELED"
      time_off_type: "SICK" | "PERSONAL" | "VACATION" | "OTHER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "chatter"],
      audit_action_type: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"],
      audit_resource_type: [
        "USER",
        "MODEL",
        "SHEET",
        "ROLE",
        "TEAM",
        "SCHEDULE",
        "SALES",
        "HOURS",
        "TIME_OFF",
        "ACCOUNT",
      ],
      time_off_status: ["PENDING", "APPROVED", "DECLINED", "CANCELED"],
      time_off_type: ["SICK", "PERSONAL", "VACATION", "OTHER"],
    },
  },
} as const
