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
      action_comments: {
        Row: {
          action_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_comments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      action_items: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          owner_user_id: string | null
          planner_sync_status: string | null
          planner_task_id: string | null
          priority: string | null
          search_vector: unknown
          session_id: string | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_user_id?: string | null
          planner_sync_status?: string | null
          planner_task_id?: string | null
          priority?: string | null
          search_vector?: unknown
          session_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_user_id?: string | null
          planner_sync_status?: string | null
          planner_task_id?: string | null
          priority?: string | null
          search_vector?: unknown
          session_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
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
      action_tags: {
        Row: {
          action_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          action_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          action_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_tags_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_announcements: {
        Row: {
          category: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_announcements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rate_limits: {
        Row: {
          created_at: string
          function_name: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rate_limits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cap_table_entries: {
        Row: {
          cliff_months: number | null
          created_at: string
          funding_round_id: string | null
          holder_name: string
          holder_type: string
          id: string
          investment_amount: number | null
          notes: string | null
          share_type: string
          shares: number
          startup_id: string
          updated_at: string
          vesting_months: number | null
          vesting_start: string | null
        }
        Insert: {
          cliff_months?: number | null
          created_at?: string
          funding_round_id?: string | null
          holder_name: string
          holder_type?: string
          id?: string
          investment_amount?: number | null
          notes?: string | null
          share_type?: string
          shares?: number
          startup_id: string
          updated_at?: string
          vesting_months?: number | null
          vesting_start?: string | null
        }
        Update: {
          cliff_months?: number | null
          created_at?: string
          funding_round_id?: string | null
          holder_name?: string
          holder_type?: string
          id?: string
          investment_amount?: number | null
          notes?: string | null
          share_type?: string
          shares?: number
          startup_id?: string
          updated_at?: string
          vesting_months?: number | null
          vesting_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cap_table_entries_funding_round_id_fkey"
            columns: ["funding_round_id"]
            isOneToOne: false
            referencedRelation: "funding_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cap_table_entries_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cap_table_entries_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_definitions: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          kpi_definition_ids: string[] | null
          name: string
          questions: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          kpi_definition_ids?: string[] | null
          name?: string
          questions?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          kpi_definition_ids?: string[] | null
          name?: string
          questions?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_definitions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_instances: {
        Row: {
          compliance_status: Database["public"]["Enums"]["compliance_status"]
          created_at: string
          definition_id: string
          due_date: string
          id: string
          reminder_sent_at: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          week_start: string
          workspace_id: string
        }
        Insert: {
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          definition_id: string
          due_date: string
          id?: string
          reminder_sent_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          week_start: string
          workspace_id: string
        }
        Update: {
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          definition_id?: string
          due_date?: string
          id?: string
          reminder_sent_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          week_start?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_instances_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "checkin_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_responses: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          kpi_definition_id: string | null
          question_id: string
          response_number: number | null
          response_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          kpi_definition_id?: string | null
          question_id: string
          response_number?: number | null
          response_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          kpi_definition_id?: string | null
          question_id?: string
          response_number?: number | null
          response_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_responses_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "checkin_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_responses_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_log: {
        Row: {
          body: string | null
          channel: string | null
          created_at: string | null
          from_address: string | null
          id: string
          metadata_json: Json | null
          subject: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          channel?: string | null
          created_at?: string | null
          from_address?: string | null
          id?: string
          metadata_json?: Json | null
          subject?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          channel?: string | null
          created_at?: string | null
          from_address?: string | null
          id?: string
          metadata_json?: Json | null
          subject?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_private: boolean
          search_vector: unknown
          updated_at: string
          visibility: string | null
          workspace_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          search_vector?: unknown
          updated_at?: string
          visibility?: string | null
          workspace_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          search_vector?: unknown
          updated_at?: string
          visibility?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_group: boolean
          title: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dataroom_items: {
        Row: {
          created_at: string
          created_by: string | null
          dataroom_id: string
          description: string | null
          document_id: string | null
          id: string
          investor_update_id: string | null
          sort_order: number
          title: string
          type: string
          url: string | null
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dataroom_id: string
          description?: string | null
          document_id?: string | null
          id?: string
          investor_update_id?: string | null
          sort_order?: number
          title: string
          type: string
          url?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dataroom_id?: string
          description?: string | null
          document_id?: string | null
          id?: string
          investor_update_id?: string | null
          sort_order?: number
          title?: string
          type?: string
          url?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataroom_items_dataroom_id_fkey"
            columns: ["dataroom_id"]
            isOneToOne: false
            referencedRelation: "datarooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dataroom_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dataroom_items_investor_update_id_fkey"
            columns: ["investor_update_id"]
            isOneToOne: false
            referencedRelation: "investor_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      dataroom_share_links: {
        Row: {
          access_count: number
          allow_download: boolean
          created_at: string
          created_by: string | null
          dataroom_id: string
          expires_at: string | null
          id: string
          last_access_at: string | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          access_count?: number
          allow_download?: boolean
          created_at?: string
          created_by?: string | null
          dataroom_id: string
          expires_at?: string | null
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          access_count?: number
          allow_download?: boolean
          created_at?: string
          created_by?: string | null
          dataroom_id?: string
          expires_at?: string | null
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataroom_share_links_dataroom_id_fkey"
            columns: ["dataroom_id"]
            isOneToOne: false
            referencedRelation: "datarooms"
            referencedColumns: ["id"]
          },
        ]
      }
      datarooms: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datarooms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
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
          mime_type: string | null
          name: string
          search_vector: unknown
          updated_at: string
          uploaded_by: string | null
          visibility: string | null
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
          mime_type?: string | null
          name: string
          search_vector?: unknown
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string | null
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
          mime_type?: string | null
          name?: string
          search_vector?: unknown
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string | null
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
      email_log: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          email_type: string
          error_message: string | null
          id: string
          provider_message_id: string | null
          recipients: Json
          sent_at: string | null
          session_id: string | null
          status: string
          subject: string
          workspace_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipients?: Json
          sent_at?: string | null
          session_id?: string | null
          status?: string
          subject: string
          workspace_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipients?: Json
          sent_at?: string | null
          session_id?: string | null
          status?: string
          subject?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_attachments: {
        Row: {
          created_at: string
          exercise_id: string
          external_url: string | null
          file_path: string | null
          id: string
          mime_type: string | null
          name: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          name: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attachments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          common_pitfalls: string | null
          created_at: string
          duration_minutes: number | null
          facilitator_tips: string | null
          group_size: string | null
          id: string
          materials_needed: string[] | null
          owner_user_id: string | null
          program_id: string | null
          purpose: string | null
          startup_context_tags: string[] | null
          status: string
          step_by_step: Json | null
          success_criteria: string | null
          title: string
          updated_at: string
          variations: string | null
        }
        Insert: {
          common_pitfalls?: string | null
          created_at?: string
          duration_minutes?: number | null
          facilitator_tips?: string | null
          group_size?: string | null
          id?: string
          materials_needed?: string[] | null
          owner_user_id?: string | null
          program_id?: string | null
          purpose?: string | null
          startup_context_tags?: string[] | null
          status?: string
          step_by_step?: Json | null
          success_criteria?: string | null
          title: string
          updated_at?: string
          variations?: string | null
        }
        Update: {
          common_pitfalls?: string | null
          created_at?: string
          duration_minutes?: number | null
          facilitator_tips?: string | null
          group_size?: string | null
          id?: string
          materials_needed?: string[] | null
          owner_user_id?: string | null
          program_id?: string | null
          purpose?: string | null
          startup_context_tags?: string[] | null
          status?: string
          step_by_step?: Json | null
          success_criteria?: string | null
          title?: string
          updated_at?: string
          variations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_library_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_model_metric_map: {
        Row: {
          created_at: string
          id: string
          kpi_definition_id: string | null
          metric_key: string
          program_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_definition_id?: string | null
          metric_key: string
          program_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_definition_id?: string | null
          metric_key?: string
          program_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_model_metric_map_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_model_metric_map_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_model_versions: {
        Row: {
          ai_review_generated_at: string | null
          ai_review_generated_by: string | null
          ai_review_json: Json | null
          created_at: string
          document_id: string
          id: string
          key_metrics_json: Json | null
          parse_error: string | null
          scenario_name: string
          snapshot_json: Json | null
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          ai_review_generated_at?: string | null
          ai_review_generated_by?: string | null
          ai_review_json?: Json | null
          created_at?: string
          document_id: string
          id?: string
          key_metrics_json?: Json | null
          parse_error?: string | null
          scenario_name?: string
          snapshot_json?: Json | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          ai_review_generated_at?: string | null
          ai_review_generated_by?: string | null
          ai_review_json?: Json | null
          created_at?: string
          document_id?: string
          id?: string
          key_metrics_json?: Json | null
          parse_error?: string | null
          scenario_name?: string
          snapshot_json?: Json | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_model_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_model_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rounds: {
        Row: {
          announced_at: string | null
          closed_at: string | null
          created_at: string
          id: string
          notes: string | null
          raised_amount: number | null
          round_type: string
          startup_id: string
          status: string
          target_amount: number | null
          updated_at: string
          valuation: number | null
        }
        Insert: {
          announced_at?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          raised_amount?: number | null
          round_type: string
          startup_id: string
          status?: string
          target_amount?: number | null
          updated_at?: string
          valuation?: number | null
        }
        Update: {
          announced_at?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          raised_amount?: number | null
          round_type?: string
          startup_id?: string
          status?: string
          target_amount?: number | null
          updated_at?: string
          valuation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_rounds_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_rounds_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      global_integration_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          integration_type: string
          is_enabled: boolean
          settings_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          integration_type: string
          is_enabled?: boolean
          settings_json?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          integration_type?: string
          is_enabled?: boolean
          settings_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      health_model_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          thresholds_json: Json
          updated_at: string
          weights_json: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          thresholds_json?: Json
          updated_at?: string
          weights_json?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          thresholds_json?: Json
          updated_at?: string
          weights_json?: Json
        }
        Relationships: []
      }
      investor_readiness_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          program_id: string | null
          sort_order: number
          stage: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          sort_order?: number
          stage: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          sort_order?: number
          stage?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_readiness_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_update_templates: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sections_json: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sections_json?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sections_json?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      investor_updates: {
        Row: {
          content_json: Json
          created_at: string
          generated_by: string | null
          id: string
          month: string
          sent_at: string | null
          sent_to: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          generated_by?: string | null
          id?: string
          month: string
          sent_at?: string | null
          sent_to?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          generated_by?: string | null
          id?: string
          month?: string
          sent_at?: string | null
          sent_to?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_updates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          startup_id: string
          status: string
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          startup_id: string
          status?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          startup_id?: string
          status?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investors_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investors_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          direction: string | null
          id: string
          is_global: boolean
          name: string
          program_id: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          direction?: string | null
          id?: string
          is_global?: boolean
          name: string
          program_id?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          direction?: string | null
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
      kpi_values: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kpi_definition_id: string
          locked_by_source: boolean
          notes: string | null
          period_month: string
          source_ref_id: string | null
          source_type: string
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
          locked_by_source?: boolean
          notes?: string | null
          period_month: string
          source_ref_id?: string | null
          source_type?: string
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
          locked_by_source?: boolean
          notes?: string | null
          period_month?: string
          source_ref_id?: string | null
          source_type?: string
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
          {
            foreignKeyName: "kpi_values_source_ref_fkey"
            columns: ["source_ref_id"]
            isOneToOne: false
            referencedRelation: "financial_model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          mentor_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          mentor_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          mentor_id?: string
          start_time?: string
        }
        Relationships: []
      }
      mentor_bookings: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          mentor_id: string
          message: string | null
          requested_date: string
          requested_end_time: string
          requested_start_time: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          mentor_id: string
          message?: string | null
          requested_date: string
          requested_end_time: string
          requested_start_time: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          mentor_id?: string
          message?: string | null
          requested_date?: string
          requested_end_time?: string
          requested_start_time?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_bookings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_connections: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          mentor_id: string
          message: string | null
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          mentor_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          mentor_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentor_nda_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_hash: string | null
          nda_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_hash?: string | null
          nda_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_hash?: string | null
          nda_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentor_requests: {
        Row: {
          assigned_mentor_id: string | null
          created_at: string
          description: string | null
          expertise_tags: string[]
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          requested_by: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_mentor_id?: string | null
          created_at?: string
          description?: string | null
          expertise_tags?: string[]
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          requested_by: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_mentor_id?: string | null
          created_at?: string
          description?: string | null
          expertise_tags?: string[]
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          requested_by?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          search_vector: unknown
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          search_vector?: unknown
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          search_vector?: unknown
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_reminders: {
        Row: {
          days_before: number
          id: string
          milestone_id: string
          reminder_type: string
          sent_at: string
          workspace_id: string
        }
        Insert: {
          days_before: number
          id?: string
          milestone_id: string
          reminder_type: string
          sent_at?: string
          workspace_id: string
        }
        Update: {
          days_before?: number
          id?: string
          milestone_id?: string
          reminder_type?: string
          sent_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_reminders_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_reminders_workspace_id_fkey"
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
          position: number | null
          search_vector: unknown
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
          position?: number | null
          search_vector?: unknown
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
          position?: number | null
          search_vector?: unknown
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
      notification_preferences: {
        Row: {
          calendar_sync_enabled: boolean | null
          created_at: string
          digest_day: number | null
          digest_frequency: string | null
          email_digest_enabled: boolean | null
          email_on_health_drop: boolean | null
          id: string
          last_digest_sent_at: string | null
          milestone_reminder_days: number | null
          milestone_reminders_enabled: boolean | null
          slack_enabled: boolean | null
          slack_webhook_url: string | null
          updated_at: string
          user_id: string
          weekly_health_digest: boolean | null
        }
        Insert: {
          calendar_sync_enabled?: boolean | null
          created_at?: string
          digest_day?: number | null
          digest_frequency?: string | null
          email_digest_enabled?: boolean | null
          email_on_health_drop?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          milestone_reminder_days?: number | null
          milestone_reminders_enabled?: boolean | null
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          updated_at?: string
          user_id: string
          weekly_health_digest?: boolean | null
        }
        Update: {
          calendar_sync_enabled?: boolean | null
          created_at?: string
          digest_day?: number | null
          digest_frequency?: string | null
          email_digest_enabled?: boolean | null
          email_on_health_drop?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          milestone_reminder_days?: number | null
          milestone_reminders_enabled?: boolean | null
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          updated_at?: string
          user_id?: string
          weekly_health_digest?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      outlook_calendar_settings: {
        Row: {
          calendar_user_email: string | null
          created_at: string
          created_by: string | null
          enabled: boolean
          graph_client_id: string | null
          graph_secret_key: string | null
          graph_tenant_id: string | null
          id: string
          sync_mode: string
          updated_at: string
          use_custom_calendar_email: boolean
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          calendar_user_email?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          graph_client_id?: string | null
          graph_secret_key?: string | null
          graph_tenant_id?: string | null
          id?: string
          sync_mode?: string
          updated_at?: string
          use_custom_calendar_email?: boolean
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          calendar_user_email?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          graph_client_id?: string | null
          graph_secret_key?: string | null
          graph_tenant_id?: string | null
          id?: string
          sync_mode?: string
          updated_at?: string
          use_custom_calendar_email?: boolean
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlook_calendar_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_items: {
        Row: {
          created_at: string
          default_owner_role: string | null
          description: string | null
          id: string
          item_type: string
          metadata_json: Json | null
          order_index: number
          playbook_id: string
          priority: string | null
          relative_due_days: number | null
          title: string
        }
        Insert: {
          created_at?: string
          default_owner_role?: string | null
          description?: string | null
          id?: string
          item_type: string
          metadata_json?: Json | null
          order_index?: number
          playbook_id: string
          priority?: string | null
          relative_due_days?: number | null
          title: string
        }
        Update: {
          created_at?: string
          default_owner_role?: string | null
          description?: string | null
          id?: string
          item_type?: string
          metadata_json?: Json | null
          order_index?: number
          playbook_id?: string
          priority?: string | null
          relative_due_days?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_items_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_template_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_required: boolean | null
          order_index: number | null
          playbook_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          playbook_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          playbook_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_template_assignments_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          program_id: string | null
          stage: Database["public"]["Enums"]["startup_stage"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          stage: Database["public"]["Enums"]["startup_stage"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          program_id?: string | null
          stage?: Database["public"]["Enums"]["startup_stage"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          calendar_feed_token: string | null
          created_at: string
          email: string
          expertise: string[] | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_token?: string | null
          created_at?: string
          email: string
          expertise?: string[] | null
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_token?: string | null
          created_at?: string
          email?: string
          expertise?: string[] | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_alert_rules: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          program_id: string
          rule_type: string
          severity: string
          threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          program_id: string
          rule_type: string
          severity?: string
          threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          program_id?: string
          rule_type?: string
          severity?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_alert_rules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_core_kpis: {
        Row: {
          created_at: string
          id: string
          kpi_definition_id: string
          order_index: number
          program_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_definition_id: string
          order_index?: number
          program_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_definition_id?: string
          order_index?: number
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_core_kpis_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_core_kpis_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_health_model: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          program_id: string
          thresholds_json: Json
          updated_at: string
          weights_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          program_id: string
          thresholds_json?: Json
          updated_at?: string
          weights_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          program_id?: string
          thresholds_json?: Json
          updated_at?: string
          weights_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "program_health_model_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_health_model_versions: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          note: string | null
          program_id: string
          thresholds_json: Json
          weights_json: Json
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          program_id: string
          thresholds_json: Json
          weights_json: Json
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          program_id?: string
          thresholds_json?: Json
          weights_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "program_health_model_versions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_setup_drafts: {
        Row: {
          created_at: string
          created_by: string
          draft_json: Json
          id: string
          program_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          draft_json?: Json
          id?: string
          program_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          draft_json?: Json
          id?: string
          program_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_setup_drafts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quality_check_results: {
        Row: {
          coach_hints: Json | null
          computed_at: string
          computed_by: string | null
          entity_id: string
          entity_type: string
          id: string
          missing_items: Json | null
          passed_items: Json | null
          score: number | null
        }
        Insert: {
          coach_hints?: Json | null
          computed_at?: string
          computed_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          missing_items?: Json | null
          passed_items?: Json | null
          score?: number | null
        }
        Update: {
          coach_hints?: Json | null
          computed_at?: string
          computed_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          missing_items?: Json | null
          passed_items?: Json | null
          score?: number | null
        }
        Relationships: []
      }
      quality_checks_config: {
        Row: {
          check_function: string | null
          created_at: string
          criteria_key: string
          description: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          label: string
          program_id: string | null
          weight: number | null
        }
        Insert: {
          check_function?: string | null
          created_at?: string
          criteria_key: string
          description?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          label: string
          program_id?: string | null
          weight?: number | null
        }
        Update: {
          check_function?: string | null
          created_at?: string
          criteria_key?: string
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          label?: string
          program_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_checks_config_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_jobs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          job_type: string
          last_run_at: string | null
          metadata: Json | null
          next_run_at: string | null
          schedule: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          job_type: string
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          job_type?: string
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string | null
          id: string
          is_global: boolean | null
          program_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          is_global?: boolean | null
          program_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          is_global?: boolean | null
          program_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_instances: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_at: string
          id: string
          program_id: string | null
          ritual_type: string
          status: string
          summary: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_at: string
          id?: string
          program_id?: string | null
          ritual_type: string
          status?: string
          summary?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_at?: string
          id?: string
          program_id?: string | null
          ritual_type?: string
          status?: string
          summary?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ritual_instances_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ritual_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          is_public: boolean | null
          rating: number
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          is_public?: boolean | null
          rating: number
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          is_public?: boolean | null
          rating?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_tags: {
        Row: {
          created_at: string
          session_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          session_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          session_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_tags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      session_templates: {
        Row: {
          agenda_template: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_global: boolean
          name: string
          notes_template: string | null
          program_id: string | null
        }
        Insert: {
          agenda_template?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          notes_template?: string | null
          program_id?: string | null
        }
        Update: {
          agenda_template?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          notes_template?: string | null
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transcripts: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          source: string | null
          transcript_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          source?: string | null
          transcript_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          source?: string | null
          transcript_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_workflow_state: {
        Row: {
          actions_done: boolean | null
          completed_at: string | null
          created_at: string
          decisions_done: boolean | null
          followup_sent: boolean | null
          next_session_planned: boolean | null
          risks_done: boolean | null
          session_id: string
          updated_at: string
        }
        Insert: {
          actions_done?: boolean | null
          completed_at?: string | null
          created_at?: string
          decisions_done?: boolean | null
          followup_sent?: boolean | null
          next_session_planned?: boolean | null
          risks_done?: boolean | null
          session_id: string
          updated_at?: string
        }
        Update: {
          actions_done?: boolean | null
          completed_at?: string | null
          created_at?: string
          decisions_done?: boolean | null
          followup_sent?: boolean | null
          next_session_planned?: boolean | null
          risks_done?: boolean | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_workflow_state_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          agenda: string | null
          ai_action_suggestions: Json | null
          ai_decisions: Json | null
          ai_generated_at: string | null
          ai_generated_by: string | null
          ai_kpi_prompts: Json | null
          ai_risks: Json | null
          ai_summary: string | null
          created_at: string
          created_by: string | null
          decisions: string | null
          duration: number | null
          id: string
          join_url: string | null
          location: string | null
          notes: string | null
          outlook_event_id: string | null
          outlook_owner_email: string | null
          outlook_sync_error: string | null
          outlook_sync_status: string | null
          outlook_synced_at: string | null
          raw_transcript: string | null
          scheduled_at: string
          search_vector: unknown
          source: string | null
          teams_meeting_url: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agenda?: string | null
          ai_action_suggestions?: Json | null
          ai_decisions?: Json | null
          ai_generated_at?: string | null
          ai_generated_by?: string | null
          ai_kpi_prompts?: Json | null
          ai_risks?: Json | null
          ai_summary?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          duration?: number | null
          id?: string
          join_url?: string | null
          location?: string | null
          notes?: string | null
          outlook_event_id?: string | null
          outlook_owner_email?: string | null
          outlook_sync_error?: string | null
          outlook_sync_status?: string | null
          outlook_synced_at?: string | null
          raw_transcript?: string | null
          scheduled_at: string
          search_vector?: unknown
          source?: string | null
          teams_meeting_url?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agenda?: string | null
          ai_action_suggestions?: Json | null
          ai_decisions?: Json | null
          ai_generated_at?: string | null
          ai_generated_by?: string | null
          ai_kpi_prompts?: Json | null
          ai_risks?: Json | null
          ai_summary?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          duration?: number | null
          id?: string
          join_url?: string | null
          location?: string | null
          notes?: string | null
          outlook_event_id?: string | null
          outlook_owner_email?: string | null
          outlook_sync_error?: string | null
          outlook_sync_status?: string | null
          outlook_synced_at?: string | null
          raw_transcript?: string | null
          scheduled_at?: string
          search_vector?: unknown
          source?: string | null
          teams_meeting_url?: string | null
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
      share_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_viewed_at: string | null
          revoked_at: string | null
          scope: string
          token: string
          views_count: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          last_viewed_at?: string | null
          revoked_at?: string | null
          scope?: string
          token?: string
          views_count?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_viewed_at?: string | null
          revoked_at?: string | null
          scope?: string
          token?: string
          views_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_tasks: {
        Row: {
          assignee_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string | null
          related_startup_id: string | null
          related_user_id: string | null
          source_rule_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assignee_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          related_startup_id?: string | null
          related_user_id?: string | null
          source_rule_id?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assignee_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          related_startup_id?: string | null
          related_user_id?: string | null
          source_rule_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_related_startup_id_fkey"
            columns: ["related_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_related_startup_id_fkey"
            columns: ["related_startup_id"]
            isOneToOne: false
            referencedRelation: "startups_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_source_rule_id_fkey"
            columns: ["source_rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_work_queue_items: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          evidence_json: Json | null
          id: string
          priority: string
          related_action_id: string | null
          related_milestone_id: string | null
          related_session_id: string | null
          snoozed_until: string | null
          status: string
          title: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          evidence_json?: Json | null
          id?: string
          priority?: string
          related_action_id?: string | null
          related_milestone_id?: string | null
          related_session_id?: string | null
          snoozed_until?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          evidence_json?: Json | null
          id?: string
          priority?: string
          related_action_id?: string | null
          related_milestone_id?: string | null
          related_session_id?: string | null
          snoozed_until?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_work_queue_items_related_action_id_fkey"
            columns: ["related_action_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_work_queue_items_related_milestone_id_fkey"
            columns: ["related_milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_work_queue_items_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_work_queue_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_gate_criteria: {
        Row: {
          created_at: string
          criteria_json: Json
          id: string
          program_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria_json?: Json
          id?: string
          program_id: string
          stage: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria_json?: Json
          id?: string
          program_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_gate_criteria_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_gate_reviews: {
        Row: {
          conditions: string | null
          created_at: string
          evidence_json: Json | null
          from_stage: string
          id: string
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_stage: string
          workspace_id: string
        }
        Insert: {
          conditions?: string | null
          created_at?: string
          evidence_json?: Json | null
          from_stage: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_stage: string
          workspace_id: string
        }
        Update: {
          conditions?: string | null
          created_at?: string
          evidence_json?: Json | null
          from_stage?: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_stage?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_gate_reviews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage: string | null
          id: string
          notes: string | null
          to_stage: string
          workspace_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage: string
          workspace_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_kpi_defaults: {
        Row: {
          created_at: string
          id: string
          kpi_definition_id: string
          order_index: number | null
          program_id: string | null
          required: boolean
          stage: Database["public"]["Enums"]["startup_stage"]
          target_value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_definition_id: string
          order_index?: number | null
          program_id?: string | null
          required?: boolean
          stage: Database["public"]["Enums"]["startup_stage"]
          target_value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kpi_definition_id?: string
          order_index?: number | null
          program_id?: string | null
          required?: boolean
          stage?: Database["public"]["Enums"]["startup_stage"]
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_kpi_defaults_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_kpi_defaults_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number
          position: number
          program_id: string
          stage_key: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number
          position?: number
          program_id: string
          stage_key?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number
          position?: number
          program_id?: string
          stage_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          founded_date: string | null
          has_startup_portugal_status: boolean | null
          id: string
          logo_url: string | null
          main_contact_email: string | null
          main_contact_name: string | null
          main_contact_phone: string | null
          name: string
          nif: string | null
          phone: string | null
          startup_portugal_document_path: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          founded_date?: string | null
          has_startup_portugal_status?: boolean | null
          id?: string
          logo_url?: string | null
          main_contact_email?: string | null
          main_contact_name?: string | null
          main_contact_phone?: string | null
          name: string
          nif?: string | null
          phone?: string | null
          startup_portugal_document_path?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          founded_date?: string | null
          has_startup_portugal_status?: boolean | null
          id?: string
          logo_url?: string | null
          main_contact_email?: string | null
          main_contact_name?: string | null
          main_contact_phone?: string | null
          name?: string
          nif?: string | null
          phone?: string | null
          startup_portugal_document_path?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      support_materials: {
        Row: {
          category: string | null
          content_markdown: string | null
          created_at: string
          description: string | null
          external_links: Json | null
          file_path: string | null
          id: string
          owner_user_id: string | null
          program_id: string | null
          startup_stage: string | null
          startup_type: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content_markdown?: string | null
          created_at?: string
          description?: string | null
          external_links?: Json | null
          file_path?: string | null
          id?: string
          owner_user_id?: string | null
          program_id?: string | null
          startup_stage?: string | null
          startup_type?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content_markdown?: string | null
          created_at?: string
          description?: string | null
          external_links?: Json | null
          file_path?: string | null
          id?: string
          owner_user_id?: string | null
          program_id?: string | null
          startup_stage?: string | null
          startup_type?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_materials_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          name: string
          program_id: string | null
          reminder_days: number[] | null
          starts_at: string
          status: string
          survey_definition_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          name: string
          program_id?: string | null
          reminder_days?: number[] | null
          starts_at?: string
          status?: string
          survey_definition_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          name?: string
          program_id?: string | null
          reminder_days?: number[] | null
          starts_at?: string
          status?: string
          survey_definition_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_campaigns_survey_definition_id_fkey"
            columns: ["survey_definition_id"]
            isOneToOne: false
            referencedRelation: "survey_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_definitions: {
        Row: {
          auto_fill_mappings: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          questions_json: Json
          updated_at: string
        }
        Insert: {
          auto_fill_mappings?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          questions_json?: Json
          updated_at?: string
        }
        Update: {
          auto_fill_mappings?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          questions_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      survey_instances: {
        Row: {
          auto_filled_data: Json | null
          campaign_id: string
          created_at: string
          id: string
          last_reminder_sent_at: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_filled_data?: Json | null
          campaign_id: string
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_filled_data?: Json | null
          campaign_id?: string
          created_at?: string
          id?: string
          last_reminder_sent_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_instances_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "survey_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          is_auto_filled: boolean | null
          question_id: string
          response_json: Json | null
          response_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          is_auto_filled?: boolean | null
          question_id: string
          response_json?: Json | null
          response_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          is_auto_filled?: boolean | null
          question_id?: string
          response_json?: Json | null
          response_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "survey_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_founder: boolean | null
          joined_at: string | null
          left_at: string | null
          linkedin_url: string | null
          phone: string | null
          role: string
          startup_id: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_founder?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          linkedin_url?: string | null
          phone?: string | null
          role?: string
          startup_id: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_founder?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          linkedin_url?: string | null
          phone?: string | null
          role?: string
          startup_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      teams_integration_settings: {
        Row: {
          created_at: string
          created_by: string | null
          default_channel_name: string | null
          enabled: boolean
          id: string
          notify_action_assigned: boolean
          notify_action_overdue: boolean
          notify_checkin_submitted: boolean
          notify_health_alert: boolean
          notify_session_created: boolean
          notify_session_rescheduled: boolean
          program_id: string | null
          updated_at: string
          webhook_url: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_channel_name?: string | null
          enabled?: boolean
          id?: string
          notify_action_assigned?: boolean
          notify_action_overdue?: boolean
          notify_checkin_submitted?: boolean
          notify_health_alert?: boolean
          notify_session_created?: boolean
          notify_session_rescheduled?: boolean
          program_id?: string | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_channel_name?: string | null
          enabled?: boolean
          id?: string
          notify_action_assigned?: boolean
          notify_action_overdue?: boolean
          notify_checkin_submitted?: boolean
          notify_health_alert?: boolean
          notify_session_created?: boolean
          notify_session_rescheduled?: boolean
          program_id?: string | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_integration_settings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_integration_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_instances: {
        Row: {
          created_at: string
          created_by: string | null
          data_json: Json | null
          id: string
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          template_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_json?: Json | null
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          template_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_json?: Json | null
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_global: boolean
          name: string
          program_id: string | null
          schema_json: Json | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          program_id?: string | null
          schema_json?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          program_id?: string | null
          schema_json?: Json | null
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
      time_entries: {
        Row: {
          category: string | null
          created_at: string
          date: string
          description: string | null
          hours: number
          id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          date: string
          description?: string | null
          hours: number
          id?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          hours?: number
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_economics_values: {
        Row: {
          arpu: number | null
          cac: number | null
          created_at: string
          created_by: string | null
          customer_lifetime_months: number | null
          gross_margin: number | null
          id: string
          ltv: number | null
          ltv_cac_ratio: number | null
          marketing_costs: number | null
          monthly_churn_rate: number | null
          new_customers: number | null
          payback_months: number | null
          period_month: string
          sales_costs: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          arpu?: number | null
          cac?: number | null
          created_at?: string
          created_by?: string | null
          customer_lifetime_months?: number | null
          gross_margin?: number | null
          id?: string
          ltv?: number | null
          ltv_cac_ratio?: number | null
          marketing_costs?: number | null
          monthly_churn_rate?: number | null
          new_customers?: number | null
          payback_months?: number | null
          period_month: string
          sales_costs?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          arpu?: number | null
          cac?: number | null
          created_at?: string
          created_by?: string | null
          customer_lifetime_months?: number | null
          gross_margin?: number | null
          id?: string
          ltv?: number | null
          ltv_cac_ratio?: number | null
          marketing_costs?: number | null
          monthly_churn_rate?: number | null
          new_customers?: number | null
          payback_months?: number | null
          period_month?: string
          sales_costs?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_economics_values_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      value_prop_artifacts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          json_fields: Json
          outputs_text: Json
          updated_at: string
          version: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          json_fields?: Json
          outputs_text?: Json
          updated_at?: string
          version?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          json_fields?: Json
          outputs_text?: Json
          updated_at?: string
          version?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_prop_artifacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          created_at: string
          id: string
          result_json: Json | null
          rule_id: string
          status: string
          trigger_event_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_json?: Json | null
          rule_id: string
          status?: string
          trigger_event_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_json?: Json | null
          rule_id?: string
          status?: string
          trigger_event_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          actions_json: Json
          conditions_json: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          program_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions_json?: Json
          conditions_json?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          program_id?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions_json?: Json
          conditions_json?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          program_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_alerts: {
        Row: {
          created_at: string
          evidence_json: Json | null
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          rule_type: string
          severity: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          evidence_json?: Json | null
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_type: string
          severity: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          evidence_json?: Json | null
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_type?: string
          severity?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_assignments: {
        Row: {
          assigned_user_id: string
          created_at: string
          id: string
          role: string
          workspace_id: string
        }
        Insert: {
          assigned_user_id: string
          created_at?: string
          id?: string
          role?: string
          workspace_id: string
        }
        Update: {
          assigned_user_id?: string
          created_at?: string
          id?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_email_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          workspace_id: string
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          workspace_id: string
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_email_aliases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_health_alerts: {
        Row: {
          ack_at: string | null
          ack_by: string | null
          alert_type: string
          created_at: string
          evidence_json: Json
          id: string
          reason: string
          resolved_at: string | null
          severity: string
          snoozed_until: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          ack_at?: string | null
          ack_by?: string | null
          alert_type: string
          created_at?: string
          evidence_json?: Json
          id?: string
          reason: string
          resolved_at?: string | null
          severity?: string
          snoozed_until?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          ack_at?: string | null
          ack_by?: string | null
          alert_type?: string
          created_at?: string
          evidence_json?: Json
          id?: string
          reason?: string
          resolved_at?: string | null
          severity?: string
          snoozed_until?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_health_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_health_history: {
        Row: {
          components_json: Json
          computed_at: string
          created_at: string
          explanation_json: Json | null
          id: string
          label: string
          model_version_id: string | null
          score_numeric: number
          workspace_id: string
        }
        Insert: {
          components_json?: Json
          computed_at?: string
          created_at?: string
          explanation_json?: Json | null
          id?: string
          label: string
          model_version_id?: string | null
          score_numeric: number
          workspace_id: string
        }
        Update: {
          components_json?: Json
          computed_at?: string
          created_at?: string
          explanation_json?: Json | null
          id?: string
          label?: string
          model_version_id?: string | null
          score_numeric?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_health_history_model_version"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "program_health_model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_health_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_kpis: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kpi_definition_id: string
          required: boolean
          target_value: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kpi_definition_id: string
          required?: boolean
          target_value?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kpi_definition_id?: string
          required?: boolean
          target_value?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_kpis_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_kpis_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_playbook_instances: {
        Row: {
          created_at: string
          id: string
          instantiated_at: string | null
          instantiated_by: string | null
          playbook_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instantiated_at?: string | null
          instantiated_by?: string | null
          playbook_id: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instantiated_at?: string | null
          instantiated_by?: string | null
          playbook_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_playbook_instances_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_playbook_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_playbook_links: {
        Row: {
          action_item_id: string | null
          created_at: string
          id: string
          milestone_id: string | null
          playbook_item_id: string | null
          workspace_playbook_instance_id: string
        }
        Insert: {
          action_item_id?: string | null
          created_at?: string
          id?: string
          milestone_id?: string | null
          playbook_item_id?: string | null
          workspace_playbook_instance_id: string
        }
        Update: {
          action_item_id?: string | null
          created_at?: string
          id?: string
          milestone_id?: string | null
          playbook_item_id?: string | null
          workspace_playbook_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_playbook_links_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_playbook_links_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_playbook_links_playbook_item_id_fkey"
            columns: ["playbook_item_id"]
            isOneToOne: false
            referencedRelation: "playbook_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_playbook_links_workspace_playbook_instance_id_fkey"
            columns: ["workspace_playbook_instance_id"]
            isOneToOne: false
            referencedRelation: "workspace_playbook_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_readiness_status: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          item_id: string
          notes: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_readiness_status_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "investor_readiness_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_readiness_status_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_tags: {
        Row: {
          created_at: string
          tag_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_template_tasks: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          status: string | null
          template_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_by: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string | null
          template_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string | null
          template_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_template_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_users: {
        Row: {
          active: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          active?: boolean
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
          active_financial_model_version_id: string | null
          assigned_consultor_id: string | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          created_at: string
          external_id: string | null
          health_confidence: string | null
          health_confidence_reason: string | null
          health_notes: string | null
          health_score: Database["public"]["Enums"]["health_score"] | null
          health_score_calculated: string | null
          health_score_components: Json | null
          health_score_explanation: Json | null
          health_score_numeric: number | null
          health_score_override:
            | Database["public"]["Enums"]["health_score"]
            | null
          health_score_updated_at: string | null
          health_status: string | null
          id: string
          last_checkin_at: string | null
          last_contact_at: string | null
          next_followup_at: string | null
          priority_level: Database["public"]["Enums"]["workspace_priority"]
          priority_notes: string | null
          priority_set_at: string | null
          priority_set_by: string | null
          program_id: string
          quality_mode: string | null
          stage: Database["public"]["Enums"]["startup_stage"]
          stage_id: string | null
          startup_id: string
          status: string
          updated_at: string
        }
        Insert: {
          active_financial_model_version_id?: string | null
          assigned_consultor_id?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          created_at?: string
          external_id?: string | null
          health_confidence?: string | null
          health_confidence_reason?: string | null
          health_notes?: string | null
          health_score?: Database["public"]["Enums"]["health_score"] | null
          health_score_calculated?: string | null
          health_score_components?: Json | null
          health_score_explanation?: Json | null
          health_score_numeric?: number | null
          health_score_override?:
            | Database["public"]["Enums"]["health_score"]
            | null
          health_score_updated_at?: string | null
          health_status?: string | null
          id?: string
          last_checkin_at?: string | null
          last_contact_at?: string | null
          next_followup_at?: string | null
          priority_level?: Database["public"]["Enums"]["workspace_priority"]
          priority_notes?: string | null
          priority_set_at?: string | null
          priority_set_by?: string | null
          program_id: string
          quality_mode?: string | null
          stage?: Database["public"]["Enums"]["startup_stage"]
          stage_id?: string | null
          startup_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          active_financial_model_version_id?: string | null
          assigned_consultor_id?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          created_at?: string
          external_id?: string | null
          health_confidence?: string | null
          health_confidence_reason?: string | null
          health_notes?: string | null
          health_score?: Database["public"]["Enums"]["health_score"] | null
          health_score_calculated?: string | null
          health_score_components?: Json | null
          health_score_explanation?: Json | null
          health_score_numeric?: number | null
          health_score_override?:
            | Database["public"]["Enums"]["health_score"]
            | null
          health_score_updated_at?: string | null
          health_status?: string | null
          id?: string
          last_checkin_at?: string | null
          last_contact_at?: string | null
          next_followup_at?: string | null
          priority_level?: Database["public"]["Enums"]["workspace_priority"]
          priority_notes?: string | null
          priority_set_at?: string | null
          priority_set_by?: string | null
          program_id?: string
          quality_mode?: string | null
          stage?: Database["public"]["Enums"]["startup_stage"]
          stage_id?: string | null
          startup_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_active_financial_model_version_id_fkey"
            columns: ["active_financial_model_version_id"]
            isOneToOne: false
            referencedRelation: "financial_model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          avatar_url: string | null
          bio: string | null
          calendar_feed_token: string | null
          created_at: string | null
          email: string | null
          expertise: string[] | null
          full_name: string | null
          id: string | null
          linkedin_url: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_token?: string | null
          created_at?: string | null
          email?: never
          expertise?: string[] | null
          full_name?: string | null
          id?: string | null
          linkedin_url?: string | null
          phone?: never
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_token?: string | null
          created_at?: string | null
          email?: never
          expertise?: string[] | null
          full_name?: string | null
          id?: string | null
          linkedin_url?: string | null
          phone?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          expertise: string[] | null
          full_name: string | null
          id: string | null
          role_display: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          expertise?: string[] | null
          full_name?: string | null
          id?: string | null
          role_display?: never
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          expertise?: string[] | null
          full_name?: string | null
          id?: string | null
          role_display?: never
        }
        Relationships: []
      }
      startups_safe: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          founded_date: string | null
          id: string | null
          is_legally_recognized: boolean | null
          logo_url: string | null
          main_contact_email: string | null
          main_contact_name: string | null
          main_contact_phone: string | null
          name: string | null
          nif: string | null
          phone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: never
          created_at?: string | null
          description?: string | null
          founded_date?: string | null
          id?: string | null
          is_legally_recognized?: boolean | null
          logo_url?: string | null
          main_contact_email?: never
          main_contact_name?: never
          main_contact_phone?: never
          name?: string | null
          nif?: never
          phone?: never
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: never
          created_at?: string | null
          description?: string | null
          founded_date?: string | null
          id?: string | null
          is_legally_recognized?: boolean | null
          logo_url?: string | null
          main_contact_email?: never
          main_contact_name?: never
          main_contact_phone?: never
          name?: string | null
          nif?: never
          phone?: never
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      team_members_safe: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_founder: boolean | null
          joined_at: string | null
          left_at: string | null
          linkedin_url: string | null
          phone: string | null
          role: string | null
          startup_id: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          is_founder?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          linkedin_url?: never
          phone?: never
          role?: string | null
          startup_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          is_founder?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          linkedin_url?: never
          phone?: never
          role?: string | null
          startup_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      block_workspace: {
        Args: { _reason?: string; _workspace_id: string }
        Returns: undefined
      }
      can_edit_workspace: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      can_manage_startup: { Args: { _startup_id: string }; Returns: boolean }
      can_see_startup_pii: { Args: { _startup_id: string }; Returns: boolean }
      can_see_team_member_pii: {
        Args: { _startup_id: string }
        Returns: boolean
      }
      can_view_quality_result: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: boolean
      }
      can_write_workspace: { Args: { _workspace_id: string }; Returns: boolean }
      check_ai_rate_limit: {
        Args: {
          _function_name: string
          _max_requests?: number
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      create_conversation: {
        Args: {
          _title?: string
          _workspace_id?: string
          participant_ids: string[]
        }
        Returns: string
      }
      create_startup_application: {
        Args: {
          p_description?: string
          p_has_startup_portugal_status?: boolean
          p_main_contact_email?: string
          p_main_contact_name?: string
          p_main_contact_phone?: string
          p_name: string
          p_nif?: string
          p_program_id: string
          p_stage: string
          p_website?: string
        }
        Returns: {
          startup_id: string
          workspace_id: string
        }[]
      }
      ensure_dataroom_exists: {
        Args: { _workspace_id: string }
        Returns: string
      }
      ensure_founder_role: { Args: never; Returns: undefined }
      generate_weekly_checkins: { Args: never; Returns: number }
      get_dataroom_workspace_id: {
        Args: { _dataroom_id: string }
        Returns: string
      }
      get_kpi_percentiles: {
        Args: {
          _kpi_definition_id: string
          _program_id?: string
          _stage?: string
        }
        Returns: {
          count: number
          p25: number
          p50: number
          p75: number
        }[]
      }
      get_session_workspace_id: {
        Args: { _session_id: string }
        Returns: string
      }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_workspace_stats: {
        Args: { workspace_ids: string[] }
        Returns: {
          has_current_month_kpi: boolean
          last_kpi_month: string
          last_session_id: string
          last_session_notes: string
          last_session_scheduled_at: string
          last_session_title: string
          next_meeting_date: string
          overdue_actions_count: number
          pending_actions_count: number
          workspace_id: string
        }[]
      }
      has_accepted_nda: {
        Args: { _nda_version?: string; _user_id: string }
        Returns: boolean
      }
      has_active_workspace_access: { Args: { ws_id: string }; Returns: boolean }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_program_access: { Args: { _program_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_access:
        | {
            Args: { _user_id: string; _workspace_id: string }
            Returns: boolean
          }
        | { Args: { _workspace_id: string }; Returns: boolean }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_admin_only: { Args: never; Returns: boolean }
      is_connected_mentor: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_external_mentor: { Args: { _user_id: string }; Returns: boolean }
      is_founder: { Args: { _workspace_id: string }; Returns: boolean }
      is_founder_user: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_startup_founder: { Args: { _startup_id: string }; Returns: boolean }
      is_team_member_of_startup: {
        Args: { _startup_id: string }
        Returns: boolean
      }
      shares_workspace_with: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      submit_checkin: {
        Args: { p_instance_id: string; p_responses: Json }
        Returns: string
      }
      unblock_workspace: { Args: { _workspace_id: string }; Returns: undefined }
    }
    Enums: {
      action_status: "pending" | "in_progress" | "completed" | "cancelled"
      app_role:
        | "admin"
        | "consultor"
        | "mentor_externo"
        | "founder"
        | "team_member"
      compliance_status: "on_track" | "needs_update" | "overdue"
      health_score: "critical" | "at_risk" | "stable" | "healthy" | "thriving"
      milestone_status: "not_started" | "in_progress" | "completed" | "delayed"
      startup_stage: "ideation" | "validation" | "mvp" | "growth" | "scale"
      workspace_priority: "star" | "high" | "standard" | "maintenance"
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
      compliance_status: ["on_track", "needs_update", "overdue"],
      health_score: ["critical", "at_risk", "stable", "healthy", "thriving"],
      milestone_status: ["not_started", "in_progress", "completed", "delayed"],
      startup_stage: ["ideation", "validation", "mvp", "growth", "scale"],
      workspace_priority: ["star", "high", "standard", "maintenance"],
    },
  },
} as const
