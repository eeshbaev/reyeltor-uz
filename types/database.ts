export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string;
          phone_visible?: boolean;
          email_visible?: boolean;
          telegram_username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          total_posted: number;
          total_rented: number;
          total_sold: number;
          total_expired: number;
          avg_days_on_market: number | null;
          close_rate: number | null;
          coin_balance: number;
          last_active_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone: string;
          email: string;
          phone_visible?: boolean;
          email_visible?: boolean;
          telegram_username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          total_posted?: number;
          total_rented?: number;
          total_sold?: number;
          total_expired?: number;
          avg_days_on_market?: number | null;
          close_rate?: number | null;
          coin_balance?: number;
          last_active_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          type: 'rent' | 'buy';
          price: number;
          rooms: number;
          area_m2: number;
          floor: number | null;
          total_floors: number | null;
          district: string;
          lat: number;
          lng: number;
          description: string | null;
          status: 'active' | 'archived' | 'deleted';
          archived_reason: 'rented' | 'sold' | 'expired' | 'manually_archived' | null;
          is_featured: boolean;
          view_count: number;
          posted_at: string;
          last_edited_at: string;
          expires_at: string;
          archived_at: string | null;
          deletes_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'rent' | 'buy';
          price: number;
          rooms: number;
          area_m2: number;
          floor?: number | null;
          total_floors?: number | null;
          district: string;
          lat: number;
          lng: number;
          description?: string | null;
          status?: 'active' | 'archived' | 'deleted';
          archived_reason?: 'rented' | 'sold' | 'expired' | 'manually_archived' | null;
          is_featured?: boolean;
          view_count?: number;
          posted_at?: string;
          last_edited_at?: string;
          expires_at?: string;
          archived_at?: string | null;
          deletes_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['listings']['Insert']>;
      };
      listing_photos: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          order_index: number;
        };
        Update: Partial<Database['public']['Tables']['listing_photos']['Insert']>;
      };
      price_history: {
        Row: {
          id: string;
          listing_id: string;
          old_price: number;
          new_price: number;
          changed_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          old_price: number;
          new_price: number;
          changed_at?: string;
        };
        Update: Partial<Database['public']['Tables']['price_history']['Insert']>;
      };
      flags: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string | null;
          reason: 'already_rented' | 'wrong_price' | 'fake_photos' | 'duplicate';
          device_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          user_id?: string | null;
          reason: 'already_rented' | 'wrong_price' | 'fake_photos' | 'duplicate';
          device_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['flags']['Insert']>;
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          saved_at?: string;
        };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'welcome' | 'checkin' | 'post_cost' | 'reactivation';
          listing_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'welcome' | 'checkin' | 'post_cost' | 'reactivation';
          listing_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['coin_transactions']['Insert']>;
      };
      checkin_log: {
        Row: {
          id: string;
          user_id: string;
          checked_in_on: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          checked_in_on: string;
        };
        Update: Partial<Database['public']['Tables']['checkin_log']['Insert']>;
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          platform: 'ios' | 'android';
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          platform: 'ios' | 'android';
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>;
      };
      notification_preferences: {
        Row: {
          user_id: string;
          listings_enabled: boolean;
          favorites_enabled: boolean;
          engagement_enabled: boolean;
          checkin_enabled: boolean;
          locale: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          listings_enabled?: boolean;
          favorites_enabled?: boolean;
          engagement_enabled?: boolean;
          checkin_enabled?: boolean;
          locale?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_preferences']['Insert']>;
      };
      notification_log: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          title: string;
          body: string;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          title: string;
          body: string;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_log']['Insert']>;
      };
      notification_dedup: {
        Row: {
          id: string;
          user_id: string;
          dedup_key: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dedup_key: string;
          sent_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_dedup']['Insert']>;
      };
    };
  };
}
