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
      beta_users: {
        Row: {
          created_at: string | null
          id: string
          joined_discord: boolean | null
          payment_amount: number | null
          payment_status: string | null
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_discord?: boolean | null
          payment_amount?: number | null
          payment_status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_discord?: boolean | null
          payment_amount?: number | null
          payment_status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      entry_insights: {
        Row: {
          chakra_tags: Json | null
          created_at: string
          emotions: Json | null
          entities: Json | null
          entry_id: string
          id: string
          keywords: Json | null
          safety_concerns: Json | null
          summary: string | null
          tarot_tags: Json | null
          themes: Json | null
          user_id: string
        }
        Insert: {
          chakra_tags?: Json | null
          created_at?: string
          emotions?: Json | null
          entities?: Json | null
          entry_id: string
          id?: string
          keywords?: Json | null
          safety_concerns?: Json | null
          summary?: string | null
          tarot_tags?: Json | null
          themes?: Json | null
          user_id: string
        }
        Update: {
          chakra_tags?: Json | null
          created_at?: string
          emotions?: Json | null
          entities?: Json | null
          entry_id?: string
          id?: string
          keywords?: Json | null
          safety_concerns?: Json | null
          summary?: string | null
          tarot_tags?: Json | null
          themes?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_insights_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          goal_id: string
          id: string
          order_index: number | null
          reflection: string | null
          target_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          goal_id: string
          id?: string
          order_index?: number | null
          reflection?: string | null
          target_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          goal_id?: string
          id?: string
          order_index?: number | null
          reflection?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_practices: {
        Row: {
          created_at: string
          description: string | null
          frequency: string
          goal_id: string
          id: string
          is_active: boolean | null
          order_index: number | null
          practice_type: string
          reminder_days: number[] | null
          reminder_enabled: boolean | null
          reminder_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: string
          goal_id: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          practice_type: string
          reminder_days?: number[] | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string
          goal_id?: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          practice_type?: string
          reminder_days?: number[] | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_practices_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_reflections: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          insights: string | null
          next_steps: string | null
          reflection_type: string
          user_id: string
          what_challenged: string | null
          what_worked: string | null
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          insights?: string | null
          next_steps?: string | null
          reflection_type?: string
          user_id: string
          what_challenged?: string | null
          what_worked?: string | null
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          insights?: string | null
          next_steps?: string | null
          reflection_type?: string
          user_id?: string
          what_challenged?: string | null
          what_worked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_reflections_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          archived_reason: string | null
          completion_reflection: string | null
          created_at: string
          description: string | null
          goal_type: string | null
          id: string
          intention: string | null
          linked_patterns: Json | null
          moon_phase_set: string | null
          parent_goal_id: string | null
          phase: string | null
          progress_notes: Json | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_reason?: string | null
          completion_reflection?: string | null
          created_at?: string
          description?: string | null
          goal_type?: string | null
          id?: string
          intention?: string | null
          linked_patterns?: Json | null
          moon_phase_set?: string | null
          parent_goal_id?: string | null
          phase?: string | null
          progress_notes?: Json | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_reason?: string | null
          completion_reflection?: string | null
          created_at?: string
          description?: string | null
          goal_type?: string | null
          id?: string
          intention?: string | null
          linked_patterns?: Json | null
          moon_phase_set?: string | null
          parent_goal_id?: string | null
          phase?: string | null
          progress_notes?: Json | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string
          entries_count: number
          file_name: string
          file_type: string
          id: string
          import_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entries_count?: number
          file_name: string
          file_type: string
          id?: string
          import_date?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entries_count?: number
          file_name?: string
          file_type?: string
          id?: string
          import_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          entry_date: string
          id: string
          import_batch_id: string | null
          linked_goals: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entry_date?: string
          id?: string
          import_batch_id?: string | null
          linked_goals?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          import_batch_id?: string | null
          linked_goals?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_history"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_relationships: {
        Row: {
          context: string | null
          created_at: string
          entry_ids: string[]
          id: string
          pattern_description: string | null
          relationship_type: string
          source_item: string
          strength: number
          target_item: string
          temporal_pattern: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          entry_ids?: string[]
          id?: string
          pattern_description?: string | null
          relationship_type: string
          source_item: string
          strength?: number
          target_item: string
          temporal_pattern?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          entry_ids?: string[]
          id?: string
          pattern_description?: string | null
          relationship_type?: string
          source_item?: string
          strength?: number
          target_item?: string
          temporal_pattern?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nps_responses: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      pattern_insights: {
        Row: {
          actionable_insight: string | null
          confidence_score: number
          created_at: string
          description: string
          entry_ids: string[]
          id: string
          pattern_type: string
          related_items: Json
          temporal_info: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actionable_insight?: string | null
          confidence_score?: number
          created_at?: string
          description: string
          entry_ids?: string[]
          id?: string
          pattern_type: string
          related_items?: Json
          temporal_info?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actionable_insight?: string | null
          confidence_score?: number
          created_at?: string
          description?: string
          entry_ids?: string[]
          id?: string
          pattern_type?: string
          related_items?: Json
          temporal_info?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_logs: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          mood_after: number | null
          mood_before: number | null
          notes: string | null
          practice_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          practice_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          practice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_logs_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "goal_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          function_name: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reflection_prompts: {
        Row: {
          context: string | null
          created_at: string
          id: string
          prompt: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          prompt: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      spiritual_guidance: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          guidance_type: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          guidance_type: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          guidance_type?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          dark_mode: boolean | null
          enable_chakra_tags: boolean | null
          enable_tarot_tags: boolean | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dark_mode?: boolean | null
          enable_chakra_tags?: boolean | null
          enable_tarot_tags?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dark_mode?: boolean | null
          enable_chakra_tags?: boolean | null
          enable_tarot_tags?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      wisdom_cards: {
        Row: {
          context: string | null
          created_at: string
          id: string
          lesson: string
          source_goal_id: string | null
          tags: Json | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          lesson: string
          source_goal_id?: string | null
          tags?: Json | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          lesson?: string
          source_goal_id?: string | null
          tags?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wisdom_cards_source_goal_id_fkey"
            columns: ["source_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
