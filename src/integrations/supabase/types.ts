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
      academy_content_attachments: {
        Row: {
          content_id: string
          created_at: string
          file_url: string
          id: string
          mime_type: string
          name: string
          size: number
        }
        Insert: {
          content_id: string
          created_at?: string
          file_url: string
          id?: string
          mime_type: string
          name: string
          size: number
        }
        Update: {
          content_id?: string
          created_at?: string
          file_url?: string
          id?: string
          mime_type?: string
          name?: string
          size?: number
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
      academy_contents: {
        Row: {
          banner_url: string | null
          body: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["academy_content_status"]
          subtitle: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_file_name: string | null
          video_mime_type: string | null
          video_size: number | null
          video_url: string | null
        }
        Insert: {
          banner_url?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["academy_content_status"]
          subtitle?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_file_name?: string | null
          video_mime_type?: string | null
          video_size?: number | null
          video_url?: string | null
        }
        Update: {
          banner_url?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["academy_content_status"]
          subtitle?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_file_name?: string | null
          video_mime_type?: string | null
          video_size?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      account_capabilities: {
        Row: {
          activated_at: string | null
          approved_at: string | null
          capability: string
          created_at: string
          is_default: boolean
          metadata: Json
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          approved_at?: string | null
          capability: string
          created_at?: string
          is_default?: boolean
          metadata?: Json
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          approved_at?: string | null
          capability?: string
          created_at?: string
          is_default?: boolean
          metadata?: Json
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name_snapshot: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          is_demo: boolean
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name_snapshot?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          is_demo?: boolean
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name_snapshot?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          is_demo?: boolean
          metadata?: Json
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount_cents: number
          available_at: string | null
          conversion_id: string | null
          created_at: string
          id: string
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          available_at?: string | null
          conversion_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          available_at?: string | null
          conversion_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: true
            referencedRelation: "affiliate_conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          affiliate_link_id: string | null
          approved_at: string | null
          commission_amount_cents: number
          converted_at: string
          created_at: string
          customer_reference: string | null
          gross_amount_cents: number
          id: string
          order_id: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          affiliate_link_id?: string | null
          approved_at?: string | null
          commission_amount_cents: number
          converted_at?: string
          created_at?: string
          customer_reference?: string | null
          gross_amount_cents: number
          id?: string
          order_id?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          affiliate_link_id?: string | null
          approved_at?: string | null
          commission_amount_cents?: number
          converted_at?: string
          created_at?: string
          customer_reference?: string | null
          gross_amount_cents?: number
          id?: string
          order_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          active: boolean
          affiliate_id: string
          clicks_count: number
          conversions_count: number
          created_at: string
          destination_url: string
          id: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_id: string
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          destination_url: string
          id?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_id?: string
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          destination_url?: string
          id?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_marketing_materials: {
        Row: {
          active: boolean
          asset_url: string | null
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          material_type: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          asset_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          material_type: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          asset_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          material_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_profiles: {
        Row: {
          balance_cents: number
          commission_rate: number
          created_at: string
          display_name: string
          id: string
          is_demo: boolean
          lifetime_earnings_cents: number
          referral_code: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance_cents?: number
          commission_rate?: number
          created_at?: string
          display_name: string
          id?: string
          is_demo?: boolean
          lifetime_earnings_cents?: number
          referral_code: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance_cents?: number
          commission_rate?: number
          created_at?: string
          display_name?: string
          id?: string
          is_demo?: boolean
          lifetime_earnings_cents?: number
          referral_code?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          approved_at: string | null
          buyer_id: string
          commission_bps: number
          commission_cents: number
          created_at: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["affiliate_commission_status"]
        }
        Insert: {
          affiliate_id: string
          approved_at?: string | null
          buyer_id: string
          commission_bps: number
          commission_cents: number
          created_at?: string
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["affiliate_commission_status"]
        }
        Update: {
          affiliate_id?: string
          approved_at?: string | null
          buyer_id?: string
          commission_bps?: number
          commission_cents?: number
          created_at?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["affiliate_commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "beat_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_withdrawal_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          affiliate_id: string
          created_at: string
          from_status: string | null
          id: string
          to_status: string
          withdrawal_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          affiliate_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          to_status: string
          withdrawal_id: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          affiliate_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          to_status?: string
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_withdrawal_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_withdrawal_events_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "affiliate_withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_withdrawals: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string | null
          processed_at: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          approved_at: string | null
          code: string
          commission_bps: number
          created_at: string
          id: string
          status: Database["public"]["Enums"]["affiliate_status"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          code: string
          commission_bps?: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          code?: string
          commission_bps?: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          user_id?: string
        }
        Relationships: []
      }
      api_idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          request_hash: string
          response_body: Json | null
          response_status: number | null
          scope: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          request_hash: string
          response_body?: Json | null
          response_status?: number | null
          scope: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string
          response_body?: Json | null
          response_status?: number | null
          scope?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_rate_limit_windows: {
        Row: {
          actor_hash: string
          request_count: number
          route_key: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          actor_hash: string
          request_count?: number
          route_key: string
          updated_at?: string
          window_started_at: string
        }
        Update: {
          actor_hash?: string
          request_count?: number
          route_key?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      beat_copyright_evidence: {
        Row: {
          beat_id: string
          content_hash: string
          document_url: string | null
          evidence_code: string
          generated_at: string
          id: string
          metadata: Json
          producer_id: string
        }
        Insert: {
          beat_id: string
          content_hash: string
          document_url?: string | null
          evidence_code: string
          generated_at?: string
          id?: string
          metadata?: Json
          producer_id: string
        }
        Update: {
          beat_id?: string
          content_hash?: string
          document_url?: string | null
          evidence_code?: string
          generated_at?: string
          id?: string
          metadata?: Json
          producer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_copyright_evidence_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_deliveries: {
        Row: {
          created_at: string
          download_count: number
          downloaded_at: string | null
          expires_at: string | null
          file_label: string
          file_path: string
          id: string
          purchase_id: string
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          downloaded_at?: string | null
          expires_at?: string | null
          file_label: string
          file_path: string
          id?: string
          purchase_id: string
          storage_bucket: string
          storage_path: string
        }
        Update: {
          created_at?: string
          download_count?: number
          downloaded_at?: string | null
          expires_at?: string | null
          file_label?: string
          file_path?: string
          id?: string
          purchase_id?: string
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_deliveries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "beat_license_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_events: {
        Row: {
          beat_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          beat_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          beat_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beat_events_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_license_purchases: {
        Row: {
          beat_id: string
          beat_order_item_id: string
          buyer_id: string
          contract_hash: string
          contract_number: string
          document_download_count: number
          document_downloaded_at: string | null
          id: string
          issued_at: string
          license_document_url: string | null
          license_id: string
          license_snapshot: Json
          order_item_id: string
          producer_id: string
          receipt_url: string | null
          status: Database["public"]["Enums"]["beat_purchase_status"]
        }
        Insert: {
          beat_id: string
          beat_order_item_id: string
          buyer_id: string
          contract_hash: string
          contract_number: string
          document_download_count?: number
          document_downloaded_at?: string | null
          id?: string
          issued_at?: string
          license_document_url?: string | null
          license_id: string
          license_snapshot?: Json
          order_item_id: string
          producer_id: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["beat_purchase_status"]
        }
        Update: {
          beat_id?: string
          beat_order_item_id?: string
          buyer_id?: string
          contract_hash?: string
          contract_number?: string
          document_download_count?: number
          document_downloaded_at?: string | null
          id?: string
          issued_at?: string
          license_document_url?: string | null
          license_id?: string
          license_snapshot?: Json
          order_item_id?: string
          producer_id?: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["beat_purchase_status"]
        }
        Relationships: [
          {
            foreignKeyName: "beat_license_purchases_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_purchases_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "beat_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_purchases_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "beat_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_license_templates: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          currency: string
          deliverables: Json
          description: string | null
          id: string
          is_demo: boolean
          is_exclusive: boolean
          license_type: string
          max_copies: number | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          usage_rights: Json
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deliverables?: Json
          description?: string | null
          id?: string
          is_demo?: boolean
          is_exclusive?: boolean
          license_type: string
          max_copies?: number | null
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
          usage_rights?: Json
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deliverables?: Json
          description?: string | null
          id?: string
          is_demo?: boolean
          is_exclusive?: boolean
          license_type?: string
          max_copies?: number | null
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          usage_rights?: Json
        }
        Relationships: []
      }
      beat_licenses: {
        Row: {
          available: boolean
          beat_id: string
          created_at: string
          currency: string
          deliverables: Json
          id: string
          is_exclusive: boolean
          license_contract_file_name: string | null
          license_contract_mime_type: string | null
          license_contract_path: string | null
          license_contract_size_bytes: number | null
          license_contract_updated_at: string | null
          license_type: string
          max_copies: number | null
          name: string
          price_cents: number
          updated_at: string
          usage_rights: Json
        }
        Insert: {
          available?: boolean
          beat_id: string
          created_at?: string
          currency?: string
          deliverables?: Json
          id?: string
          is_exclusive?: boolean
          license_contract_file_name?: string | null
          license_contract_mime_type?: string | null
          license_contract_path?: string | null
          license_contract_size_bytes?: number | null
          license_contract_updated_at?: string | null
          license_type: string
          max_copies?: number | null
          name: string
          price_cents: number
          updated_at?: string
          usage_rights?: Json
        }
        Update: {
          available?: boolean
          beat_id?: string
          created_at?: string
          currency?: string
          deliverables?: Json
          id?: string
          is_exclusive?: boolean
          license_contract_file_name?: string | null
          license_contract_mime_type?: string | null
          license_contract_path?: string | null
          license_contract_size_bytes?: number | null
          license_contract_updated_at?: string | null
          license_type?: string
          max_copies?: number | null
          name?: string
          price_cents?: number
          updated_at?: string
          usage_rights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "beat_licenses_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_order_items: {
        Row: {
          amount_cents: number
          beat_id: string
          beat_title_snapshot: string
          buyer_id: string | null
          buyer_name_snapshot: string
          created_at: string
          currency: string
          id: string
          license_id: string
          license_name_snapshot: string
          list_price_cents: number
          order_id: string
          paid_at: string | null
          producer_id: string
          status: string
        }
        Insert: {
          amount_cents: number
          beat_id: string
          beat_title_snapshot: string
          buyer_id?: string | null
          buyer_name_snapshot?: string
          created_at?: string
          currency?: string
          id?: string
          license_id: string
          license_name_snapshot: string
          list_price_cents: number
          order_id: string
          paid_at?: string | null
          producer_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          beat_id?: string
          beat_title_snapshot?: string
          buyer_id?: string | null
          buyer_name_snapshot?: string
          created_at?: string
          currency?: string
          id?: string
          license_id?: string
          license_name_snapshot?: string
          list_price_cents?: number
          order_id?: string
          paid_at?: string | null
          producer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_order_items_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_order_items_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "beat_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "beat_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_orders: {
        Row: {
          affiliate_id: string | null
          amount_cents: number
          buyer_id: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          discount_cents: number
          financial_state: Database["public"]["Enums"]["beat_order_financial_state"]
          id: string
          is_demo: boolean
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_reference: string | null
          provider_session_id: string | null
          status: string
          subtotal_cents: number
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          amount_cents?: number
          buyer_id?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          financial_state?: Database["public"]["Enums"]["beat_order_financial_state"]
          id?: string
          is_demo?: boolean
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          subtotal_cents?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          amount_cents?: number
          buyer_id?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          financial_state?: Database["public"]["Enums"]["beat_order_financial_state"]
          id?: string
          is_demo?: boolean
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          subtotal_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      beats: {
        Row: {
          bpm: number | null
          copyright_evidence_id: string | null
          copyright_status: Database["public"]["Enums"]["beat_copyright_status"]
          cover_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          exclusive_available: boolean
          genre: string
          id: string
          is_demo: boolean
          master_file_path: string | null
          mood: string | null
          musical_key: string | null
          preview_file_path: string | null
          producer_id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["beat_status"]
          stems_file_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bpm?: number | null
          copyright_evidence_id?: string | null
          copyright_status?: Database["public"]["Enums"]["beat_copyright_status"]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          exclusive_available?: boolean
          genre: string
          id?: string
          is_demo?: boolean
          master_file_path?: string | null
          mood?: string | null
          musical_key?: string | null
          preview_file_path?: string | null
          producer_id: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["beat_status"]
          stems_file_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bpm?: number | null
          copyright_evidence_id?: string | null
          copyright_status?: Database["public"]["Enums"]["beat_copyright_status"]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          exclusive_available?: boolean
          genre?: string
          id?: string
          is_demo?: boolean
          master_file_path?: string | null
          mood?: string | null
          musical_key?: string | null
          preview_file_path?: string | null
          producer_id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["beat_status"]
          stems_file_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          availability: string
          bio: string | null
          city: string | null
          created_at: string
          experience_years: number
          headline: string | null
          is_demo: boolean
          portfolio_url: string | null
          preferred_roles: string[]
          resume_url: string | null
          skills: string[]
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string
          bio?: string | null
          city?: string | null
          created_at?: string
          experience_years?: number
          headline?: string | null
          is_demo?: boolean
          portfolio_url?: string | null
          preferred_roles?: string[]
          resume_url?: string | null
          skills?: string[]
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string
          bio?: string | null
          city?: string | null
          created_at?: string
          experience_years?: number
          headline?: string | null
          is_demo?: boolean
          portfolio_url?: string | null
          preferred_roles?: string[]
          resume_url?: string | null
          skills?: string[]
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cms_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          document_id: string
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          document_id: string
          id?: string
          position: number
          updated_at?: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          document_id?: string
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_blocks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "cms_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_documents: {
        Row: {
          author_id: string | null
          author_name_snapshot: string
          body: string
          canonical_url: string | null
          category: string | null
          created_at: string
          document_type: Database["public"]["Enums"]["cms_document_type"]
          excerpt: string
          id: string
          is_demo: boolean
          is_featured: boolean
          is_premium: boolean
          level: string | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          published_at: string | null
          read_minutes: number
          related_slugs: string[]
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_document_status"]
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name_snapshot?: string
          body?: string
          canonical_url?: string | null
          category?: string | null
          created_at?: string
          document_type: Database["public"]["Enums"]["cms_document_type"]
          excerpt?: string
          id?: string
          is_demo?: boolean
          is_featured?: boolean
          is_premium?: boolean
          level?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          published_at?: string | null
          read_minutes?: number
          related_slugs?: string[]
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["cms_document_status"]
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name_snapshot?: string
          body?: string
          canonical_url?: string | null
          category?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["cms_document_type"]
          excerpt?: string
          id?: string
          is_demo?: boolean
          is_featured?: boolean
          is_premium?: boolean
          level?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          published_at?: string | null
          read_minutes?: number
          related_slugs?: string[]
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_document_status"]
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_media: {
        Row: {
          alt_text: string
          created_at: string
          height: number | null
          id: string
          mime_type: string
          public_url: string
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          public_url: string
          size_bytes: number
          storage_path: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          public_url?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      cms_revisions: {
        Row: {
          created_at: string
          document_id: string
          editor_id: string | null
          id: string
          revision_number: number
          snapshot: Json
        }
        Insert: {
          created_at?: string
          document_id: string
          editor_id?: string | null
          id?: string
          revision_number: number
          snapshot: Json
        }
        Update: {
          created_at?: string
          document_id?: string
          editor_id?: string | null
          id?: string
          revision_number?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cms_revisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "cms_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          id: string
          is_demo: boolean
          metadata: Json
          order_id: string | null
          order_item_id: string | null
          resource_id: string
          resource_type: string
          revoke_reason: string | null
          revoked_at: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          is_demo?: boolean
          metadata?: Json
          order_id?: string | null
          order_item_id?: string | null
          resource_id: string
          resource_type: string
          revoke_reason?: string | null
          revoked_at?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          is_demo?: boolean
          metadata?: Json
          order_id?: string | null
          order_item_id?: string | null
          resource_id?: string
          resource_type?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_entitlements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_offer_prices: {
        Row: {
          amount_cents: number
          approved_by: string | null
          commercial_snapshot: Json
          compare_at_cents: number | null
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_until: string | null
          id: string
          offer_id: string
          published_at: string | null
          status: string
          version: number
        }
        Insert: {
          amount_cents: number
          approved_by?: string | null
          commercial_snapshot?: Json
          compare_at_cents?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          offer_id: string
          published_at?: string | null
          status?: string
          version: number
        }
        Update: {
          amount_cents?: number
          approved_by?: string | null
          commercial_snapshot?: Json
          compare_at_cents?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          offer_id?: string
          published_at?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commerce_offer_prices_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "commerce_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_offers: {
        Row: {
          access_duration_days: number | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          is_demo: boolean
          metadata: Json
          resource_id: string
          resource_type: string
          seller_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_duration_days?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          metadata?: Json
          resource_id: string
          resource_type: string
          seller_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_duration_days?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          metadata?: Json
          resource_id?: string
          resource_type?: string
          seller_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      commerce_order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          order_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          order_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_order_items: {
        Row: {
          affiliate_commission_bps: number
          affiliate_commission_cents: number
          affiliate_id: string | null
          commercial_snapshot: Json
          created_at: string
          discount_cents: number
          gross_amount_cents: number
          id: string
          offer_id: string | null
          offer_price_id: string | null
          order_id: string
          platform_commission_bps: number
          platform_commission_cents: number
          quantity: number
          resource_id: string
          resource_type: string
          seller_id: string | null
          seller_net_cents: number
          source_item_id: string | null
          source_item_kind: string | null
          title_snapshot: string
          unit_amount_cents: number
        }
        Insert: {
          affiliate_commission_bps?: number
          affiliate_commission_cents?: number
          affiliate_id?: string | null
          commercial_snapshot?: Json
          created_at?: string
          discount_cents?: number
          gross_amount_cents: number
          id?: string
          offer_id?: string | null
          offer_price_id?: string | null
          order_id: string
          platform_commission_bps?: number
          platform_commission_cents?: number
          quantity?: number
          resource_id: string
          resource_type: string
          seller_id?: string | null
          seller_net_cents?: number
          source_item_id?: string | null
          source_item_kind?: string | null
          title_snapshot: string
          unit_amount_cents: number
        }
        Update: {
          affiliate_commission_bps?: number
          affiliate_commission_cents?: number
          affiliate_id?: string | null
          commercial_snapshot?: Json
          created_at?: string
          discount_cents?: number
          gross_amount_cents?: number
          id?: string
          offer_id?: string | null
          offer_price_id?: string | null
          order_id?: string
          platform_commission_bps?: number
          platform_commission_cents?: number
          quantity?: number
          resource_id?: string
          resource_type?: string
          seller_id?: string | null
          seller_net_cents?: number
          source_item_id?: string | null
          source_item_kind?: string | null
          title_snapshot?: string
          unit_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "commerce_order_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "commerce_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_offer_price_id_fkey"
            columns: ["offer_price_id"]
            isOneToOne: false
            referencedRelation: "commerce_offer_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_orders: {
        Row: {
          buyer_id: string | null
          canceled_at: string | null
          checkout_snapshot: Json
          created_at: string
          currency: string
          discount_cents: number
          id: string
          idempotency_key: string | null
          is_demo: boolean
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          refunded_at: string | null
          source_order_id: string | null
          source_order_kind: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          canceled_at?: string | null
          checkout_snapshot?: Json
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          idempotency_key?: string | null
          is_demo?: boolean
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          refunded_at?: string | null
          source_order_id?: string | null
          source_order_kind?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          canceled_at?: string | null
          checkout_snapshot?: Json
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          idempotency_key?: string | null
          is_demo?: boolean
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          refunded_at?: string | null
          source_order_id?: string | null
          source_order_kind?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      commercial_parameter_versions: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          parameter_id: string
          published_at: string | null
          status: string
          value: Json
          version: number
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          parameter_id: string
          published_at?: string | null
          status?: string
          value: Json
          version: number
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          parameter_id?: string
          published_at?: string | null
          status?: string
          value?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_parameter_versions_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "commercial_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_parameters: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_demo: boolean
          key: string
          label: string
          scope_id: string | null
          scope_type: string
          status: string
          updated_at: string
          value_type: string
          visibility: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          key: string
          label: string
          scope_id?: string | null
          scope_type?: string
          status?: string
          updated_at?: string
          value_type: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          key?: string
          label?: string
          scope_id?: string | null
          scope_type?: string
          status?: string
          updated_at?: string
          value_type?: string
          visibility?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          author_id: string
          author_name_snapshot: string
          content: string
          created_at: string
          id: string
          is_demo: boolean
          parent_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["community_content_status"]
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name_snapshot?: string
          content: string
          created_at?: string
          id?: string
          is_demo?: boolean
          parent_id?: string | null
          post_id: string
          status?: Database["public"]["Enums"]["community_content_status"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name_snapshot?: string
          content?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          parent_id?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["community_content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_group_members: {
        Row: {
          group_id: string
          joined_at: string
          member_role: Database["public"]["Enums"]["community_member_role"]
          status: Database["public"]["Enums"]["community_member_status"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          member_role?: Database["public"]["Enums"]["community_member_role"]
          status?: Database["public"]["Enums"]["community_member_status"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          member_role?: Database["public"]["Enums"]["community_member_role"]
          status?: Database["public"]["Enums"]["community_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      community_groups: {
        Row: {
          created_at: string
          description: string
          id: string
          is_demo: boolean
          member_count: number
          name: string
          owner_id: string
          slug: string
          status: Database["public"]["Enums"]["community_group_status"]
          updated_at: string
          visibility: Database["public"]["Enums"]["community_group_visibility"]
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_demo?: boolean
          member_count?: number
          name: string
          owner_id: string
          slug: string
          status?: Database["public"]["Enums"]["community_group_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_group_visibility"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_demo?: boolean
          member_count?: number
          name?: string
          owner_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["community_group_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_group_visibility"]
        }
        Relationships: []
      }
      community_moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          reason: string
          report_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          reason: string
          report_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string
          report_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "community_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          author_name_snapshot: string
          author_role_snapshot: string
          comment_count: number
          content: string
          created_at: string
          group_id: string | null
          id: string
          is_demo: boolean
          like_count: number
          status: Database["public"]["Enums"]["community_content_status"]
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name_snapshot?: string
          author_role_snapshot?: string
          comment_count?: number
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_demo?: boolean
          like_count?: number
          status?: Database["public"]["Enums"]["community_content_status"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name_snapshot?: string
          author_role_snapshot?: string
          comment_count?: number
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_demo?: boolean
          like_count?: number
          status?: Database["public"]["Enums"]["community_content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["community_report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["community_report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["community_report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      company_credit_events: {
        Row: {
          balance_after: number
          company_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          lot_id: string | null
          metadata: Json
          opportunity_id: string | null
          quantity: number
          reference: string | null
        }
        Insert: {
          balance_after: number
          company_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          lot_id?: string | null
          metadata?: Json
          opportunity_id?: string | null
          quantity: number
          reference?: string | null
        }
        Update: {
          balance_after?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          lot_id?: string | null
          metadata?: Json
          opportunity_id?: string | null
          quantity?: number
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_credit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_credit_balances"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_credit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_credit_events_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "company_credit_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_credit_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      company_credit_lots: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string
          id: string
          is_demo: boolean
          pack_id: string | null
          purchased_credits: number
          remaining_credits: number
          source_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          is_demo?: boolean
          pack_id?: string | null
          purchased_credits: number
          remaining_credits: number
          source_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_demo?: boolean
          pack_id?: string | null
          purchased_credits?: number
          remaining_credits?: number
          source_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_credit_lots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_credit_balances"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_credit_lots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_credit_lots_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "job_credit_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          member_role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          member_role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          member_role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_credit_balances"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          city: string | null
          country: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          industry: string | null
          is_demo: boolean
          legal_name: string | null
          logo_url: string | null
          owner_user_id: string
          slug: string
          state: string | null
          updated_at: string
          verification_status: string
          website_url: string | null
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          industry?: string | null
          is_demo?: boolean
          legal_name?: string | null
          logo_url?: string | null
          owner_user_id: string
          slug: string
          state?: string | null
          updated_at?: string
          verification_status?: string
          website_url?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          industry?: string | null
          is_demo?: boolean
          legal_name?: string | null
          logo_url?: string | null
          owner_user_id?: string
          slug?: string
          state?: string | null
          updated_at?: string
          verification_status?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_demo: boolean
          message: string
          name: string
          source: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_demo?: boolean
          message: string
          name: string
          source?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_demo?: boolean
          message?: string
          name?: string
          source?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_cents: number
          id: string
          order_id: string
          redeemed_at: string | null
          status: Database["public"]["Enums"]["promotion_reservation_status"]
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_cents: number
          id?: string
          order_id: string
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["promotion_reservation_status"]
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_cents?: number
          id?: string
          order_id?: string
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["promotion_reservation_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "beat_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          certificate_code: string
          course_id: string
          course_title_snapshot: string
          created_at: string
          enrollment_id: string
          id: string
          is_demo: boolean
          issued_at: string
          metadata: Json
          revoked_at: string | null
          revoked_reason: string | null
          student_name_snapshot: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_code: string
          course_id: string
          course_title_snapshot: string
          created_at?: string
          enrollment_id: string
          id?: string
          is_demo?: boolean
          issued_at?: string
          metadata?: Json
          revoked_at?: string | null
          revoked_reason?: string | null
          student_name_snapshot: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_code?: string
          course_id?: string
          course_title_snapshot?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          is_demo?: boolean
          issued_at?: string
          metadata?: Json
          revoked_at?: string | null
          revoked_reason?: string | null
          student_name_snapshot?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "published_courses_preview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
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
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "published_courses_preview"
            referencedColumns: ["id"]
          },
        ]
      }
      course_order_items: {
        Row: {
          amount_cents: number
          course_id: string
          course_title_snapshot: string
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string | null
        }
        Insert: {
          amount_cents?: number
          course_id: string
          course_title_snapshot: string
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          paid_at?: string | null
        }
        Update: {
          amount_cents?: number
          course_id?: string
          course_title_snapshot?: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_order_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_order_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "published_courses_preview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "course_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      course_orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          is_demo: boolean
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_reference: string | null
          provider_session_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          is_demo?: boolean
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          is_demo?: boolean
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_reviews: {
        Row: {
          comment: string
          course_id: string
          created_at: string
          id: string
          instructor_response: string | null
          is_demo: boolean
          rating: number
          responded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          course_id: string
          created_at?: string
          id?: string
          instructor_response?: string | null
          is_demo?: boolean
          rating: number
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          course_id?: string
          created_at?: string
          id?: string
          instructor_response?: string | null
          is_demo?: boolean
          rating?: number
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "published_courses_preview"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: string | null
          discount_cents: number
          id: string
          instructor_id: string | null
          is_demo: boolean
          original_price_cents: number
          price_cents: number
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_cents?: number
          id?: string
          instructor_id?: string | null
          is_demo?: boolean
          original_price_cents?: number
          price_cents?: number
          published_at?: string | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_cents?: number
          id?: string
          instructor_id?: string | null
          is_demo?: boolean
          original_price_cents?: number
          price_cents?: number
          published_at?: string | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      digital_product_order_items: {
        Row: {
          amount_cents: number
          buyer_id: string | null
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string | null
          product_id: string
          product_title_snapshot: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_id?: string | null
          created_at?: string
          currency: string
          id?: string
          order_id: string
          paid_at?: string | null
          product_id: string
          product_title_snapshot: string
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          product_id?: string
          product_title_snapshot?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "digital_product_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_orders: {
        Row: {
          amount_cents: number
          buyer_id: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string | null
          is_demo: boolean
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_reference: string | null
          provider_session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string | null
          is_demo?: boolean
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string | null
          is_demo?: boolean
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          id: string
          is_demo: boolean
          maximum_discount_cents: number | null
          minimum_amount_cents: number
          per_user_limit: number
          starts_at: string
          updated_at: string
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          maximum_discount_cents?: number | null
          minimum_amount_cents?: number
          per_user_limit?: number
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          maximum_discount_cents?: number | null
          minimum_amount_cents?: number
          per_user_limit?: number
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          enrolled_at: string
          granted_by: string | null
          id: string
          source: Database["public"]["Enums"]["enrollment_source"]
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrolled_at?: string
          granted_by?: string | null
          id?: string
          source?: Database["public"]["Enums"]["enrollment_source"]
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrolled_at?: string
          granted_by?: string | null
          id?: string
          source?: Database["public"]["Enums"]["enrollment_source"]
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "published_courses_preview"
            referencedColumns: ["id"]
          },
        ]
      }
      event_agenda_items: {
        Row: {
          event_id: string
          id: string
          position: number
          starts_at: string
          title: string
        }
        Insert: {
          event_id: string
          id?: string
          position: number
          starts_at: string
          title: string
        }
        Update: {
          event_id?: string
          id?: string
          position?: number
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_agenda_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_certificates: {
        Row: {
          event_id: string
          id: string
          issued_at: string
          user_id: string
          verification_code: string
        }
        Insert: {
          event_id: string
          id?: string
          issued_at?: string
          user_id: string
          verification_code?: string
        }
        Update: {
          event_id?: string
          id?: string
          issued_at?: string
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attended_at: string | null
          attendee_name_snapshot: string
          event_id: string
          registered_at: string
          status: Database["public"]["Enums"]["event_registration_status"]
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          attendee_name_snapshot?: string
          event_id: string
          registered_at?: string
          status?: Database["public"]["Enums"]["event_registration_status"]
          user_id: string
        }
        Update: {
          attended_at?: string | null
          attendee_name_snapshot?: string
          event_id?: string
          registered_at?: string
          status?: Database["public"]["Enums"]["event_registration_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_streams: {
        Row: {
          event_id: string
          live_url: string | null
          replay_url: string | null
          updated_at: string
        }
        Insert: {
          event_id: string
          live_url?: string | null
          replay_url?: string | null
          updated_at?: string
        }
        Update: {
          event_id?: string
          live_url?: string | null
          replay_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_streams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category: string
          certificate_enabled: boolean
          cover_url: string | null
          created_at: string
          description: string
          ends_at: string
          host_name: string
          id: string
          location: string
          organizer_id: string | null
          registration_count: number
          slug: string
          speakers: string[]
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category: string
          certificate_enabled?: boolean
          cover_url?: string | null
          created_at?: string
          description: string
          ends_at: string
          host_name: string
          id?: string
          location: string
          organizer_id?: string | null
          registration_count?: number
          slug: string
          speakers?: string[]
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category?: string
          certificate_enabled?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string
          host_name?: string
          id?: string
          location?: string
          organizer_id?: string | null
          registration_count?: number
          slug?: string
          speakers?: string[]
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string
          enabled: boolean
          key: string
          rollout_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description: string
          enabled?: boolean
          key: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string
          enabled?: boolean
          key?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["financial_account_type"]
          created_at: string
          currency: string
          id: string
          owner_user_id: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["financial_account_type"]
          created_at?: string
          currency?: string
          id?: string
          owner_user_id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["financial_account_type"]
          created_at?: string
          currency?: string
          id?: string
          owner_user_id?: string | null
        }
        Relationships: []
      }
      financial_reversal_events: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          event_type: Database["public"]["Enums"]["ledger_event_type"]
          id: string
          metadata: Json
          order_id: string
          processed_at: string | null
          provider: string
          provider_event_id: string
          reason: string | null
          status: Database["public"]["Enums"]["financial_reversal_status"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          event_type: Database["public"]["Enums"]["ledger_event_type"]
          id?: string
          metadata?: Json
          order_id: string
          processed_at?: string | null
          provider?: string
          provider_event_id: string
          reason?: string | null
          status: Database["public"]["Enums"]["financial_reversal_status"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          event_type?: Database["public"]["Enums"]["ledger_event_type"]
          id?: string
          metadata?: Json
          order_id?: string
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["financial_reversal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_reversal_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "beat_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_credit_packs: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          credit_quantity: number
          currency: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          credit_quantity: number
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
          validity_days: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          credit_quantity?: number
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: []
      }
      ledger_accounts: {
        Row: {
          account_code: string
          created_at: string
          currency: string
          id: string
          name: string
          normal_balance: string
          owner_id: string | null
          owner_type: string
          status: string
        }
        Insert: {
          account_code: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          normal_balance: string
          owner_id?: string | null
          owner_type: string
          status?: string
        }
        Update: {
          account_code?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          normal_balance?: string
          owner_id?: string | null
          owner_type?: string
          status?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount_cents: number
          created_at: string
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          created_at?: string
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_postings: {
        Row: {
          account_id: string
          amount_cents: number
          created_at: string
          direction: string
          id: string
          memo: string | null
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          created_at?: string
          direction: string
          id?: string
          memo?: string | null
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          created_at?: string
          direction?: string
          id?: string
          memo?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_postings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_postings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_postings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          commission_bps: number | null
          created_at: string
          currency: string
          description: string
          event_type: string
          id: string
          idempotency_key: string
          is_demo: boolean
          metadata: Json
          occurred_at: string
          reference_id: string
          reference_type: string
          status: Database["public"]["Enums"]["ledger_transaction_status"]
        }
        Insert: {
          commission_bps?: number | null
          created_at?: string
          currency?: string
          description: string
          event_type: string
          id?: string
          idempotency_key?: string
          is_demo?: boolean
          metadata?: Json
          occurred_at: string
          reference_id: string
          reference_type: string
          status?: Database["public"]["Enums"]["ledger_transaction_status"]
        }
        Update: {
          commission_bps?: number | null
          created_at?: string
          currency?: string
          description?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          is_demo?: boolean
          metadata?: Json
          occurred_at?: string
          reference_id?: string
          reference_type?: string
          status?: Database["public"]["Enums"]["ledger_transaction_status"]
        }
        Relationships: []
      }
      lesson_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          lesson_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          lesson_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string
          status?: string
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
          created_at: string | null
          id: string
          lesson_id: string | null
          project_file_path: string | null
          samples_file_path: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          project_file_path?: string | null
          samples_file_path?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          project_file_path?: string | null
          samples_file_path?: string | null
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
      lesson_materials: {
        Row: {
          created_at: string
          description: string | null
          file_url: string
          id: string
          lesson_id: string
          material_type: string
          mime_type: string | null
          name: string
          order_index: number
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          lesson_id: string
          material_type?: string
          mime_type?: string | null
          name: string
          order_index?: number
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          lesson_id?: string
          material_type?: string
          mime_type?: string | null
          name?: string
          order_index?: number
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          last_viewed_at: string | null
          lesson_id: string | null
          progress_percentage: number | null
          updated_at: string
          user_id: string
          watched_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          last_viewed_at?: string | null
          lesson_id?: string | null
          progress_percentage?: number | null
          updated_at?: string
          user_id: string
          watched_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          last_viewed_at?: string | null
          lesson_id?: string | null
          progress_percentage?: number | null
          updated_at?: string
          user_id?: string
          watched_seconds?: number | null
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
      lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string | null
          order_index: number
          slug: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string | null
          order_index?: number
          slug?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string | null
          order_index?: number
          slug?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
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
      marketing_campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_demo: boolean
          name: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          name: string
          starts_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          campaign_id: string | null
          consent_at: string | null
          created_at: string
          email: string
          id: string
          is_demo: boolean
          name: string | null
          source: string
          status: string
        }
        Insert: {
          campaign_id?: string | null
          consent_at?: string | null
          created_at?: string
          email: string
          id?: string
          is_demo?: boolean
          name?: string | null
          source: string
          status?: string
        }
        Update: {
          campaign_id?: string | null
          consent_at?: string | null
          created_at?: string
          email?: string
          id?: string
          is_demo?: boolean
          name?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      observability_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          description: string
          fingerprint: string
          first_seen_at: string
          id: string
          last_seen_at: string
          metadata: Json
          occurrence_count: number
          resolved_at: string | null
          resolved_by: string | null
          service: string
          severity: string
          status: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          description: string
          fingerprint: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          occurrence_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          service: string
          severity: string
          status?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          description?: string
          fingerprint?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          occurrence_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          service?: string
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      observability_health_checks: {
        Row: {
          checked_at: string
          details: Json
          id: number
          latency_ms: number | null
          service: string
          status: string
        }
        Insert: {
          checked_at?: string
          details?: Json
          id?: never
          latency_ms?: number | null
          service: string
          status: string
        }
        Update: {
          checked_at?: string
          details?: Json
          id?: never
          latency_ms?: number | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      observability_metric_samples: {
        Row: {
          dimensions: Json
          id: number
          metric_name: string
          metric_value: number
          observed_at: string
          unit: string
        }
        Insert: {
          dimensions?: Json
          id?: never
          metric_name: string
          metric_value: number
          observed_at?: string
          unit: string
        }
        Update: {
          dimensions?: Json
          id?: never
          metric_name?: string
          metric_value?: number
          observed_at?: string
          unit?: string
        }
        Relationships: []
      }
      observability_request_traces: {
        Row: {
          duration_ms: number
          error_code: string | null
          id: number
          method: string
          occurred_at: string
          request_id: string
          route: string
          service: string
          status_code: number
          trace_id: string
        }
        Insert: {
          duration_ms: number
          error_code?: string | null
          id?: never
          method: string
          occurred_at?: string
          request_id: string
          route: string
          service: string
          status_code: number
          trace_id: string
        }
        Update: {
          duration_ms?: number
          error_code?: string | null
          id?: never
          method?: string
          occurred_at?: string
          request_id?: string
          route?: string
          service?: string
          status_code?: number
          trace_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          application_count: number
          application_deadline: string | null
          benefits: string[]
          company_id: string | null
          compensation: string | null
          created_at: string
          created_by: string | null
          credit_event_id: string | null
          credit_lot_id: string | null
          currency: string
          deadline_at: string | null
          description: string
          engagement_type: string
          external_url: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["opportunity_kind"]
          location: string
          organization_name: string
          owner_id: string | null
          posting_expires_at: string | null
          published_at: string | null
          renewal_count: number
          requirements: string[]
          salary_max_cents: number | null
          salary_min_cents: number | null
          slug: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
          work_mode: string
        }
        Insert: {
          application_count?: number
          application_deadline?: string | null
          benefits?: string[]
          company_id?: string | null
          compensation?: string | null
          created_at?: string
          created_by?: string | null
          credit_event_id?: string | null
          credit_lot_id?: string | null
          currency?: string
          deadline_at?: string | null
          description: string
          engagement_type: string
          external_url?: string | null
          id?: string
          is_demo?: boolean
          kind: Database["public"]["Enums"]["opportunity_kind"]
          location?: string
          organization_name: string
          owner_id?: string | null
          posting_expires_at?: string | null
          published_at?: string | null
          renewal_count?: number
          requirements?: string[]
          salary_max_cents?: number | null
          salary_min_cents?: number | null
          slug?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at?: string
          work_mode?: string
        }
        Update: {
          application_count?: number
          application_deadline?: string | null
          benefits?: string[]
          company_id?: string | null
          compensation?: string | null
          created_at?: string
          created_by?: string | null
          credit_event_id?: string | null
          credit_lot_id?: string | null
          currency?: string
          deadline_at?: string | null
          description?: string
          engagement_type?: string
          external_url?: string | null
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["opportunity_kind"]
          location?: string
          organization_name?: string
          owner_id?: string | null
          posting_expires_at?: string | null
          published_at?: string | null
          renewal_count?: number
          requirements?: string[]
          salary_max_cents?: number | null
          salary_min_cents?: number | null
          slug?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          updated_at?: string
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_credit_balances"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opportunities_credit_event_id_fkey"
            columns: ["credit_event_id"]
            isOneToOne: false
            referencedRelation: "company_credit_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_credit_lot_id_fkey"
            columns: ["credit_lot_id"]
            isOneToOne: false
            referencedRelation: "company_credit_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_application_messages: {
        Row: {
          application_id: string
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_application_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "opportunity_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_application_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      opportunity_applications: {
        Row: {
          applicant_id: string
          applicant_name_snapshot: string
          cover_letter: string
          created_at: string
          decided_at: string | null
          id: string
          opportunity_id: string
          portfolio_url: string | null
          recruiter_notes: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["opportunity_application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          applicant_name_snapshot?: string
          cover_letter: string
          created_at?: string
          decided_at?: string | null
          id?: string
          opportunity_id: string
          portfolio_url?: string | null
          recruiter_notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["opportunity_application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          applicant_name_snapshot?: string
          cover_letter?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          opportunity_id?: string
          portfolio_url?: string | null
          recruiter_notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["opportunity_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_favorites: {
        Row: {
          created_at: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_favorites_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_adjustments: {
        Row: {
          adjustment_type: string
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          metadata: Json
          order_id: string
          payment_id: string
          provider_reference: string | null
          reason: string | null
          status: string
        }
        Insert: {
          adjustment_type: string
          amount_cents: number
          confirmed_at?: string | null
          created_at?: string
          currency: string
          id?: string
          idempotency_key: string
          metadata?: Json
          order_id: string
          payment_id: string
          provider_reference?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          adjustment_type?: string
          amount_cents?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          order_id?: string
          payment_id?: string
          provider_reference?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_adjustments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          expires_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          installments: number | null
          order_id: string
          payment_method: string | null
          provider: string
          provider_payload: Json
          provider_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key: string
          installments?: number | null
          order_id: string
          payment_method?: string | null
          provider: string
          provider_payload?: Json
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          installments?: number | null
          order_id?: string
          payment_method?: string | null
          provider?: string
          provider_payload?: Json
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation_items: {
        Row: {
          created_at: string
          details: Json
          expected_amount_cents: number | null
          expected_currency: string | null
          expected_status: string | null
          id: string
          order_id: string | null
          report_id: string
          reported_amount_cents: number
          reported_currency: string
          reported_status: string
          run_id: string
          status: Database["public"]["Enums"]["reconciliation_item_status"]
        }
        Insert: {
          created_at?: string
          details?: Json
          expected_amount_cents?: number | null
          expected_currency?: string | null
          expected_status?: string | null
          id?: string
          order_id?: string | null
          report_id: string
          reported_amount_cents: number
          reported_currency: string
          reported_status: string
          run_id: string
          status: Database["public"]["Enums"]["reconciliation_item_status"]
        }
        Update: {
          created_at?: string
          details?: Json
          expected_amount_cents?: number | null
          expected_currency?: string | null
          expected_status?: string | null
          id?: string
          order_id?: string | null
          report_id?: string
          reported_amount_cents?: number
          reported_currency?: string
          reported_status?: string
          run_id?: string
          status?: Database["public"]["Enums"]["reconciliation_item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliation_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "beat_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliation_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "payment_reconciliation_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliation_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payment_reconciliation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation_reports: {
        Row: {
          id: string
          metadata: Json
          provider_payment_id: string
          reported_amount_cents: number
          reported_at: string
          reported_currency: string
          reported_status: string
          run_id: string
        }
        Insert: {
          id?: string
          metadata?: Json
          provider_payment_id: string
          reported_amount_cents: number
          reported_at: string
          reported_currency: string
          reported_status: string
          run_id: string
        }
        Update: {
          id?: string
          metadata?: Json
          provider_payment_id?: string
          reported_amount_cents?: number
          reported_at?: string
          reported_currency?: string
          reported_status?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliation_reports_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payment_reconciliation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation_runs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          period_end: string
          period_start: string
          provider: string
          source_reference: string | null
          started_at: string
          status: Database["public"]["Enums"]["reconciliation_run_status"]
          total_divergent: number
          total_matched: number
          total_reported: number
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          period_end: string
          period_start: string
          provider: string
          source_reference?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["reconciliation_run_status"]
          total_divergent?: number
          total_matched?: number
          total_reported?: number
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          period_end?: string
          period_start?: string
          provider?: string
          source_reference?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["reconciliation_run_status"]
          total_divergent?: number
          total_matched?: number
          total_reported?: number
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          payload_sha256: string
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          signature_valid: boolean
          status: string
        }
        Insert: {
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          payload_sha256: string
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          signature_valid: boolean
          status?: string
        }
        Update: {
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          payload_sha256?: string
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          signature_valid?: boolean
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          attempt_id: string | null
          chargeback_amount_cents: number
          created_at: string
          currency: string
          gross_amount_cents: number
          id: string
          metadata: Json
          net_received_cents: number
          order_id: string
          paid_at: string
          payment_method: string | null
          provider: string
          provider_fee_cents: number
          provider_reference: string
          refunded_amount_cents: number
          status: string
          updated_at: string
        }
        Insert: {
          attempt_id?: string | null
          chargeback_amount_cents?: number
          created_at?: string
          currency?: string
          gross_amount_cents: number
          id?: string
          metadata?: Json
          net_received_cents: number
          order_id: string
          paid_at: string
          payment_method?: string | null
          provider: string
          provider_fee_cents?: number
          provider_reference: string
          refunded_amount_cents?: number
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string | null
          chargeback_amount_cents?: number
          created_at?: string
          currency?: string
          gross_amount_cents?: number
          id?: string
          metadata?: Json
          net_received_cents?: number
          order_id?: string
          paid_at?: string
          payment_method?: string | null
          provider?: string
          provider_fee_cents?: number
          provider_reference?: string
          refunded_amount_cents?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_allocations: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          payout_request_id: string
          revenue_split_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          payout_request_id: string
          revenue_split_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          payout_request_id?: string
          revenue_split_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_allocations_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_allocations_revenue_split_id_fkey"
            columns: ["revenue_split_id"]
            isOneToOne: false
            referencedRelation: "beneficiary_balances"
            referencedColumns: ["revenue_split_id"]
          },
          {
            foreignKeyName: "payout_allocations_revenue_split_id_fkey"
            columns: ["revenue_split_id"]
            isOneToOne: false
            referencedRelation: "revenue_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_destinations: {
        Row: {
          created_at: string
          destination_type: string
          display_label: string
          encrypted_reference: string | null
          id: string
          is_default: boolean
          is_demo: boolean
          owner_user_id: string
          status: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          destination_type: string
          display_label: string
          encrypted_reference?: string | null
          id?: string
          is_default?: boolean
          is_demo?: boolean
          owner_user_id: string
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          destination_type?: string
          display_label?: string
          encrypted_reference?: string | null
          id?: string
          is_default?: boolean
          is_demo?: boolean
          owner_user_id?: string
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount_cents: number
          beneficiary_id: string | null
          beneficiary_type: string
          created_at: string
          currency: string
          destination_id: string
          failure_reason: string | null
          id: string
          is_demo: boolean
          metadata: Json
          owner_user_id: string
          processed_at: string | null
          provider_reference: string | null
          requested_at: string
          source_request_id: string | null
          source_request_kind: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          beneficiary_id?: string | null
          beneficiary_type?: string
          created_at?: string
          currency?: string
          destination_id: string
          failure_reason?: string | null
          id?: string
          is_demo?: boolean
          metadata?: Json
          owner_user_id: string
          processed_at?: string | null
          provider_reference?: string | null
          requested_at?: string
          source_request_id?: string | null
          source_request_kind?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          beneficiary_id?: string | null
          beneficiary_type?: string
          created_at?: string
          currency?: string
          destination_id?: string
          failure_reason?: string | null
          id?: string
          is_demo?: boolean
          metadata?: Json
          owner_user_id?: string
          processed_at?: string | null
          provider_reference?: string | null
          requested_at?: string
          source_request_id?: string | null
          source_request_kind?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "payout_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_financial_settings: {
        Row: {
          default_commission_bps: number
          id: boolean
          payout_delay_days: number
          payout_minimum_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_commission_bps?: number
          id?: boolean
          payout_delay_days?: number
          payout_minimum_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_commission_bps?: number
          id?: boolean
          payout_delay_days?: number
          payout_minimum_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_integrations: {
        Row: {
          category: string
          config: Json
          display_name: string
          is_demo: boolean
          key: string
          last_checked_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          config?: Json
          display_name: string
          is_demo?: boolean
          key: string
          last_checked_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json
          display_name?: string
          is_demo?: boolean
          key?: string
          last_checked_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_type: string
          position: number
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_type: string
          position?: number
          title: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_type?: string
          position?: number
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_portfolios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      producer_commission_overrides: {
        Row: {
          commission_bps: number
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          producer_id: string
          reason: string | null
        }
        Insert: {
          commission_bps: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          producer_id: string
          reason?: string | null
        }
        Update: {
          commission_bps?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          producer_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      producer_financial_accounts: {
        Row: {
          created_at: string
          currency: string
          current_balance_cents: number
          eligible_balance_cents: number
          id: string
          next_eligibility_at: string | null
          producer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_balance_cents?: number
          eligible_balance_cents?: number
          id?: string
          next_eligibility_at?: string | null
          producer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_balance_cents?: number
          eligible_balance_cents?: number
          id?: string
          next_eligibility_at?: string | null
          producer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_financial_accounts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      producer_payout_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          from_status: string | null
          id: string
          payout_request_id: string
          producer_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          created_at?: string
          from_status?: string | null
          id?: string
          payout_request_id: string
          producer_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          from_status?: string | null
          id?: string
          payout_request_id?: string
          producer_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_payout_events_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "producer_payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_payout_events_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      producer_payout_methods: {
        Row: {
          created_at: string
          display_label: string
          id: string
          is_default: boolean
          method_type: Database["public"]["Enums"]["payout_method_type"]
          producer_id: string
          provider: string | null
          provider_destination_token: string | null
          status: Database["public"]["Enums"]["payout_method_status"]
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          display_label: string
          id?: string
          is_default?: boolean
          method_type: Database["public"]["Enums"]["payout_method_type"]
          producer_id: string
          provider?: string | null
          provider_destination_token?: string | null
          status?: Database["public"]["Enums"]["payout_method_status"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          display_label?: string
          id?: string
          is_default?: boolean
          method_type?: Database["public"]["Enums"]["payout_method_type"]
          producer_id?: string
          provider?: string | null
          provider_destination_token?: string | null
          status?: Database["public"]["Enums"]["payout_method_status"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      producer_payout_requests: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          currency: string
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          metadata: Json
          paid_at: string | null
          payout_method_id: string
          processed_at: string | null
          processing_at: string | null
          producer_id: string
          provider_transfer_id: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          canceled_at?: string | null
          currency: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          paid_at?: string | null
          payout_method_id: string
          processed_at?: string | null
          processing_at?: string | null
          producer_id: string
          provider_transfer_id?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          currency?: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          paid_at?: string | null
          payout_method_id?: string
          processed_at?: string | null
          processing_at?: string | null
          producer_id?: string
          provider_transfer_id?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_payout_requests_payout_method_id_fkey"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "producer_payout_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          is_demo: boolean
          product_id: string
          question: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          product_id: string
          question: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          product_id?: string
          question?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_demo: boolean
          product_id: string
          rating: number
          responded_at: string | null
          seller_response: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_demo?: boolean
          product_id: string
          rating: number
          responded_at?: string | null
          seller_response?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          product_id?: string
          rating?: number
          responded_at?: string | null
          seller_response?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      revenue_split_adjustments: {
        Row: {
          adjustment_id: string
          amount_cents: number
          created_at: string
          id: string
          revenue_split_id: string
        }
        Insert: {
          adjustment_id: string
          amount_cents: number
          created_at?: string
          id?: string
          revenue_split_id: string
        }
        Update: {
          adjustment_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          revenue_split_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_split_adjustments_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "payment_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_split_adjustments_revenue_split_id_fkey"
            columns: ["revenue_split_id"]
            isOneToOne: false
            referencedRelation: "beneficiary_balances"
            referencedColumns: ["revenue_split_id"]
          },
          {
            foreignKeyName: "revenue_split_adjustments_revenue_split_id_fkey"
            columns: ["revenue_split_id"]
            isOneToOne: false
            referencedRelation: "revenue_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_splits: {
        Row: {
          amount_cents: number
          available_at: string | null
          beneficiary_id: string | null
          beneficiary_type: string
          created_at: string
          id: string
          metadata: Json
          order_item_id: string
          percentage_bps: number
          settled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          available_at?: string | null
          beneficiary_id?: string | null
          beneficiary_type: string
          created_at?: string
          id?: string
          metadata?: Json
          order_item_id: string
          percentage_bps: number
          settled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          available_at?: string | null
          beneficiary_id?: string | null
          beneficiary_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          order_item_id?: string
          percentage_bps?: number
          settled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_product_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          product_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          product_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          product_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_products: {
        Row: {
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_demo: boolean
          price_cents: number
          product_type: string
          published_at: string | null
          seller_id: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          price_cents: number
          product_type: string
          published_at?: string | null
          seller_id: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          price_cents?: number
          product_type?: string
          published_at?: string | null
          seller_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_contracts: {
        Row: {
          buyer_id: string
          canceled_at: string | null
          completed_at: string | null
          created_at: string
          currency: string
          deliverables_snapshot: string[]
          due_at: string | null
          id: string
          is_demo: boolean
          listing_id: string | null
          order_id: string | null
          order_item_id: string | null
          package_id: string | null
          proposal_id: string | null
          provider_id: string
          revisions_included: number
          scope_snapshot: string
          started_at: string
          status: string
          title_snapshot: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          canceled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          deliverables_snapshot?: string[]
          due_at?: string | null
          id?: string
          is_demo?: boolean
          listing_id?: string | null
          order_id?: string | null
          order_item_id?: string | null
          package_id?: string | null
          proposal_id?: string | null
          provider_id: string
          revisions_included?: number
          scope_snapshot: string
          started_at?: string
          status?: string
          title_snapshot: string
          total_cents: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          canceled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          deliverables_snapshot?: string[]
          due_at?: string | null
          id?: string
          is_demo?: boolean
          listing_id?: string | null
          order_id?: string | null
          order_item_id?: string | null
          package_id?: string | null
          proposal_id?: string | null
          provider_id?: string
          revisions_included?: number
          scope_snapshot?: string
          started_at?: string
          status?: string
          title_snapshot?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_contracts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "service_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "service_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      service_deliveries: {
        Row: {
          created_at: string
          file_paths: Json
          id: string
          milestone_id: string
          notes: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          submitted_by: string
          version: number
        }
        Insert: {
          created_at?: string
          file_paths?: Json
          id?: string
          milestone_id: string
          notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          version: number
        }
        Update: {
          created_at?: string
          file_paths?: Json
          id?: string
          milestone_id?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_deliveries_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "service_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      service_disputes: {
        Row: {
          contract_id: string
          created_at: string
          description: string
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          description: string
          id?: string
          opened_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string
          id?: string
          opened_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_disputes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_listings: {
        Row: {
          category_id: string
          completed_contracts: number
          created_at: string
          description: string
          id: string
          is_demo: boolean
          moderation_status: string
          portfolio_urls: string[]
          provider_id: string
          published_at: string | null
          rating_average: number
          rating_count: number
          requirements: string[]
          short_description: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          completed_contracts?: number
          created_at?: string
          description: string
          id?: string
          is_demo?: boolean
          moderation_status?: string
          portfolio_urls?: string[]
          provider_id: string
          published_at?: string | null
          rating_average?: number
          rating_count?: number
          requirements?: string[]
          short_description?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          completed_contracts?: number
          created_at?: string
          description?: string
          id?: string
          is_demo?: boolean
          moderation_status?: string
          portfolio_urls?: string[]
          provider_id?: string
          published_at?: string | null
          rating_average?: number
          rating_count?: number
          requirements?: string[]
          short_description?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_messages: {
        Row: {
          attachment_paths: Json
          body: string
          contract_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_paths?: Json
          body: string
          contract_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_paths?: Json
          body?: string
          contract_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_milestones: {
        Row: {
          accepted_at: string | null
          amount_cents: number
          contract_id: string
          created_at: string
          currency: string
          description: string | null
          due_at: string | null
          id: string
          order_index: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount_cents: number
          contract_id: string
          created_at?: string
          currency?: string
          description?: string | null
          due_at?: string | null
          id?: string
          order_index?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount_cents?: number
          contract_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          due_at?: string | null
          id?: string
          order_index?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_milestones_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_moderation_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: string | null
          id: string
          listing_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          listing_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          listing_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_moderation_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "service_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          active: boolean
          code: string
          created_at: string
          currency: string
          deliverables: string[]
          delivery_days: number
          description: string | null
          id: string
          listing_id: string
          name: string
          price_cents: number
          revisions: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          currency?: string
          deliverables?: string[]
          delivery_days: number
          description?: string | null
          id?: string
          listing_id: string
          name: string
          price_cents: number
          revisions?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          deliverables?: string[]
          delivery_days?: number
          description?: string | null
          id?: string
          listing_id?: string
          name?: string
          price_cents?: number
          revisions?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "service_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_proposals: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          deliverables: string[]
          delivery_days: number
          expires_at: string | null
          id: string
          provider_id: string
          request_id: string
          revisions: number
          scope: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          deliverables?: string[]
          delivery_days: number
          expires_at?: string | null
          id?: string
          provider_id: string
          request_id: string
          revisions?: number
          scope: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          deliverables?: string[]
          delivery_days?: number
          expires_at?: string | null
          id?: string
          provider_id?: string
          request_id?: string
          revisions?: number
          scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_provider_profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          headline: string | null
          is_demo: boolean
          location: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          headline?: string | null
          is_demo?: boolean
          location?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          headline?: string | null
          is_demo?: boolean
          location?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          brief: string
          budget_max_cents: number | null
          budget_min_cents: number | null
          category_id: string | null
          client_id: string
          created_at: string
          currency: string
          desired_delivery_date: string | null
          id: string
          is_demo: boolean
          listing_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brief: string
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          category_id?: string | null
          client_id: string
          created_at?: string
          currency?: string
          desired_delivery_date?: string | null
          id?: string
          is_demo?: boolean
          listing_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brief?: string
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          category_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          desired_delivery_date?: string | null
          id?: string
          is_demo?: boolean
          listing_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "service_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          comment: string | null
          contract_id: string
          created_at: string
          id: string
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          contract_id: string
          created_at?: string
          id?: string
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_favorites: {
        Row: {
          beat_id: string | null
          content_id: string | null
          course_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          beat_id?: string | null
          content_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          beat_id?: string | null
          content_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_favorites_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_favorites_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "academy_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_favorites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_favorites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "published_courses_preview"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notifications: {
        Row: {
          action_url: string | null
          body: string
          category: Database["public"]["Enums"]["student_notification_category"]
          created_at: string
          expires_at: string | null
          id: string
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          category?: Database["public"]["Enums"]["student_notification_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          category?: Database["public"]["Enums"]["student_notification_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_preferences: {
        Row: {
          community_activity: boolean
          course_updates: boolean
          created_at: string
          locale: string
          marketing_emails: boolean
          public_profile: boolean
          show_progress: boolean
          theme: Database["public"]["Enums"]["student_theme"]
          updated_at: string
          user_id: string
        }
        Insert: {
          community_activity?: boolean
          course_updates?: boolean
          created_at?: string
          locale?: string
          marketing_emails?: boolean
          public_profile?: boolean
          show_progress?: boolean
          theme?: Database["public"]["Enums"]["student_theme"]
          updated_at?: string
          user_id: string
        }
        Update: {
          community_activity?: boolean
          course_updates?: boolean
          created_at?: string
          locale?: string
          marketing_emails?: boolean
          public_profile?: boolean
          show_progress?: boolean
          theme?: Database["public"]["Enums"]["student_theme"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_faq: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          ticket_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          ticket_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          ticket_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_portfolios: {
        Row: {
          bio: string
          created_at: string
          headline: string
          is_public: boolean
          public_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio: string
          created_at?: string
          headline: string
          is_public?: boolean
          public_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string
          created_at?: string
          headline?: string
          is_public?: boolean
          public_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_demo: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_demo?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_demo?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_receipts: {
        Row: {
          error_message: string | null
          event_type: string
          external_event_id: string
          id: string
          payload_hash: string
          processed_at: string | null
          processing_status: string
          provider: string
          received_at: string
        }
        Insert: {
          error_message?: string | null
          event_type: string
          external_event_id: string
          id?: string
          payload_hash: string
          processed_at?: string | null
          processing_status?: string
          provider: string
          received_at?: string
        }
        Update: {
          error_message?: string | null
          event_type?: string
          external_event_id?: string
          id?: string
          payload_hash?: string
          processed_at?: string | null
          processing_status?: string
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      beneficiary_balances: {
        Row: {
          amount_cents: number | null
          available_at: string | null
          beneficiary_id: string | null
          beneficiary_type: string | null
          order_item_id: string | null
          revenue_split_id: string | null
          status: string | null
          unallocated_cents: number | null
        }
        Insert: {
          amount_cents?: number | null
          available_at?: string | null
          beneficiary_id?: string | null
          beneficiary_type?: string | null
          order_item_id?: string | null
          revenue_split_id?: string | null
          status?: string | null
          unallocated_cents?: never
        }
        Update: {
          amount_cents?: number | null
          available_at?: string | null
          beneficiary_id?: string | null
          beneficiary_type?: string | null
          order_item_id?: string | null
          revenue_split_id?: string | null
          status?: string | null
          unallocated_cents?: never
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      company_credit_balances: {
        Row: {
          available_credits: number | null
          company_id: string | null
          next_expiration_at: string | null
        }
        Relationships: []
      }
      ledger_account_balances: {
        Row: {
          account_code: string | null
          account_id: string | null
          balance_cents: number | null
          currency: string | null
          name: string | null
          normal_balance: string | null
          owner_id: string | null
          owner_type: string | null
        }
        Relationships: []
      }
      published_courses_preview: {
        Row: {
          currency: string | null
          description: string | null
          id: string | null
          price_cents: number | null
          slug: string | null
          thumbnail_url: string | null
          title: string | null
        }
        Insert: {
          currency?: string | null
          description?: string | null
          id?: string | null
          price_cents?: number | null
          slug?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Update: {
          currency?: string | null
          description?: string | null
          id?: string | null
          price_cents?: number | null
          slug?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_demo_service_milestone: {
        Args: { target_buyer_id: string; target_milestone_id: string }
        Returns: {
          accepted_at: string | null
          amount_cents: number
          contract_id: string
          created_at: string
          currency: string
          description: string | null
          due_at: string | null
          id: string
          order_index: number
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_milestones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_service_milestone: {
        Args: { target_milestone_id: string }
        Returns: {
          accepted_at: string | null
          amount_cents: number
          contract_id: string
          created_at: string
          currency: string
          description: string | null
          due_at: string | null
          id: string
          order_index: number
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_milestones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_grant_company_credits: {
        Args: {
          target_company_id: string
          target_credit_quantity?: number
          target_pack_id: string
          target_reference?: string
        }
        Returns: {
          company_id: string
          created_at: string
          expires_at: string
          id: string
          is_demo: boolean
          pack_id: string | null
          purchased_credits: number
          remaining_credits: number
          source_order_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "company_credit_lots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_publish_commercial_parameter: {
        Args: {
          target_category: string
          target_description: string
          target_effective_from?: string
          target_key: string
          target_label: string
          target_scope_id?: string
          target_scope_type?: string
          target_value: Json
          target_value_type: string
          target_visibility?: string
        }
        Returns: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          parameter_id: string
          published_at: string | null
          status: string
          value: Json
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "commercial_parameter_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_publish_demo_commercial_parameter: {
        Args: {
          target_effective_from?: string
          target_parameter_id: string
          target_value: Json
        }
        Returns: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          parameter_id: string
          published_at: string | null
          status: string
          value: Json
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "commercial_parameter_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_record_demo_payment_adjustment: {
        Args: {
          target_adjustment_type: string
          target_amount_cents: number
          target_idempotency_key: string
          target_order_id: string
          target_reason: string
        }
        Returns: {
          adjustment_type: string
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          metadata: Json
          order_id: string
          payment_id: string
          provider_reference: string | null
          reason: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_record_payment_adjustment: {
        Args: {
          target_adjustment_type: string
          target_amount_cents: number
          target_idempotency_key: string
          target_order_id: string
          target_provider_reference: string
          target_reason: string
        }
        Returns: {
          adjustment_type: string
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          metadata: Json
          order_id: string
          payment_id: string
          provider_reference: string | null
          reason: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_resolve_demo_service_dispute: {
        Args: {
          target_dispute_id: string
          target_refund_cents: number
          target_resolution: string
          target_resolution_status: string
        }
        Returns: {
          contract_id: string
          created_at: string
          description: string
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_disputes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_resolve_service_dispute: {
        Args: {
          target_dispute_id: string
          target_refund_cents: number
          target_resolution: string
          target_resolution_status: string
        }
        Returns: {
          contract_id: string
          created_at: string
          description: string
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_disputes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_demo_service_listing: {
        Args: {
          target_listing_id: string
          target_reason?: string
          target_status: string
        }
        Returns: {
          category_id: string
          completed_contracts: number
          created_at: string
          description: string
          id: string
          is_demo: boolean
          moderation_status: string
          portfolio_urls: string[]
          provider_id: string
          published_at: string | null
          rating_average: number
          rating_count: number
          requirements: string[]
          short_description: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_service_listing: {
        Args: {
          target_listing_id: string
          target_reason?: string
          target_status: string
        }
        Returns: {
          category_id: string
          completed_contracts: number
          created_at: string
          description: string
          id: string
          is_demo: boolean
          moderation_status: string
          portfolio_urls: string[]
          provider_id: string
          published_at: string | null
          rating_average: number
          rating_count: number
          requirements: string[]
          short_description: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_account_capability: {
        Args: {
          target_capability: string
          target_is_default?: boolean
          target_status: string
          target_user_id: string
        }
        Returns: {
          activated_at: string | null
          approved_at: string | null
          capability: string
          created_at: string
          is_default: boolean
          metadata: Json
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_capabilities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_transition_demo_unified_payout: {
        Args: {
          target_failure_reason?: string
          target_provider_reference?: string
          target_request_id: string
          target_status: string
        }
        Returns: {
          amount_cents: number
          beneficiary_id: string | null
          beneficiary_type: string
          created_at: string
          currency: string
          destination_id: string
          failure_reason: string | null
          id: string
          is_demo: boolean
          metadata: Json
          owner_user_id: string
          processed_at: string | null
          provider_reference: string | null
          requested_at: string
          source_request_id: string | null
          source_request_kind: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_transition_unified_payout: {
        Args: {
          target_failure_reason?: string
          target_provider_reference?: string
          target_request_id: string
          target_status: string
        }
        Returns: {
          amount_cents: number
          beneficiary_id: string | null
          beneficiary_type: string
          created_at: string
          currency: string
          destination_id: string
          failure_reason: string | null
          id: string
          is_demo: boolean
          metadata: Json
          owner_user_id: string
          processed_at: string | null
          provider_reference: string | null
          requested_at: string
          source_request_id: string | null
          source_request_kind: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_demo_beat_license_template: {
        Args: {
          target_active: boolean
          target_currency: string
          target_deliverables: Json
          target_description: string
          target_max_copies: number
          target_name: string
          target_price_cents: number
          target_sort_order: number
          target_template_id: string
          target_usage_rights: Json
        }
        Returns: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          currency: string
          deliverables: Json
          description: string | null
          id: string
          is_demo: boolean
          is_exclusive: boolean
          license_type: string
          max_copies: number | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          usage_rights: Json
        }
        SetofOptions: {
          from: "*"
          to: "beat_license_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_demo_job_credit_pack: {
        Args: {
          target_active: boolean
          target_credit_quantity: number
          target_currency: string
          target_description: string
          target_name: string
          target_pack_id: string
          target_price_cents: number
          target_sort_order: number
          target_validity_days: number
        }
        Returns: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          credit_quantity: number
          currency: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          validity_days: number
        }
        SetofOptions: {
          from: "*"
          to: "job_credit_packs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_beat_license_template: {
        Args: {
          target_active: boolean
          target_code: string
          target_currency: string
          target_deliverables: Json
          target_description: string
          target_is_exclusive: boolean
          target_license_type: string
          target_max_copies: number
          target_name: string
          target_price_cents: number
          target_sort_order?: number
          target_template_id: string
          target_usage_rights: Json
        }
        Returns: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          currency: string
          deliverables: Json
          description: string | null
          id: string
          is_demo: boolean
          is_exclusive: boolean
          license_type: string
          max_copies: number | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          usage_rights: Json
        }
        SetofOptions: {
          from: "*"
          to: "beat_license_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_job_credit_pack: {
        Args: {
          target_active: boolean
          target_code: string
          target_credit_quantity: number
          target_currency: string
          target_description: string
          target_name: string
          target_pack_id: string
          target_price_cents: number
          target_sort_order?: number
          target_validity_days: number
        }
        Returns: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          credit_quantity: number
          currency: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          validity_days: number
        }
        SetofOptions: {
          from: "*"
          to: "job_credit_packs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_read_commerce_order: {
        Args: { target_order_id: string }
        Returns: boolean
      }
      can_read_ledger_account: {
        Args: { target_account_id: string }
        Returns: boolean
      }
      capture_observability_snapshot: { Args: never; Returns: undefined }
      cleanup_observability_data: { Args: never; Returns: undefined }
      consume_api_rate_limit: {
        Args: {
          p_actor_hash: string
          p_limit?: number
          p_route_key: string
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      create_beat_order_with_promotions: {
        Args: {
          target_affiliate_code?: string
          target_buyer_id: string
          target_coupon_code?: string
          target_license_ids: string[]
        }
        Returns: Json
      }
      create_demo_beat_order: {
        Args: {
          target_buyer_id: string
          target_idempotency_key: string
          target_license_ids: string[]
        }
        Returns: Json
      }
      create_demo_course_order: {
        Args: {
          target_buyer_id: string
          target_course_ids: string[]
          target_idempotency_key: string
        }
        Returns: Json
      }
      create_demo_digital_product_order: {
        Args: {
          target_buyer_id: string
          target_idempotency_key: string
          target_product_ids: string[]
        }
        Returns: Json
      }
      create_digital_product_order: {
        Args: {
          target_buyer_id: string
          target_idempotency_key: string
          target_product_ids: string[]
        }
        Returns: Json
      }
      current_account_capabilities: { Args: never; Returns: string[] }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_producer_payout_balance: {
        Args: { target_currency?: string; target_producer_id: string }
        Returns: {
          current_balance_cents: number
          eligible_balance_cents: number
          next_eligibility_at: string
        }[]
      }
      grant_enrollments_for_paid_order: {
        Args: { target_order_id: string }
        Returns: undefined
      }
      has_account_capability: {
        Args: { target_capability: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_affiliate_owner: {
        Args: { target_affiliate_id: string }
        Returns: boolean
      }
      is_beat_owner: { Args: { target_beat_id: string }; Returns: boolean }
      is_company_member: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_course_staff: { Args: { target_course_id: string }; Returns: boolean }
      is_enrolled: { Args: { target_course_id: string }; Returns: boolean }
      is_platform_staff: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      issue_beat_licenses_for_paid_order: {
        Args: { target_order_id: string }
        Returns: undefined
      }
      list_demo_contact_messages: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source: string
          status: string
          subject: string
          updated_at: string
        }[]
      }
      list_public_preview_contact_messages: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source: string
          status: string
          subject: string
          updated_at: string
        }[]
      }
      mark_digital_product_order_paid: {
        Args: {
          target_order_id: string
          target_provider_payment_id: string
          target_provider_session_id: string
        }
        Returns: boolean
      }
      moderate_community_report: {
        Args: { p_action: string; p_reason: string; p_report_id: string }
        Returns: undefined
      }
      open_demo_service_dispute: {
        Args: {
          target_contract_id: string
          target_description: string
          target_opened_by: string
          target_reason: string
        }
        Returns: {
          contract_id: string
          created_at: string
          description: string
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_disputes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      open_service_dispute: {
        Args: {
          target_contract_id: string
          target_description: string
          target_reason: string
        }
        Returns: {
          contract_id: string
          created_at: string
          description: string
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_disputes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      persist_agentic_audit_checkpoint: {
        Args: { p_checkpoint: Json; p_context: Json }
        Returns: Json
      }
      post_beat_sale_to_ledger: {
        Args: { target_order_id: string }
        Returns: undefined
      }
      post_digital_product_sale_to_ledger: {
        Args: { target_order_id: string }
        Returns: undefined
      }
      process_producer_payout: {
        Args: {
          target_failure_code?: string
          target_failure_message?: string
          target_payout_id: string
          target_provider_transfer_id?: string
          target_status: Database["public"]["Enums"]["payout_status"]
        }
        Returns: undefined
      }
      publish_company_opportunity_with_credit: {
        Args: {
          target_application_deadline: string
          target_benefits: string[]
          target_company_id: string
          target_currency: string
          target_description: string
          target_engagement_type: string
          target_kind: string
          target_location: string
          target_requirements: string[]
          target_salary_max_cents: number
          target_salary_min_cents: number
          target_title: string
          target_work_mode: string
        }
        Returns: {
          application_count: number
          application_deadline: string | null
          benefits: string[]
          company_id: string | null
          compensation: string | null
          created_at: string
          created_by: string | null
          credit_event_id: string | null
          credit_lot_id: string | null
          currency: string
          deadline_at: string | null
          description: string
          engagement_type: string
          external_url: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["opportunity_kind"]
          location: string
          organization_name: string
          owner_id: string | null
          posting_expires_at: string | null
          published_at: string | null
          renewal_count: number
          requirements: string[]
          salary_max_cents: number | null
          salary_min_cents: number | null
          slug: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
          work_mode: string
        }
        SetofOptions: {
          from: "*"
          to: "opportunities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_beat_payments: {
        Args: { target_run_id: string }
        Returns: undefined
      }
      record_affiliate_checkout_conversion: {
        Args: {
          target_order_id: string
          target_order_kind: string
          target_referral_slug: string
        }
        Returns: string
      }
      record_api_observation: {
        Args: {
          p_duration_ms: number
          p_error_code?: string
          p_method: string
          p_request_id: string
          p_route: string
          p_service: string
          p_status_code: number
          p_trace_id: string
        }
        Returns: undefined
      }
      renew_company_opportunity_with_credit: {
        Args: { target_opportunity_id: string }
        Returns: {
          application_count: number
          application_deadline: string | null
          benefits: string[]
          company_id: string | null
          compensation: string | null
          created_at: string
          created_by: string | null
          credit_event_id: string | null
          credit_lot_id: string | null
          currency: string
          deadline_at: string | null
          description: string
          engagement_type: string
          external_url: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["opportunity_kind"]
          location: string
          organization_name: string
          owner_id: string | null
          posting_expires_at: string | null
          published_at: string | null
          renewal_count: number
          requirements: string[]
          salary_max_cents: number | null
          salary_min_cents: number | null
          slug: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
          work_mode: string
        }
        SetofOptions: {
          from: "*"
          to: "opportunities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_account_capability: {
        Args: { target_capability: string }
        Returns: {
          activated_at: string | null
          approved_at: string | null
          capability: string
          created_at: string
          is_default: boolean
          metadata: Json
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_capabilities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_affiliate_withdrawal: {
        Args: {
          requested_amount_cents: number
          requested_payment_method: string
        }
        Returns: string
      }
      request_demo_account_capability: {
        Args: { target_capability: string; target_user_id: string }
        Returns: {
          activated_at: string | null
          approved_at: string | null
          capability: string
          created_at: string
          is_default: boolean
          metadata: Json
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_capabilities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_demo_affiliate_withdrawal: {
        Args: {
          requested_amount_cents: number
          requested_payment_method: string
        }
        Returns: string
      }
      request_demo_producer_payout: {
        Args: {
          requested_amount_cents: number
          requested_currency: string
          target_method_id: string
        }
        Returns: string
      }
      request_demo_unified_payout: {
        Args: {
          target_amount_cents: number
          target_beneficiary_type: string
          target_currency?: string
          target_destination_id: string
          target_owner_user_id: string
        }
        Returns: {
          amount_cents: number
          beneficiary_id: string | null
          beneficiary_type: string
          created_at: string
          currency: string
          destination_id: string
          failure_reason: string | null
          id: string
          is_demo: boolean
          metadata: Json
          owner_user_id: string
          processed_at: string | null
          provider_reference: string | null
          requested_at: string
          source_request_id: string | null
          source_request_kind: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_producer_payout: {
        Args: {
          requested_amount_cents: number
          requested_currency: string
          target_method_id: string
        }
        Returns: string
      }
      request_producer_payout_for_user: {
        Args: {
          request_idempotency_key: string
          requested_amount_cents: number
          target_currency?: string
          target_payout_method_id: string
          target_producer_id: string
        }
        Returns: string
      }
      request_unified_payout: {
        Args: {
          target_amount_cents: number
          target_beneficiary_type: string
          target_currency?: string
          target_destination_id: string
        }
        Returns: {
          amount_cents: number
          beneficiary_id: string | null
          beneficiary_type: string
          created_at: string
          currency: string
          destination_id: string
          failure_reason: string | null
          id: string
          is_demo: boolean
          metadata: Json
          owner_user_id: string
          processed_at: string | null
          provider_reference: string | null
          requested_at: string
          source_request_id: string | null
          source_request_kind: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_affiliate_referral: {
        Args: { target_slug: string }
        Returns: {
          destination_url: string
        }[]
      }
      resolve_commercial_parameter: {
        Args: {
          target_at?: string
          target_key: string
          target_scope_id?: string
          target_scope_type?: string
        }
        Returns: Json
      }
      reverse_beat_order_ledger: {
        Args: {
          provider_event: string
          reversal_amount_cents: number
          reversal_currency: string
          reversal_kind: Database["public"]["Enums"]["ledger_event_type"]
          reversal_reason?: string
          target_order_id: string
        }
        Returns: Database["public"]["Enums"]["financial_reversal_status"]
      }
      service_accept_service_proposal: {
        Args: {
          target_buyer_id: string
          target_proposal_id: string
          target_request_id: string
        }
        Returns: string
      }
      service_confirm_canonical_payment: {
        Args: {
          target_order_id: string
          target_payment_method: string
          target_provider: string
          target_provider_fee_cents?: number
          target_provider_payload?: Json
          target_provider_reference: string
        }
        Returns: {
          attempt_id: string | null
          chargeback_amount_cents: number
          created_at: string
          currency: string
          gross_amount_cents: number
          id: string
          metadata: Json
          net_received_cents: number
          order_id: string
          paid_at: string
          payment_method: string | null
          provider: string
          provider_fee_cents: number
          provider_reference: string
          refunded_amount_cents: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      service_create_canonical_order: {
        Args: {
          target_buyer_id: string
          target_context?: Json
          target_idempotency_key: string
          target_is_demo?: boolean
          target_offer_ids: string[]
          target_provider: string
        }
        Returns: {
          buyer_id: string | null
          canceled_at: string | null
          checkout_snapshot: Json
          created_at: string
          currency: string
          discount_cents: number
          id: string
          idempotency_key: string | null
          is_demo: boolean
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          refunded_at: string | null
          source_order_id: string | null
          source_order_kind: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "commerce_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      service_record_payment_adjustment: {
        Args: {
          target_adjustment_type: string
          target_amount_cents: number
          target_idempotency_key: string
          target_metadata?: Json
          target_order_id: string
          target_provider_reference: string
          target_reason: string
        }
        Returns: {
          adjustment_type: string
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          metadata: Json
          order_id: string
          payment_id: string
          provider_reference: string | null
          reason: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_default_account_capability: {
        Args: { target_capability: string }
        Returns: {
          activated_at: string | null
          approved_at: string | null
          capability: string
          created_at: string
          is_default: boolean
          metadata: Json
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_capabilities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_demo_default_account_capability: {
        Args: { target_capability: string; target_user_id: string }
        Returns: {
          activated_at: string | null
          approved_at: string | null
          capability: string
          created_at: string
          is_default: boolean
          metadata: Json
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_capabilities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_demo_service_delivery: {
        Args: {
          target_file_paths: Json
          target_milestone_id: string
          target_notes: string
          target_provider_id: string
        }
        Returns: {
          created_at: string
          file_paths: Json
          id: string
          milestone_id: string
          notes: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          submitted_by: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "service_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_service_delivery: {
        Args: {
          target_file_paths: Json
          target_milestone_id: string
          target_notes: string
        }
        Returns: {
          created_at: string
          file_paths: Json
          id: string
          milestone_id: string
          notes: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          submitted_by: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "service_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_demo_integration: {
        Args: { integration_name: string }
        Returns: string
      }
      transition_affiliate_withdrawal: {
        Args: { target_status: string; target_withdrawal_id: string }
        Returns: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string | null
          processed_at: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "affiliate_withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_demo_affiliate_withdrawal: {
        Args: { target_status: string; target_withdrawal_id: string }
        Returns: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string | null
          processed_at: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "affiliate_withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_demo_producer_payout: {
        Args: { target_request_id: string; target_status: string }
        Returns: {
          amount_cents: number
          canceled_at: string | null
          currency: string
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          metadata: Json
          paid_at: string | null
          payout_method_id: string
          processed_at: string | null
          processing_at: string | null
          producer_id: string
          provider_transfer_id: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "producer_payout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_producer_payout: {
        Args: { target_request_id: string; target_status: string }
        Returns: {
          amount_cents: number
          canceled_at: string | null
          currency: string
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          metadata: Json
          paid_at: string | null
          payout_method_id: string
          processed_at: string | null
          processing_at: string | null
          producer_id: string
          provider_transfer_id: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "producer_payout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_demo_contact_message_status: {
        Args: { target_message_id: string; target_status: string }
        Returns: undefined
      }
      update_public_preview_contact_message_status: {
        Args: { target_message_id: string; target_status: string }
        Returns: undefined
      }
      verify_agentic_audit_checkpoint: {
        Args: { p_persistence_id: string }
        Returns: Json
      }
    }
    Enums: {
      academy_content_status: "draft" | "published"
      affiliate_commission_status: "pending" | "approved" | "reversed" | "paid"
      affiliate_status: "pending" | "active" | "suspended"
      beat_copyright_status: "pending" | "registered" | "failed"
      beat_event_type: "view" | "play" | "add_to_cart" | "checkout" | "purchase"
      beat_license_type: "basic" | "premium" | "unlimited" | "exclusive"
      beat_order_financial_state:
        | "normal"
        | "refunded"
        | "disputed"
        | "recovered"
      beat_order_status:
        | "pending"
        | "paid"
        | "canceled"
        | "refunded"
        | "disputed"
      beat_purchase_status: "active" | "revoked" | "refunded"
      beat_status: "draft" | "published" | "archived"
      cms_document_status:
        | "draft"
        | "review"
        | "scheduled"
        | "published"
        | "archived"
      cms_document_type: "article" | "landing_page"
      community_content_status: "published" | "hidden" | "removed"
      community_group_status: "active" | "archived"
      community_group_visibility: "public" | "private"
      community_member_role: "member" | "moderator" | "owner"
      community_member_status: "active" | "pending" | "banned"
      community_report_status: "open" | "reviewing" | "resolved" | "dismissed"
      course_order_status:
        | "pending"
        | "paid"
        | "canceled"
        | "refunded"
        | "disputed"
      course_status: "draft" | "published" | "archived"
      discount_type: "percent" | "fixed"
      enrollment_source: "manual" | "stripe" | "admin"
      enrollment_status: "active" | "revoked"
      event_registration_status: "confirmed" | "cancelled" | "attended"
      event_status: "draft" | "upcoming" | "live" | "replay" | "cancelled"
      financial_account_type:
        | "platform_clearing"
        | "platform_revenue"
        | "producer_payable"
      financial_reversal_status: "processed" | "manual_review" | "ignored"
      ledger_event_type:
        | "beat_sale"
        | "refund"
        | "chargeback"
        | "payout"
        | "adjustment"
        | "digital_product_sale"
        | "payment_captured"
      ledger_transaction_status: "posted" | "reversed"
      opportunity_application_status:
        | "submitted"
        | "reviewing"
        | "shortlisted"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "interview"
        | "approved"
      opportunity_kind:
        | "job"
        | "collab"
        | "sync"
        | "grant"
        | "contest"
        | "vaga"
        | "freela"
        | "colaboracao"
        | "edital"
        | "concurso"
      opportunity_status: "draft" | "pending" | "open" | "closed" | "rejected"
      payout_method_status: "pending_verification" | "verified" | "disabled"
      payout_method_type: "pix" | "bank_account"
      payout_status: "requested" | "processing" | "paid" | "failed" | "canceled"
      promotion_reservation_status: "reserved" | "redeemed" | "released"
      reconciliation_item_status:
        | "matched"
        | "missing_order"
        | "amount_mismatch"
        | "currency_mismatch"
        | "status_mismatch"
      reconciliation_run_status: "pending" | "completed" | "failed"
      student_notification_category: "course" | "order" | "community" | "system"
      student_theme: "system" | "light" | "dark"
      support_ticket_priority: "low" | "medium" | "high"
      support_ticket_status: "open" | "in_progress" | "resolved"
      user_role:
        | "student"
        | "instructor"
        | "producer"
        | "admin"
        | "super_admin"
        | "affiliate"
        | "company"
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
    Enums: {
      academy_content_status: ["draft", "published"],
      affiliate_commission_status: ["pending", "approved", "reversed", "paid"],
      affiliate_status: ["pending", "active", "suspended"],
      beat_copyright_status: ["pending", "registered", "failed"],
      beat_event_type: ["view", "play", "add_to_cart", "checkout", "purchase"],
      beat_license_type: ["basic", "premium", "unlimited", "exclusive"],
      beat_order_financial_state: [
        "normal",
        "refunded",
        "disputed",
        "recovered",
      ],
      beat_order_status: [
        "pending",
        "paid",
        "canceled",
        "refunded",
        "disputed",
      ],
      beat_purchase_status: ["active", "revoked", "refunded"],
      beat_status: ["draft", "published", "archived"],
      cms_document_status: [
        "draft",
        "review",
        "scheduled",
        "published",
        "archived",
      ],
      cms_document_type: ["article", "landing_page"],
      community_content_status: ["published", "hidden", "removed"],
      community_group_status: ["active", "archived"],
      community_group_visibility: ["public", "private"],
      community_member_role: ["member", "moderator", "owner"],
      community_member_status: ["active", "pending", "banned"],
      community_report_status: ["open", "reviewing", "resolved", "dismissed"],
      course_order_status: [
        "pending",
        "paid",
        "canceled",
        "refunded",
        "disputed",
      ],
      course_status: ["draft", "published", "archived"],
      discount_type: ["percent", "fixed"],
      enrollment_source: ["manual", "stripe", "admin"],
      enrollment_status: ["active", "revoked"],
      event_registration_status: ["confirmed", "cancelled", "attended"],
      event_status: ["draft", "upcoming", "live", "replay", "cancelled"],
      financial_account_type: [
        "platform_clearing",
        "platform_revenue",
        "producer_payable",
      ],
      financial_reversal_status: ["processed", "manual_review", "ignored"],
      ledger_event_type: [
        "beat_sale",
        "refund",
        "chargeback",
        "payout",
        "adjustment",
        "digital_product_sale",
        "payment_captured",
      ],
      ledger_transaction_status: ["posted", "reversed"],
      opportunity_application_status: [
        "submitted",
        "reviewing",
        "shortlisted",
        "accepted",
        "rejected",
        "withdrawn",
        "interview",
        "approved",
      ],
      opportunity_kind: [
        "job",
        "collab",
        "sync",
        "grant",
        "contest",
        "vaga",
        "freela",
        "colaboracao",
        "edital",
        "concurso",
      ],
      opportunity_status: ["draft", "pending", "open", "closed", "rejected"],
      payout_method_status: ["pending_verification", "verified", "disabled"],
      payout_method_type: ["pix", "bank_account"],
      payout_status: ["requested", "processing", "paid", "failed", "canceled"],
      promotion_reservation_status: ["reserved", "redeemed", "released"],
      reconciliation_item_status: [
        "matched",
        "missing_order",
        "amount_mismatch",
        "currency_mismatch",
        "status_mismatch",
      ],
      reconciliation_run_status: ["pending", "completed", "failed"],
      student_notification_category: ["course", "order", "community", "system"],
      student_theme: ["system", "light", "dark"],
      support_ticket_priority: ["low", "medium", "high"],
      support_ticket_status: ["open", "in_progress", "resolved"],
      user_role: [
        "student",
        "instructor",
        "producer",
        "admin",
        "super_admin",
        "affiliate",
        "company",
      ],
    },
  },
} as const
