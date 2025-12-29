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
      operators: {
        Row: {
          id: string;
          name: string;
          company_name: string | null;
          primary_language: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['operators']['Row']> & { id: string; name: string };
        Update: Partial<Database['public']['Tables']['operators']['Row']>;
      };
      tours: {
        Row: {
          id: string;
          operator_id: string;
          name: string;
          access_code: string;
          status: string;
          max_guests: number;
          livekit_room_name: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tours']['Row']> & { operator_id: string; name: string };
        Update: Partial<Database['public']['Tables']['tours']['Row']>;
      };
      participants: {
        Row: {
          id: string;
          tour_id: string;
          user_id: string | null;
          display_name: string;
          language: string;
          is_operator: boolean;
          joined_at: string;
          left_at: string | null;
          questions_asked: number;
        };
        Insert: Partial<Database['public']['Tables']['participants']['Row']> & { tour_id: string; display_name: string };
        Update: Partial<Database['public']['Tables']['participants']['Row']>;
      };
      archives: {
        Row: {
          id: string;
          tour_id: string;
          duration_seconds: number | null;
          guest_count: number | null;
          languages: string[] | null;
          question_count: number;
          operator_audio_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['archives']['Row']> & { tour_id: string };
        Update: Partial<Database['public']['Tables']['archives']['Row']>;
      };
      transcript_segments: {
        Row: {
          id: string;
          archive_id: string;
          speaker_id: string | null;
          speaker_name: string;
          speaker_role: string | null;
          original_text: string;
          original_language: string;
          translations: Json;
          timestamp_ms: number;
          duration_ms: number | null;
          is_question: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['transcript_segments']['Row']> & { archive_id: string; speaker_name: string; original_text: string; original_language: string; timestamp_ms: number };
        Update: Partial<Database['public']['Tables']['transcript_segments']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}