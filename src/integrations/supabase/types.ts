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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      credit_accounts: {
        Row: {
          available_credits: number
          created_at: string
          reserved_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_credits?: number
          created_at?: string
          reserved_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_credits?: number
          created_at?: string
          reserved_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          id: string
          idempotency_key: string | null
          job_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_type: string
          id?: string
          idempotency_key?: string | null
          job_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          job_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_prompts: {
        Row: {
          category: string
          created_at: string
          gallery_ready: boolean
          generation_ready: boolean
          id: string
          needs_reference_images: boolean
          prompt: string
          reference_mode: string
          result_count: number
          review_notes: string | null
          slug: string | null
          source: string
          source_creator: string | null
          source_notes: string | null
          source_type: string
          source_url: string | null
          status: string
          tags: string[]
          target_model: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_input: string | null
          variants: Json
          why_it_works: string | null
        }
        Insert: {
          category: string
          created_at?: string
          gallery_ready?: boolean
          generation_ready?: boolean
          id: string
          needs_reference_images?: boolean
          prompt: string
          reference_mode?: string
          result_count?: number
          review_notes?: string | null
          slug?: string | null
          source: string
          source_creator?: string | null
          source_notes?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          target_model?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_input?: string | null
          variants?: Json
          why_it_works?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          gallery_ready?: boolean
          generation_ready?: boolean
          id?: string
          needs_reference_images?: boolean
          prompt?: string
          reference_mode?: string
          result_count?: number
          review_notes?: string | null
          slug?: string | null
          source?: string
          source_creator?: string | null
          source_notes?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          target_model?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_input?: string | null
          variants?: Json
          why_it_works?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          prompt_id: string
          prompt_source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          prompt_id: string
          prompt_source: string
          user_id: string
        }
        Update: {
          created_at?: string
          prompt_id?: string
          prompt_source?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          credit_cost: number
          error_code: string | null
          estimated_api_cost_usd: number | null
          height: number | null
          id: string
          idempotency_key: string
          model: string
          openai_request_id: string | null
          operation: string
          prompt: string
          quality: string
          safe_error_message: string | null
          session_id: string
          source_version_id: string | null
          started_at: string | null
          status: string
          usage_json: Json | null
          user_id: string
          width: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credit_cost?: number
          error_code?: string | null
          estimated_api_cost_usd?: number | null
          height?: number | null
          id?: string
          idempotency_key: string
          model: string
          openai_request_id?: string | null
          operation: string
          prompt: string
          quality?: string
          safe_error_message?: string | null
          session_id: string
          source_version_id?: string | null
          started_at?: string | null
          status?: string
          usage_json?: Json | null
          user_id: string
          width?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credit_cost?: number
          error_code?: string | null
          estimated_api_cost_usd?: number | null
          height?: number | null
          id?: string
          idempotency_key?: string
          model?: string
          openai_request_id?: string | null
          operation?: string
          prompt?: string
          quality?: string
          safe_error_message?: string | null
          session_id?: string
          source_version_id?: string | null
          started_at?: string | null
          status?: string
          usage_json?: Json | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "generation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_source_version_id_fkey"
            columns: ["source_version_id"]
            isOneToOne: false
            referencedRelation: "image_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_sessions: {
        Row: {
          created_at: string
          id: string
          source_id: string | null
          source_type: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      image_versions: {
        Row: {
          created_at: string
          height: number
          id: string
          job_id: string
          mime_type: string
          model: string
          parent_version_id: string | null
          prompt: string
          session_id: string
          storage_path: string
          user_id: string
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          job_id: string
          mime_type?: string
          model: string
          parent_version_id?: string | null
          prompt: string
          session_id: string
          storage_path: string
          user_id: string
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          job_id?: string
          mime_type?: string
          model?: string
          parent_version_id?: string | null
          prompt?: string
          session_id?: string
          storage_path?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "image_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "image_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "generation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          input_text: string
          is_public: boolean
          mode: string | null
          output_prompt: string
          tags: string[]
          title: string | null
          user_id: string
          variants: Json | null
          why_it_works: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          input_text: string
          is_public?: boolean
          mode?: string | null
          output_prompt: string
          tags?: string[]
          title?: string | null
          user_id: string
          variants?: Json | null
          why_it_works?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          input_text?: string
          is_public?: boolean
          mode?: string | null
          output_prompt?: string
          tags?: string[]
          title?: string | null
          user_id?: string
          variants?: Json | null
          why_it_works?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_generation_job: {
        Args: {
          p_height: number
          p_idempotency_key: string
          p_model: string
          p_operation: string
          p_prompt: string
          p_session_id: string
          p_source_version_id: string
          p_user_id: string
          p_width: number
        }
        Returns: {
          available_credits: number
          job_id: string
          reserved: boolean
        }[]
      }
      finalize_generation_credits: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_job_id?: string
          p_outcome: string
          p_user_id: string
        }
        Returns: {
          available_credits: number
          ledger_id: string
        }[]
      }
      reserve_generation_credits: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_reason?: string
          p_user_id: string
        }
        Returns: {
          available_credits: number
          ledger_id: string
          reserved: boolean
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
