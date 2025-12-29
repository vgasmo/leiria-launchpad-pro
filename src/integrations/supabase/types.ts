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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          session_id: string | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          document_type: string
          external_url: string | null
          file_path: string | null
          id: string
          name: string
          updated_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          document_type: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          name: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          document_type?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_global: boolean
          name: string
          program_id: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          program_id?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          program_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_entries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kpi_definition_id: string
          month: string
          notes: string | null
          target_value: number | null
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_definition_id: string
          month: string
          notes?: string | null
          target_value?: number | null
          updated_at?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_definition_id?: string
          month?: string
          notes?: string | null
          target_value?: number | null
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_entries_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          session_date: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          session_date: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          session_date?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          created_at: string
          description: string | null
          founded_date: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          founded_date?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          founded_date?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string | null
          content: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_global: boolean
          name: string
          program_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          program_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          program_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          health_notes: string | null
          health_score: Database["public"]["Enums"]["health_score"] | null
          health_score_override:
            | Database["public"]["Enums"]["health_score"]
            | null
          id: string
          program_id: string
          stage: Database["public"]["Enums"]["startup_stage"]
          startup_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          health_notes?: string | null
          health_score?: Database["public"]["Enums"]["health_score"] | null
          health_score_override?:
            | Database["public"]["Enums"]["health_score"]
            | null
          id?: string
          program_id: string
          stage?: Database["public"]["Enums"]["startup_stage"]
          startup_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          health_notes?: string | null
          health_score?: Database["public"]["Enums"]["health_score"] | null
          health_score_override?:
            | Database["public"]["Enums"]["health_score"]
            | null
          id?: string
          program_id?: string
          stage?: Database["public"]["Enums"]["startup_stage"]
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_workspace: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_access: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      action_status: "pending" | "in_progress" | "completed" | "cancelled"
      app_role:
        | "admin"
        | "consultor"
        | "mentor_externo"
        | "founder"
        | "team_member"
      health_score: "critical" | "at_risk" | "stable" | "healthy" | "thriving"
      milestone_status: "not_started" | "in_progress" | "completed" | "delayed"
      startup_stage: "ideation" | "validation" | "mvp" | "growth" | "scale"
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
      action_status: ["pending", "in_progress", "completed", "cancelled"],
      app_role: [
        "admin",
        "consultor",
        "mentor_externo",
        "founder",
        "team_member",
      ],
      health_score: ["critical", "at_risk", "stable", "healthy", "thriving"],
      milestone_status: ["not_started", "in_progress", "completed", "delayed"],
      startup_stage: ["ideation", "validation", "mvp", "growth", "scale"],
    },
  },
} as const
