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
      alertas_configuracao: {
        Row: {
          ativo: boolean
          dias_antes: number
          documento_id: string
          id: string
          usuario_id: string
          via_email: boolean
        }
        Insert: {
          ativo?: boolean
          dias_antes: number
          documento_id: string
          id?: string
          usuario_id: string
          via_email?: boolean
        }
        Update: {
          ativo?: boolean
          dias_antes?: number
          documento_id?: string
          id?: string
          usuario_id?: string
          via_email?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "alertas_configuracao_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          apelido: string | null
          atualizado_em: string
          criado_em: string
          data_emissao: string | null
          data_vencimento: string
          extra: Json | null
          file_url: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          ocr_data: Json | null
          resolvido: boolean
          status: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          apelido?: string | null
          atualizado_em?: string
          criado_em?: string
          data_emissao?: string | null
          data_vencimento: string
          extra?: Json | null
          file_url?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          ocr_data?: Json | null
          resolvido?: boolean
          status?: string
          tipo: string
          usuario_id: string
        }
        Update: {
          apelido?: string | null
          atualizado_em?: string
          criado_em?: string
          data_emissao?: string | null
          data_vencimento?: string
          extra?: Json | null
          file_url?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          ocr_data?: Json | null
          resolvido?: boolean
          status?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          atualizado_em: string
          content: string | null
          criado_em: string
          days_before_expiry: number | null
          documento_id: string | null
          id: string
          notification_type: string
          scheduled_date: string
          sent_date: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          content?: string | null
          criado_em?: string
          days_before_expiry?: number | null
          documento_id?: string | null
          id?: string
          notification_type?: string
          scheduled_date: string
          sent_date?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          content?: string | null
          criado_em?: string
          days_before_expiry?: number | null
          documento_id?: string | null
          id?: string
          notification_type?: string
          scheduled_date?: string
          sent_date?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          atualizado_em: string
          criado_em: string
          currency: string
          id: string
          invoice_url: string | null
          payment_method: string | null
          status: string
          stripe_payment_id: string | null
          usuario_id: string
        }
        Insert: {
          amount?: number
          atualizado_em?: string
          criado_em?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          payment_method?: string | null
          status?: string
          stripe_payment_id?: string | null
          usuario_id: string
        }
        Update: {
          amount?: number
          atualizado_em?: string
          criado_em?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          payment_method?: string | null
          status?: string
          stripe_payment_id?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string | null
          plan_type: string
          stripe_customer_id: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string | null
          plan_type?: string
          stripe_customer_id?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string | null
          plan_type?: string
          stripe_customer_id?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          criado_em: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          criado_em?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          criado_em?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          criado_em: string
          id: string
          referred_id: string
          referrer_id: string
          reward_months: number
          status: string
        }
        Insert: {
          criado_em?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_months?: number
          status?: string
        }
        Update: {
          criado_em?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_months?: number
          status?: string
        }
        Relationships: []
      }
      renovacoes: {
        Row: {
          criado_em: string
          custo_renovacao: number | null
          data_renovacao: string
          documento_id: string
          id: string
          multa_evitada: number | null
          observacoes: string | null
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          custo_renovacao?: number | null
          data_renovacao?: string
          documento_id: string
          id?: string
          multa_evitada?: number | null
          observacoes?: string | null
          usuario_id: string
        }
        Update: {
          criado_em?: string
          custo_renovacao?: number | null
          data_renovacao?: string
          documento_id?: string
          id?: string
          multa_evitada?: number | null
          observacoes?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renovacoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          atualizado_em: string
          auto_renew: boolean
          criado_em: string
          end_date: string | null
          id: string
          plan_type: string
          start_date: string
          status: string
          stripe_subscription_id: string | null
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          auto_renew?: boolean
          criado_em?: string
          end_date?: string | null
          id?: string
          plan_type?: string
          start_date?: string
          status?: string
          stripe_subscription_id?: string | null
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          auto_renew?: boolean
          criado_em?: string
          end_date?: string | null
          id?: string
          plan_type?: string
          start_date?: string
          status?: string
          stripe_subscription_id?: string | null
          usuario_id?: string
        }
        Relationships: []
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
