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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      academy_contents: {
        Row: {
          id: string
          title: string
          slug: string
          subtitle: string | null
          description: string | null
          body: string | null
          category: string | null
          tags: string[]
          thumbnail_url: string | null
          banner_url: string | null
          video_url: string | null
          video_file_name: string | null
          video_mime_type: string | null
          video_size: number | null
          status: Database["public"]["Enums"]["academy_content_status"]
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          subtitle?: string | null
          description?: string | null
          body?: string | null
          category?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          banner_url?: string | null
          video_url?: string | null
          video_file_name?: string | null
          video_mime_type?: string | null
          video_size?: number | null
          status?: Database["public"]["Enums"]["academy_content_status"]
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          subtitle?: string | null
          description?: string | null
          body?: string | null
          category?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          banner_url?: string | null
          video_url?: string | null
          video_file_name?: string | null
          video_mime_type?: string | null
          video_size?: number | null
          status?: Database["public"]["Enums"]["academy_content_status"]
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: []
      }
      academy_content_attachments: {
        Row: {
          id: string
          content_id: string
          name: string
          file_url: string
          mime_type: string
          size: number
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          name: string
          file_url: string
          mime_type: string
          size: number
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          name?: string
          file_url?: string
          mime_type?: string
          size?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_content_attachments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "academy_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          price_cents: number
          currency: string
          status: Database["public"]["Enums"]["course_status"]
          instructor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          thumbnail_url?: string | null
          price_cents?: number
          currency?: string
          status?: Database["public"]["Enums"]["course_status"]
          instructor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          thumbnail_url?: string | null
          price_cents?: number
          currency?: string
          status?: Database["public"]["Enums"]["course_status"]
          instructor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          id: string
          title: string
          description: string | null
          order_index: number
          course_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          order_index?: number
          course_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          order_index?: number
          course_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          id: string
          title: string
          description: string | null
          video_url: string | null
          duration_minutes: number | null
          order_index: number
          module_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          video_url?: string | null
          duration_minutes?: number | null
          order_index?: number
          module_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          video_url?: string | null
          duration_minutes?: number | null
          order_index?: number
          module_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          id: string
          lesson_id: string
          author_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          author_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          author_id?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_files: {
        Row: {
          id: string
          lesson_id: string | null
          project_file_path: string | null
          samples_file_path: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          lesson_id?: string | null
          project_file_path?: string | null
          samples_file_path?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          lesson_id?: string | null
          project_file_path?: string | null
          samples_file_path?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_files_aula_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string | null
          completed: boolean | null
          progress_percentage: number | null
          watched_seconds: number | null
          last_viewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id?: string | null
          completed?: boolean | null
          progress_percentage?: number | null
          watched_seconds?: number | null
          last_viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string | null
          completed?: boolean | null
          progress_percentage?: number | null
          watched_seconds?: number | null
          last_viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progresso_aulas_aula_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          source: Database["public"]["Enums"]["enrollment_source"]
          granted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          source?: Database["public"]["Enums"]["enrollment_source"]
          granted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          source?: Database["public"]["Enums"]["enrollment_source"]
          granted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          id: string
          owner_id: string | null
          slug: string
          kind: Database["public"]["Enums"]["opportunity_kind"]
          title: string
          organization_name: string
          location: string
          engagement_type: string
          description: string
          requirements: string[]
          compensation: string | null
          external_url: string | null
          deadline_at: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          application_count: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          slug: string
          kind: Database["public"]["Enums"]["opportunity_kind"]
          title: string
          organization_name: string
          location?: string
          engagement_type: string
          description: string
          requirements?: string[]
          compensation?: string | null
          external_url?: string | null
          deadline_at?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          application_count?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          slug?: string
          kind?: Database["public"]["Enums"]["opportunity_kind"]
          title?: string
          organization_name?: string
          location?: string
          engagement_type?: string
          description?: string
          requirements?: string[]
          compensation?: string | null
          external_url?: string | null
          deadline_at?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          application_count?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunity_applications: {
        Row: {
          id: string
          opportunity_id: string
          applicant_id: string
          applicant_name_snapshot: string
          cover_letter: string
          portfolio_url: string | null
          status: Database["public"]["Enums"]["opportunity_application_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          opportunity_id: string
          applicant_id: string
          applicant_name_snapshot?: string
          cover_letter: string
          portfolio_url?: string | null
          status?: Database["public"]["Enums"]["opportunity_application_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          opportunity_id?: string
          applicant_id?: string
          applicant_name_snapshot?: string
          cover_letter?: string
          portfolio_url?: string | null
          status?: Database["public"]["Enums"]["opportunity_application_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [{
          foreignKeyName: "opportunity_applications_opportunity_id_fkey"
          columns: ["opportunity_id"]
          isOneToOne: false
          referencedRelation: "opportunities"
          referencedColumns: ["id"]
        }]
      }
      opportunity_favorites: {
        Row: { opportunity_id: string; user_id: string; created_at: string }
        Insert: { opportunity_id: string; user_id: string; created_at?: string }
        Update: { opportunity_id?: string; user_id?: string; created_at?: string }
        Relationships: [{
          foreignKeyName: "opportunity_favorites_opportunity_id_fkey"
          columns: ["opportunity_id"]
          isOneToOne: false
          referencedRelation: "opportunities"
          referencedColumns: ["id"]
        }]
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          avatar_url: string | null
          full_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          avatar_url?: string | null
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          avatar_url?: string | null
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount: number | null
          created_at: string
          expiry_date: string | null
          id: string
          payment_date: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      published_courses_preview: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          price_cents: number
          currency: string
        }
        Relationships: []
      }
    }
    Functions: {
      current_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_staff: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_enrolled: {
        Args: { target_course_id: string }
        Returns: boolean
      }
      is_course_staff: {
        Args: { target_course_id: string }
        Returns: boolean
      }
      user_has_paid_access: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      academy_content_status: "draft" | "published"
      course_status: "draft" | "published" | "archived"
      enrollment_status: "active" | "revoked"
      enrollment_source: "manual" | "stripe"
      opportunity_application_status: "submitted" | "reviewing" | "shortlisted" | "accepted" | "rejected" | "withdrawn"
      opportunity_kind: "job" | "collab" | "sync" | "grant" | "contest"
      opportunity_status: "draft" | "pending" | "open" | "closed" | "rejected"
      user_role: "student" | "instructor" | "producer" | "admin" | "super_admin"
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
      academy_content_status: ["draft", "published"],
      course_status: ["draft", "published", "archived"],
      enrollment_status: ["active", "revoked"],
      enrollment_source: ["manual", "stripe"],
      user_role: ["student", "instructor", "producer", "admin", "super_admin"],
    },
  },
} as const
