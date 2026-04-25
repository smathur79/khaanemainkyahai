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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      family_events: {
        Row: {
          category: Database["public"]["Enums"]["event_category"] | null
          created_at: string | null
          end_time: string | null
          event_date: string
          family_member_id: string | null
          household_id: string
          id: string
          is_all_day: boolean | null
          is_recurring: boolean | null
          location: string | null
          notes: string | null
          recurrence_rule: string | null
          start_time: string | null
          title: string
          travel_time_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["event_category"] | null
          created_at?: string | null
          end_time?: string | null
          event_date: string
          family_member_id?: string | null
          household_id: string
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          notes?: string | null
          recurrence_rule?: string | null
          start_time?: string | null
          title: string
          travel_time_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"] | null
          created_at?: string | null
          end_time?: string | null
          event_date?: string
          family_member_id?: string | null
          household_id?: string
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          notes?: string | null
          recurrence_rule?: string | null
          start_time?: string | null
          title?: string
          travel_time_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_events_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          dislikes: string[]
          email: string | null
          exclusions: string[]
          food_type: Database["public"]["Enums"]["food_type_pref"]
          household_id: string
          id: string
          label: Database["public"]["Enums"]["member_label"]
          likes: string[]
          name: string
          notes: string
          preferred_cuisines: string[]
          spice_level: Database["public"]["Enums"]["spice_level"]
        }
        Insert: {
          created_at?: string
          dislikes?: string[]
          email?: string | null
          exclusions?: string[]
          food_type?: Database["public"]["Enums"]["food_type_pref"]
          household_id: string
          id?: string
          label?: Database["public"]["Enums"]["member_label"]
          likes?: string[]
          name: string
          notes?: string
          preferred_cuisines?: string[]
          spice_level?: Database["public"]["Enums"]["spice_level"]
        }
        Update: {
          created_at?: string
          dislikes?: string[]
          email?: string | null
          exclusions?: string[]
          food_type?: Database["public"]["Enums"]["food_type_pref"]
          household_id?: string
          id?: string
          label?: Database["public"]["Enums"]["member_label"]
          likes?: string[]
          name?: string
          notes?: string
          preferred_cuisines?: string[]
          spice_level?: Database["public"]["Enums"]["spice_level"]
        }
        Relationships: [
          {
            foreignKeyName: "family_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_memberships: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_memberships_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          access_code: string
          created_at: string
          id: string
          name: string
          planner_code: string
          updated_at: string
        }
        Insert: {
          access_code?: string
          created_at?: string
          id?: string
          name: string
          planner_code?: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          id?: string
          name?: string
          planner_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      jokes: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          id: string
          question: string
        }
        Insert: {
          active?: boolean
          answer: string
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: []
      }
      meal_requests: {
        Row: {
          created_at: string
          created_by_user_id: string
          household_id: string
          id: string
          link: string
          request_type: Database["public"]["Enums"]["request_type"]
          requested_day: Database["public"]["Enums"]["day_of_week"] | null
          requested_meal_type: Database["public"]["Enums"]["meal_type"] | null
          status: Database["public"]["Enums"]["request_status"]
          text: string
          week_start_date: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          household_id: string
          id?: string
          link?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          requested_day?: Database["public"]["Enums"]["day_of_week"] | null
          requested_meal_type?: Database["public"]["Enums"]["meal_type"] | null
          status?: Database["public"]["Enums"]["request_status"]
          text?: string
          week_start_date?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          household_id?: string
          id?: string
          link?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          requested_day?: Database["public"]["Enums"]["day_of_week"] | null
          requested_meal_type?: Database["public"]["Enums"]["meal_type"] | null
          status?: Database["public"]["Enums"]["request_status"]
          text?: string
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      motivational_sayings: {
        Row: {
          active: boolean
          created_at: string
          id: string
          source: string | null
          text: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          source?: string | null
          text: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          source?: string | null
          text?: string
        }
        Relationships: []
      }
      prep_notes: {
        Row: {
          created_at: string
          created_by_user_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          household_id: string
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"] | null
          text: string
          weekly_plan_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          household_id: string
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"] | null
          text?: string
          weekly_plan_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          household_id?: string
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"] | null
          text?: string
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prep_notes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_notes_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          cuisine: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          effort: Database["public"]["Enums"]["effort_level"]
          favorite: boolean
          food_type: Database["public"]["Enums"]["recipe_food_type"]
          health_tag: Database["public"]["Enums"]["health_tag"]
          high_protein: boolean
          household_id: string
          id: string
          ingredients: string[]
          instructions: string
          is_link_only: boolean
          kid_friendly: boolean
          meal_types: Database["public"]["Enums"]["meal_type"][]
          mood_tag: string
          prep_time_minutes: number
          source: string
          source_link: string
          source_name: string
          sub_cuisine: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuisine?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          effort?: Database["public"]["Enums"]["effort_level"]
          favorite?: boolean
          food_type?: Database["public"]["Enums"]["recipe_food_type"]
          health_tag?: Database["public"]["Enums"]["health_tag"]
          high_protein?: boolean
          household_id: string
          id?: string
          ingredients?: string[]
          instructions?: string
          is_link_only?: boolean
          kid_friendly?: boolean
          meal_types?: Database["public"]["Enums"]["meal_type"][]
          mood_tag?: string
          prep_time_minutes?: number
          source?: string
          source_link?: string
          source_name?: string
          sub_cuisine?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuisine?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          effort?: Database["public"]["Enums"]["effort_level"]
          favorite?: boolean
          food_type?: Database["public"]["Enums"]["recipe_food_type"]
          health_tag?: Database["public"]["Enums"]["health_tag"]
          high_protein?: boolean
          household_id?: string
          id?: string
          ingredients?: string[]
          instructions?: string
          is_link_only?: boolean
          kid_friendly?: boolean
          meal_types?: Database["public"]["Enums"]["meal_type"][]
          mood_tag?: string
          prep_time_minutes?: number
          source?: string
          source_link?: string
          source_name?: string
          sub_cuisine?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_template_items: {
        Row: {
          id: string
          ritual_template_id: string
          sort_order: number
          text: string
        }
        Insert: {
          id?: string
          ritual_template_id: string
          sort_order?: number
          text?: string
        }
        Update: {
          id?: string
          ritual_template_id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_template_items_ritual_template_id_fkey"
            columns: ["ritual_template_id"]
            isOneToOne: false
            referencedRelation: "ritual_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_templates: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          ritual_type: Database["public"]["Enums"]["ritual_type"]
          title: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          ritual_type: Database["public"]["Enums"]["ritual_type"]
          title?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          ritual_type?: Database["public"]["Enums"]["ritual_type"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_templates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_meal_slot_items: {
        Row: {
          id: string
          notes: string
          portion_note: string
          recipe_id: string | null
          sort_order: number
          title: string
          weekly_meal_slot_id: string
        }
        Insert: {
          id?: string
          notes?: string
          portion_note?: string
          recipe_id?: string | null
          sort_order?: number
          title?: string
          weekly_meal_slot_id: string
        }
        Update: {
          id?: string
          notes?: string
          portion_note?: string
          recipe_id?: string | null
          sort_order?: number
          title?: string
          weekly_meal_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_meal_slot_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_meal_slot_items_weekly_meal_slot_id_fkey"
            columns: ["weekly_meal_slot_id"]
            isOneToOne: false
            referencedRelation: "weekly_meal_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_meal_slots: {
        Row: {
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          entry_type: Database["public"]["Enums"]["entry_type"]
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string
          weekly_plan_id: string
        }
        Insert: {
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string
          weekly_plan_id: string
        }
        Update: {
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_meal_slots_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_historical: boolean
          status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_historical?: boolean
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_historical?: boolean
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_template_slot_items: {
        Row: {
          id: string
          notes: string
          recipe_id: string | null
          sort_order: number
          title: string
          weekly_template_slot_id: string
        }
        Insert: {
          id?: string
          notes?: string
          recipe_id?: string | null
          sort_order?: number
          title?: string
          weekly_template_slot_id: string
        }
        Update: {
          id?: string
          notes?: string
          recipe_id?: string | null
          sort_order?: number
          title?: string
          weekly_template_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_template_slot_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_template_slot_items_weekly_template_slot_id_fkey"
            columns: ["weekly_template_slot_id"]
            isOneToOne: false
            referencedRelation: "weekly_template_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_template_slots: {
        Row: {
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          entry_type: Database["public"]["Enums"]["entry_type"]
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string
          weekly_template_id: string
        }
        Insert: {
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string
          weekly_template_id: string
        }
        Update: {
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string
          weekly_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_template_slots_weekly_template_id_fkey"
            columns: ["weekly_template_id"]
            isOneToOne: false
            referencedRelation: "weekly_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_templates: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_templates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_access_code: { Args: never; Returns: string }
      get_user_household_id: { Args: { _user_id: string }; Returns: string }
      user_in_household: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_planner: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      day_of_week:
        | "Monday"
        | "Tuesday"
        | "Wednesday"
        | "Thursday"
        | "Friday"
        | "Saturday"
        | "Sunday"
      difficulty_level: "Easy" | "Medium" | "Hard"
      effort_level: "quick" | "medium" | "weekend"
      entry_type: "cooked" | "order_in" | "leftovers" | "eat_out"
      event_category:
        | "medical"
        | "school"
        | "activity"
        | "social"
        | "travel"
        | "other"
      food_type_pref:
        | "Vegetarian"
        | "Eggetarian"
        | "Non-Vegetarian"
        | "Vegan"
        | "Other"
      health_tag: "healthy" | "balanced" | "indulgent"
      household_role: "planner" | "requestor_viewer"
      meal_type:
        | "breakfast"
        | "lunch"
        | "dinner"
        | "snack"
        | "smoothie"
        | "dessert"
      member_label: "Parent" | "Kid" | "Other"
      plan_status: "draft" | "finalized"
      recipe_food_type: "vegan" | "vegetarian" | "egg" | "chicken" | "fish"
      request_status: "open" | "reviewed" | "added" | "dismissed"
      request_type: "meal_request" | "recipe_link" | "order_in_request"
      ritual_type: "morning" | "night"
      spice_level: "Low" | "Medium" | "High"
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
      day_of_week: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      difficulty_level: ["Easy", "Medium", "Hard"],
      effort_level: ["quick", "medium", "weekend"],
      entry_type: ["cooked", "order_in", "leftovers", "eat_out"],
      event_category: [
        "medical",
        "school",
        "activity",
        "social",
        "travel",
        "other",
      ],
      food_type_pref: [
        "Vegetarian",
        "Eggetarian",
        "Non-Vegetarian",
        "Vegan",
        "Other",
      ],
      health_tag: ["healthy", "balanced", "indulgent"],
      household_role: ["planner", "requestor_viewer"],
      meal_type: [
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "smoothie",
        "dessert",
      ],
      member_label: ["Parent", "Kid", "Other"],
      plan_status: ["draft", "finalized"],
      recipe_food_type: ["vegan", "vegetarian", "egg", "chicken", "fish"],
      request_status: ["open", "reviewed", "added", "dismissed"],
      request_type: ["meal_request", "recipe_link", "order_in_request"],
      ritual_type: ["morning", "night"],
      spice_level: ["Low", "Medium", "High"],
    },
  },
} as const
