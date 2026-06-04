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
      announcements: {
        Row: {
          audience: string[]
          author: string
          body: string
          expiry_date: string | null
          id: string
          publish_date: string
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
        }
        Insert: {
          audience: string[]
          author: string
          body: string
          expiry_date?: string | null
          id?: string
          publish_date?: string
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
        }
        Update: {
          audience?: string[]
          author?: string
          body?: string
          expiry_date?: string | null
          id?: string
          publish_date?: string
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
        }
        Relationships: [
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          label: string
          last_used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          label: string
          last_used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          label?: string
          last_used_at?: string | null
        }
        Relationships: [
        ]
      }
      certifications: {
        Row: {
          description: string | null
          icon: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id?: number
          image_url?: string | null
          name: string
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: number
          image_url?: string | null
          name?: string
        }
        Relationships: [
        ]
      }
      clearance_history: {
        Row: {
          admin_id: number | null
          changes_description: string | null
          created_at: string
          id: number
          new_level_id: number | null
          old_level_id: number | null
          user_id: number | null
        }
        Insert: {
          admin_id?: number | null
          changes_description?: string | null
          created_at?: string
          id?: number
          new_level_id?: number | null
          old_level_id?: number | null
          user_id?: number | null
        }
        Update: {
          admin_id?: number | null
          changes_description?: string | null
          created_at?: string
          id?: number
          new_level_id?: number | null
          old_level_id?: number | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clearance_history_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_history_new_level_id_fkey"
            columns: ["new_level_id"]
            isOneToOne: false
            referencedRelation: "security_clearances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_history_old_level_id_fkey"
            columns: ["old_level_id"]
            isOneToOne: false
            referencedRelation: "security_clearances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commendations: {
        Row: {
          description: string | null
          icon: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id?: number
          image_url?: string | null
          name: string
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: number
          image_url?: string | null
          name?: string
        }
        Relationships: [
        ]
      }
      conduct_records: {
        Row: {
          created_at: string
          entered_by_id: number
          id: number
          reason: string
          type: Database["public"]["Enums"]["conduct_record_type"]
          user_id: number
        }
        Insert: {
          created_at?: string
          entered_by_id: number
          id?: number
          reason: string
          type: Database["public"]["Enums"]["conduct_record_type"]
          user_id: number
        }
        Update: {
          created_at?: string
          entered_by_id?: number
          id?: number
          reason?: string
          type?: Database["public"]["Enums"]["conduct_record_type"]
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "conduct_records_entered_by_id_fkey"
            columns: ["entered_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conduct_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_summaries: {
        Row: {
          generated_at: string
          summary: string
          target_id: string
        }
        Insert: {
          generated_at?: string
          summary: string
          target_id: string
        }
        Update: {
          generated_at?: string
          summary?: string
          target_id?: string
        }
        Relationships: [
        ]
      }
      external_tools: {
        Row: {
          audience: string[]
          category: string | null
          created_at: string
          description: string
          icon: string
          id: number
          sort_order: number
          title: string
          url: string
        }
        Insert: {
          audience: string[]
          category?: string | null
          created_at?: string
          description: string
          icon: string
          id?: number
          sort_order?: number
          title: string
          url: string
        }
        Update: {
          audience?: string[]
          category?: string | null
          created_at?: string
          description?: string
          icon?: string
          id?: number
          sort_order?: number
          title?: string
          url?: string
        }
        Relationships: [
        ]
      }
      fleet_group_ships: {
        Row: {
          assigned_at: string | null
          fleet_group_id: number
          id: number
          sort_order: number
          user_ship_id: number
        }
        Insert: {
          assigned_at?: string | null
          fleet_group_id: number
          id?: number
          sort_order?: number
          user_ship_id: number
        }
        Update: {
          assigned_at?: string | null
          fleet_group_id?: number
          id?: number
          sort_order?: number
          user_ship_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fleet_group_ships_fleet_group_id_fkey"
            columns: ["fleet_group_id"]
            isOneToOne: false
            referencedRelation: "fleet_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_group_ships_user_ship_id_fkey"
            columns: ["user_ship_id"]
            isOneToOne: false
            referencedRelation: "user_ships"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_groups: {
        Row: {
          commander_id: number | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: number
          name: string
          parent_id: number | null
          sort_order: number | null
          type: string
        }
        Insert: {
          commander_id?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name: string
          parent_id?: number | null
          sort_order?: number | null
          type?: string
        }
        Update: {
          commander_id?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string
          parent_id?: number | null
          sort_order?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_groups_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fleet_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      government_branches: {
        Row: {
          branch_type: string
          created_at: string
          description: string | null
          icon: string | null
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          branch_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: never
          name: string
          sort_order?: number
        }
        Update: {
          branch_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: never
          name?: string
          sort_order?: number
        }
        Relationships: [
        ]
      }
      government_configs: {
        Row: {
          constitution_content: Json | null
          created_at: string
          description: string | null
          government_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          constitution_content?: Json | null
          created_at?: string
          description?: string | null
          government_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          constitution_content?: Json | null
          created_at?: string
          description?: string | null
          government_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
        ]
      }
      government_election_candidates: {
        Row: {
          declared_at: string
          election_id: number
          id: number
          is_winner: boolean
          platform_statement: string | null
          user_id: number
          vote_count: number | null
          vote_percentage: number | null
          withdrawn_at: string | null
        }
        Insert: {
          declared_at?: string
          election_id: number
          id?: never
          is_winner?: boolean
          platform_statement?: string | null
          user_id: number
          vote_count?: number | null
          vote_percentage?: number | null
          withdrawn_at?: string | null
        }
        Update: {
          declared_at?: string
          election_id?: number
          id?: never
          is_winner?: boolean
          platform_statement?: string | null
          user_id?: number
          vote_count?: number | null
          vote_percentage?: number | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "government_election_candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "government_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_election_candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_election_voter_registry: {
        Row: {
          election_id: number
          id: number
          user_id: number
          voted_at: string
        }
        Insert: {
          election_id: number
          id?: never
          user_id: number
          voted_at?: string
        }
        Update: {
          election_id?: number
          id?: never
          user_id?: number
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "government_election_voter_registry_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "government_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_election_voter_registry_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_election_votes: {
        Row: {
          candidate_id: number
          cast_at: string
          election_id: number
          id: string
          rank_order: number | null
          voter_hash: string
        }
        Insert: {
          candidate_id: number
          cast_at?: string
          election_id: number
          id?: string
          rank_order?: number | null
          voter_hash: string
        }
        Update: {
          candidate_id?: number
          cast_at?: string
          election_id?: number
          id?: string
          rank_order?: number | null
          voter_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "government_election_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "government_election_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_election_votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "government_elections"
            referencedColumns: ["id"]
          },
        ]
      }
      government_elections: {
        Row: {
          allow_runoff: boolean
          candidacy_end: string | null
          candidacy_start: string | null
          certified_at: string | null
          certified_by_id: number | null
          concluded_at: string | null
          conclusion_reason: string | null
          created_at: string
          created_by_id: number
          description: string | null
          election_type: string
          eligible_voter_count: number | null
          id: number
          is_by_election: boolean
          max_winners: number
          min_candidates: number
          min_vote_threshold_pct: number | null
          min_voter_turnout_pct: number | null
          parent_election_id: number | null
          position_id: number
          remaining_term_days: number | null
          runoff_top_n: number
          status: string
          title: string
          total_votes_cast: number | null
          updated_at: string
          voting_end: string | null
          voting_start: string | null
        }
        Insert: {
          allow_runoff?: boolean
          candidacy_end?: string | null
          candidacy_start?: string | null
          certified_at?: string | null
          certified_by_id?: number | null
          concluded_at?: string | null
          conclusion_reason?: string | null
          created_at?: string
          created_by_id: number
          description?: string | null
          election_type?: string
          eligible_voter_count?: number | null
          id?: never
          is_by_election?: boolean
          max_winners?: number
          min_candidates?: number
          min_vote_threshold_pct?: number | null
          min_voter_turnout_pct?: number | null
          parent_election_id?: number | null
          position_id: number
          remaining_term_days?: number | null
          runoff_top_n?: number
          status?: string
          title: string
          total_votes_cast?: number | null
          updated_at?: string
          voting_end?: string | null
          voting_start?: string | null
        }
        Update: {
          allow_runoff?: boolean
          candidacy_end?: string | null
          candidacy_start?: string | null
          certified_at?: string | null
          certified_by_id?: number | null
          concluded_at?: string | null
          conclusion_reason?: string | null
          created_at?: string
          created_by_id?: number
          description?: string | null
          election_type?: string
          eligible_voter_count?: number | null
          id?: never
          is_by_election?: boolean
          max_winners?: number
          min_candidates?: number
          min_vote_threshold_pct?: number | null
          min_voter_turnout_pct?: number | null
          parent_election_id?: number | null
          position_id?: number
          remaining_term_days?: number | null
          runoff_top_n?: number
          status?: string
          title?: string
          total_votes_cast?: number | null
          updated_at?: string
          voting_end?: string | null
          voting_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "government_elections_certified_by_id_fkey"
            columns: ["certified_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_elections_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_elections_parent_election_id_fkey"
            columns: ["parent_election_id"]
            isOneToOne: false
            referencedRelation: "government_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_elections_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "government_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      government_legislation: {
        Row: {
          author_id: number
          body: Json
          created_at: string
          id: number
          is_constitutional_amendment: boolean
          parent_legislation_id: number | null
          passed_at: string | null
          repealed_at: string | null
          repealed_by_legislation_id: number | null
          sponsor_position_id: number | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          veto_reason: string | null
          vetoed_at: string | null
          vetoed_by_id: number | null
          votes_abstain: number
          votes_against: number
          votes_for: number
          voting_end: string | null
          voting_start: string | null
        }
        Insert: {
          author_id: number
          body?: Json
          created_at?: string
          id?: never
          is_constitutional_amendment?: boolean
          parent_legislation_id?: number | null
          passed_at?: string | null
          repealed_at?: string | null
          repealed_by_legislation_id?: number | null
          sponsor_position_id?: number | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          veto_reason?: string | null
          vetoed_at?: string | null
          vetoed_by_id?: number | null
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
          voting_end?: string | null
          voting_start?: string | null
        }
        Update: {
          author_id?: number
          body?: Json
          created_at?: string
          id?: never
          is_constitutional_amendment?: boolean
          parent_legislation_id?: number | null
          passed_at?: string | null
          repealed_at?: string | null
          repealed_by_legislation_id?: number | null
          sponsor_position_id?: number | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          veto_reason?: string | null
          vetoed_at?: string | null
          vetoed_by_id?: number | null
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
          voting_end?: string | null
          voting_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "government_legislation_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_legislation_parent_legislation_id_fkey"
            columns: ["parent_legislation_id"]
            isOneToOne: false
            referencedRelation: "government_legislation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_legislation_repealed_by_legislation_id_fkey"
            columns: ["repealed_by_legislation_id"]
            isOneToOne: false
            referencedRelation: "government_legislation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_legislation_sponsor_position_id_fkey"
            columns: ["sponsor_position_id"]
            isOneToOne: false
            referencedRelation: "government_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_legislation_vetoed_by_id_fkey"
            columns: ["vetoed_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_legislation_comments: {
        Row: {
          content: string
          created_at: string
          id: number
          legislation_id: number
          user_id: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          legislation_id: number
          user_id: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          legislation_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "government_legislation_comments_legislation_id_fkey"
            columns: ["legislation_id"]
            isOneToOne: false
            referencedRelation: "government_legislation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_legislation_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_legislation_votes: {
        Row: {
          cast_at: string
          id: number
          legislation_id: number
          position_id: number
          user_id: number
          vote: string
        }
        Insert: {
          cast_at?: string
          id?: never
          legislation_id: number
          position_id: number
          user_id: number
          vote: string
        }
        Update: {
          cast_at?: string
          id?: never
          legislation_id?: number
          position_id?: number
          user_id?: number
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "government_legislation_votes_legislation_id_fkey"
            columns: ["legislation_id"]
            isOneToOne: false
            referencedRelation: "government_legislation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_legislation_votes_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "government_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_legislation_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_motion_votes: {
        Row: {
          cast_at: string
          id: number
          motion_id: number
          user_id: number | null
          vote: string
          voter_hash: string | null
        }
        Insert: {
          cast_at?: string
          id?: never
          motion_id: number
          user_id?: number | null
          vote: string
          voter_hash?: string | null
        }
        Update: {
          cast_at?: string
          id?: never
          motion_id?: number
          user_id?: number | null
          vote?: string
          voter_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "government_motion_votes_motion_id_fkey"
            columns: ["motion_id"]
            isOneToOne: false
            referencedRelation: "government_motions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_motion_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_motions: {
        Row: {
          concluded_at: string | null
          created_at: string
          created_by_id: number
          description: string | null
          id: number
          is_secret_ballot: boolean
          restricted_to_position_ids: number[] | null
          status: string
          title: string
          updated_at: string
          votes_abstain: number
          votes_against: number
          votes_for: number
          voting_end: string | null
          voting_start: string | null
        }
        Insert: {
          concluded_at?: string | null
          created_at?: string
          created_by_id: number
          description?: string | null
          id?: never
          is_secret_ballot?: boolean
          restricted_to_position_ids?: number[] | null
          status?: string
          title: string
          updated_at?: string
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
          voting_end?: string | null
          voting_start?: string | null
        }
        Update: {
          concluded_at?: string | null
          created_at?: string
          created_by_id?: number
          description?: string | null
          id?: never
          is_secret_ballot?: boolean
          restricted_to_position_ids?: number[] | null
          status?: string
          title?: string
          updated_at?: string
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
          voting_end?: string | null
          voting_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "government_motions_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_orders: {
        Row: {
          body: string
          created_at: string
          effective_at: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer_position_id: number
          issuer_user_id: number
          number: string | null
          preamble: string | null
          rationale: string | null
          related_legislation_id: string | null
          revoked_at: string | null
          revoked_by_position_id: number | null
          revoked_by_user_id: number | null
          revoked_reason: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer_position_id: number
          issuer_user_id: number
          number?: string | null
          preamble?: string | null
          rationale?: string | null
          related_legislation_id?: string | null
          revoked_at?: string | null
          revoked_by_position_id?: number | null
          revoked_by_user_id?: number | null
          revoked_reason?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer_position_id?: number
          issuer_user_id?: number
          number?: string | null
          preamble?: string | null
          rationale?: string | null
          related_legislation_id?: string | null
          revoked_at?: string | null
          revoked_by_position_id?: number | null
          revoked_by_user_id?: number | null
          revoked_reason?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "government_orders_issuer_position_id_fkey"
            columns: ["issuer_position_id"]
            isOneToOne: false
            referencedRelation: "government_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_orders_issuer_user_id_fkey"
            columns: ["issuer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_orders_revoked_by_position_id_fkey"
            columns: ["revoked_by_position_id"]
            isOneToOne: false
            referencedRelation: "government_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_orders_revoked_by_user_id_fkey"
            columns: ["revoked_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_position_holders: {
        Row: {
          appointed_by_id: number | null
          created_at: string
          election_id: number | null
          end_reason: string | null
          ended_at: string | null
          id: number
          position_id: number
          started_at: string
          user_id: number
        }
        Insert: {
          appointed_by_id?: number | null
          created_at?: string
          election_id?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: never
          position_id: number
          started_at?: string
          user_id: number
        }
        Update: {
          appointed_by_id?: number | null
          created_at?: string
          election_id?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: never
          position_id?: number
          started_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "government_position_holders_appointed_by_id_fkey"
            columns: ["appointed_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_position_holders_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "government_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_position_holders_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "government_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_position_holders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      government_positions: {
        Row: {
          branch_id: number | null
          can_call_elections: boolean
          can_issue_orders: boolean
          can_propose_legislation: boolean
          can_veto_legislation: boolean
          can_vote_legislation: boolean
          created_at: string
          description: string | null
          fill_method: string
          icon: string | null
          id: number
          max_holders: number
          name: string
          permissions_granted: string[]
          sort_order: number
          term_length_days: number | null
        }
        Insert: {
          branch_id?: number | null
          can_call_elections?: boolean
          can_issue_orders?: boolean
          can_propose_legislation?: boolean
          can_veto_legislation?: boolean
          can_vote_legislation?: boolean
          created_at?: string
          description?: string | null
          fill_method?: string
          icon?: string | null
          id?: never
          max_holders?: number
          name: string
          permissions_granted?: string[]
          sort_order?: number
          term_length_days?: number | null
        }
        Update: {
          branch_id?: number | null
          can_call_elections?: boolean
          can_issue_orders?: boolean
          can_propose_legislation?: boolean
          can_veto_legislation?: boolean
          can_vote_legislation?: boolean
          created_at?: string
          description?: string | null
          fill_method?: string
          icon?: string | null
          id?: never
          max_holders?: number
          name?: string
          permissions_granted?: string[]
          sort_order?: number
          term_length_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "government_positions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "government_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_application_logs: {
        Row: {
          action_type: string
          application_id: string | null
          created_at: string
          id: string
          message: string
          user_id: number | null
        }
        Insert: {
          action_type: string
          application_id?: string | null
          created_at?: string
          id?: string
          message: string
          user_id?: number | null
        }
        Update: {
          action_type?: string
          application_id?: string | null
          created_at?: string
          id?: string
          message?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_application_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "hr_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_application_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_applications: {
        Row: {
          applicant_discord_id: string
          applicant_name: string
          assigned_recruiter_id: number | null
          created_at: string
          id: string
          linked_user_id: number | null
          notes: string | null
          referral_source: string | null
          rsi_handle: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          vetting_data: Json | null
        }
        Insert: {
          applicant_discord_id: string
          applicant_name: string
          assigned_recruiter_id?: number | null
          created_at?: string
          id?: string
          linked_user_id?: number | null
          notes?: string | null
          referral_source?: string | null
          rsi_handle: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          vetting_data?: Json | null
        }
        Update: {
          applicant_discord_id?: string
          applicant_name?: string
          assigned_recruiter_id?: number | null
          created_at?: string
          id?: string
          linked_user_id?: number | null
          notes?: string | null
          referral_source?: string | null
          rsi_handle?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          vetting_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_applications_assigned_recruiter_id_fkey"
            columns: ["assigned_recruiter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_applications_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_interview_panel: {
        Row: {
          created_at: string
          id: number
          interview_id: string
          user_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          interview_id: string
          user_id: number
        }
        Update: {
          created_at?: string
          id?: number
          interview_id?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_interview_panel_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "hr_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_interview_panel_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_interview_questions: {
        Row: {
          id: number
          order_index: number
          question_text: string
          template_id: number | null
        }
        Insert: {
          id?: number
          order_index: number
          question_text: string
          template_id?: number | null
        }
        Update: {
          id?: number
          order_index?: number
          question_text?: string
          template_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_interview_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "hr_interview_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_interview_responses: {
        Row: {
          id: number
          interview_id: string | null
          question_id: number | null
          response_body: string | null
          score: number | null
        }
        Insert: {
          id?: number
          interview_id?: string | null
          question_id?: number | null
          response_body?: string | null
          score?: number | null
        }
        Update: {
          id?: number
          interview_id?: string | null
          question_id?: number | null
          response_body?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_interview_responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "hr_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_interview_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "hr_interview_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_interview_templates: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: [
        ]
      }
      hr_interviews: {
        Row: {
          application_id: string | null
          completed_at: string | null
          final_score: number | null
          id: string
          interviewer_id: number | null
          is_recommended: boolean | null
          overall_notes: string | null
          scheduled_at: string | null
          status: string | null
          template_id: number | null
        }
        Insert: {
          application_id?: string | null
          completed_at?: string | null
          final_score?: number | null
          id?: string
          interviewer_id?: number | null
          is_recommended?: boolean | null
          overall_notes?: string | null
          scheduled_at?: string | null
          status?: string | null
          template_id?: number | null
        }
        Update: {
          application_id?: string | null
          completed_at?: string | null
          final_score?: number | null
          id?: string
          interviewer_id?: number | null
          is_recommended?: boolean | null
          overall_notes?: string | null
          scheduled_at?: string | null
          status?: string | null
          template_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "hr_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_interviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "hr_interview_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_job_applications: {
        Row: {
          applicant_id: number | null
          created_at: string
          id: string
          job_id: string | null
          statement: string | null
          status: string | null
        }
        Insert: {
          applicant_id?: number | null
          created_at?: string
          id?: string
          job_id?: string | null
          statement?: string | null
          status?: string | null
        }
        Update: {
          applicant_id?: number | null
          created_at?: string
          id?: string
          job_id?: string | null
          statement?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_job_postings: {
        Row: {
          created_at: string
          created_by_id: number | null
          department: string
          description: string
          id: string
          position_id: number | null
          requirements: string[]
          status: Database["public"]["Enums"]["job_posting_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by_id?: number | null
          department: string
          description: string
          id?: string
          position_id?: number | null
          requirements?: string[]
          status?: Database["public"]["Enums"]["job_posting_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by_id?: number | null
          department?: string
          description?: string
          id?: string
          position_id?: number | null
          requirements?: string[]
          status?: Database["public"]["Enums"]["job_posting_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_job_postings_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_postings_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "personnel_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_transfer_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          current_unit_id: number | null
          id: string
          reason: string
          status: Database["public"]["Enums"]["transfer_request_status"]
          target_unit_id: number | null
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          current_unit_id?: number | null
          id?: string
          reason: string
          status?: Database["public"]["Enums"]["transfer_request_status"]
          target_unit_id?: number | null
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          current_unit_id?: number | null
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["transfer_request_status"]
          target_unit_id?: number | null
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_transfer_requests_current_unit_id_fkey"
            columns: ["current_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_transfer_requests_target_unit_id_fkey"
            columns: ["target_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_transfer_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_bulletin_limiting_markers: {
        Row: {
          bulletin_id: string
          marker_id: number
        }
        Insert: {
          bulletin_id: string
          marker_id: number
        }
        Update: {
          bulletin_id?: string
          marker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "intel_bulletin_limiting_markers_bulletin_id_fkey"
            columns: ["bulletin_id"]
            isOneToOne: false
            referencedRelation: "intel_bulletins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intel_bulletin_limiting_markers_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "security_limiting_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_bulletins: {
        Row: {
          body: string
          classification_level: number
          created_at: string
          created_by_id: number | null
          duration_minutes: number
          expires_at: string
          id: string
          location: string | null
          shared_with_allies: boolean | null
          source_bulletin_id: string | null
          source_organization_id: string | null
          source_organization_name: string | null
          threat_level: string
          title: string
        }
        Insert: {
          body: string
          classification_level?: number
          created_at?: string
          created_by_id?: number | null
          duration_minutes?: number
          expires_at: string
          id?: string
          location?: string | null
          shared_with_allies?: boolean | null
          source_bulletin_id?: string | null
          source_organization_id?: string | null
          source_organization_name?: string | null
          threat_level?: string
          title: string
        }
        Update: {
          body?: string
          classification_level?: number
          created_at?: string
          created_by_id?: number | null
          duration_minutes?: number
          expires_at?: string
          id?: string
          location?: string | null
          shared_with_allies?: boolean | null
          source_bulletin_id?: string | null
          source_organization_id?: string | null
          source_organization_name?: string | null
          threat_level?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "intel_bulletins_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intel_bulletins_source_bulletin_id_fkey"
            columns: ["source_bulletin_id"]
            isOneToOne: false
            referencedRelation: "intel_bulletins"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_report_limiting_markers: {
        Row: {
          marker_id: number
          report_id: string
        }
        Insert: {
          marker_id: number
          report_id: string
        }
        Update: {
          marker_id?: number
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intel_report_limiting_markers_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "security_limiting_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intel_report_limiting_markers_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "intel_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_reports: {
        Row: {
          affiliated_org: string | null
          classification_level: number
          created_at: string
          created_by_id: number | null
          evidence_urls: string[] | null
          external_author: string | null
          external_id: string | null
          id: string
          source_feed_id: string | null
          subject_type: Database["public"]["Enums"]["intel_subject_type"]
          summary: string
          tags: string[] | null
          target_id: string
          threat_level: Database["public"]["Enums"]["intel_threat_level"]
        }
        Insert: {
          affiliated_org?: string | null
          classification_level?: number
          created_at?: string
          created_by_id?: number | null
          evidence_urls?: string[] | null
          external_author?: string | null
          external_id?: string | null
          id?: string
          source_feed_id?: string | null
          subject_type: Database["public"]["Enums"]["intel_subject_type"]
          summary: string
          tags?: string[] | null
          target_id: string
          threat_level: Database["public"]["Enums"]["intel_threat_level"]
        }
        Update: {
          affiliated_org?: string | null
          classification_level?: number
          created_at?: string
          created_by_id?: number | null
          evidence_urls?: string[] | null
          external_author?: string | null
          external_id?: string | null
          id?: string
          source_feed_id?: string | null
          subject_type?: Database["public"]["Enums"]["intel_subject_type"]
          summary?: string
          tags?: string[] | null
          target_id?: string
          threat_level?: Database["public"]["Enums"]["intel_threat_level"]
        }
        Relationships: [
          {
            foreignKeyName: "intel_reports_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          id: number
          name: string
          parent_id: number | null
          type: Database["public"]["Enums"]["location_type"]
        }
        Insert: {
          id?: number
          name: string
          parent_id?: number | null
          type: Database["public"]["Enums"]["location_type"]
        }
        Update: {
          id?: number
          name?: string
          parent_id?: number | null
          type?: Database["public"]["Enums"]["location_type"]
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_aar_entries: {
        Row: {
          author_id: number
          category: string
          content: string
          created_at: string
          id: number
          operation_id: string
          upvotes: number
        }
        Insert: {
          author_id: number
          category?: string
          content: string
          created_at?: string
          id?: never
          operation_id: string
          upvotes?: number
        }
        Update: {
          author_id?: number
          category?: string
          content?: string
          created_at?: string
          id?: never
          operation_id?: string
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "operation_aar_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_aar_entries_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_allied_orgs: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          id: number
          invited_at: string
          operation_id: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          id?: never
          invited_at?: string
          operation_id: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          id?: never
          invited_at?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_allied_orgs_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_board_elements: {
        Row: {
          color: string | null
          created_at: string
          data: Json
          element_type: string
          height: number | null
          id: number
          label: string | null
          layer: number
          operation_id: string
          pos_x: number
          pos_y: number
          rotation: number
          sort_order: number
          width: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          data?: Json
          element_type?: string
          height?: number | null
          id?: never
          label?: string | null
          layer?: number
          operation_id: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          sort_order?: number
          width?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          data?: Json
          element_type?: string
          height?: number | null
          id?: never
          label?: string | null
          layer?: number
          operation_id?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          sort_order?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_board_elements_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_command_nodes: {
        Row: {
          assigned_unit_id: number | null
          assigned_user_id: number | null
          color: string | null
          created_at: string
          fleet_group_id: number | null
          icon: string | null
          id: number
          label: string
          live_status: string | null
          node_type: string
          operation_id: string
          parent_id: number | null
          pos_x: number
          pos_y: number
          sort_order: number
        }
        Insert: {
          assigned_unit_id?: number | null
          assigned_user_id?: number | null
          color?: string | null
          created_at?: string
          fleet_group_id?: number | null
          icon?: string | null
          id?: never
          label: string
          live_status?: string | null
          node_type?: string
          operation_id: string
          parent_id?: number | null
          pos_x?: number
          pos_y?: number
          sort_order?: number
        }
        Update: {
          assigned_unit_id?: number | null
          assigned_user_id?: number | null
          color?: string | null
          created_at?: string
          fleet_group_id?: number | null
          icon?: string | null
          id?: never
          label?: string
          live_status?: string | null
          node_type?: string
          operation_id?: string
          parent_id?: number | null
          pos_x?: number
          pos_y?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "operation_command_nodes_assigned_unit_id_fkey"
            columns: ["assigned_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_command_nodes_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_command_nodes_fleet_group_id_fkey"
            columns: ["fleet_group_id"]
            isOneToOne: false
            referencedRelation: "fleet_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_command_nodes_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_command_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "operation_command_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_limiting_markers: {
        Row: {
          marker_id: number
          operation_id: string
        }
        Insert: {
          marker_id: number
          operation_id: string
        }
        Update: {
          marker_id?: number
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_limiting_markers_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "security_limiting_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_limiting_markers_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_locations: {
        Row: {
          created_at: string
          is_primary: boolean
          location_id: number
          operation_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          location_id: number
          operation_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          location_id?: number
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_locations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_log_entries: {
        Row: {
          author_id: number | null
          cost_category: string | null
          cost_description: string | null
          created_at: string
          entry_type: string
          id: number
          log_entry: string
          operation_id: string
          uec_amount: number | null
        }
        Insert: {
          author_id?: number | null
          cost_category?: string | null
          cost_description?: string | null
          created_at?: string
          entry_type: string
          id?: number
          log_entry: string
          operation_id: string
          uec_amount?: number | null
        }
        Update: {
          author_id?: number | null
          cost_category?: string | null
          cost_description?: string | null
          created_at?: string
          entry_type?: string
          id?: number
          log_entry?: string
          operation_id?: string
          uec_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_log_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_log_entries_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_logistics: {
        Row: {
          category: string
          created_at: string
          fulfilled_by_org_id: string | null
          fulfilled_by_user_id: number | null
          id: number
          item_name: string
          notes: string | null
          operation_id: string
          quantity_fulfilled: number
          quantity_needed: number
          status: string
        }
        Insert: {
          category?: string
          created_at?: string
          fulfilled_by_org_id?: string | null
          fulfilled_by_user_id?: number | null
          id?: never
          item_name: string
          notes?: string | null
          operation_id: string
          quantity_fulfilled?: number
          quantity_needed?: number
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          fulfilled_by_org_id?: string | null
          fulfilled_by_user_id?: number | null
          id?: never
          item_name?: string
          notes?: string | null
          operation_id?: string
          quantity_fulfilled?: number
          quantity_needed?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_logistics_fulfilled_by_user_id_fkey"
            columns: ["fulfilled_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_logistics_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_participants: {
        Row: {
          attendance_status: string | null
          is_ready: boolean | null
          joined_at: string
          live_status: string | null
          operation_id: string
          payout_paid_at: string | null
          payout_paid_by: number | null
          payout_share_percent: number | null
          role_requested: string | null
          rsvp_at: string | null
          rsvp_status: string | null
          ship_id: number | null
          ship_utilized: string | null
          user_id: number
          user_ship_id: number | null
        }
        Insert: {
          attendance_status?: string | null
          is_ready?: boolean | null
          joined_at?: string
          live_status?: string | null
          operation_id: string
          payout_paid_at?: string | null
          payout_paid_by?: number | null
          payout_share_percent?: number | null
          role_requested?: string | null
          rsvp_at?: string | null
          rsvp_status?: string | null
          ship_id?: number | null
          ship_utilized?: string | null
          user_id: number
          user_ship_id?: number | null
        }
        Update: {
          attendance_status?: string | null
          is_ready?: boolean | null
          joined_at?: string
          live_status?: string | null
          operation_id?: string
          payout_paid_at?: string | null
          payout_paid_by?: number | null
          payout_share_percent?: number | null
          role_requested?: string | null
          rsvp_at?: string | null
          rsvp_status?: string | null
          ship_id?: number | null
          ship_utilized?: string | null
          user_id?: number
          user_ship_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_participants_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_participants_payout_paid_by_fkey"
            columns: ["payout_paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_participants_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "platform_ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_participants_user_ship_id_fkey"
            columns: ["user_ship_id"]
            isOneToOne: false
            referencedRelation: "user_ships"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_phases: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: number
          name: string
          operation_id: string
          phase_type: string
          sort_order: number
          status: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: never
          name: string
          operation_id: string
          phase_type?: string
          sort_order?: number
          status?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: never
          name?: string
          operation_id?: string
          phase_type?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_phases_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_reminders: {
        Row: {
          created_at: string | null
          id: string
          operation_id: string
          remind_at: string
          sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_id: string
          remind_at: string
          sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_id?: string
          remind_at?: string
          sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_reminders_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_schedule_entries: {
        Row: {
          created_at: string
          id: number
          label: string
          notes: string | null
          operation_id: string
          phase_id: number | null
          scheduled_time: string | null
          sort_order: number
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          label: string
          notes?: string | null
          operation_id: string
          phase_id?: number | null
          scheduled_time?: string | null
          sort_order?: number
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          label?: string
          notes?: string | null
          operation_id?: string
          phase_id?: number | null
          scheduled_time?: string | null
          sort_order?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_schedule_entries_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_schedule_entries_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "operation_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_tasks: {
        Row: {
          assigned_unit_id: number | null
          assigned_user_id: number | null
          created_at: string
          description: string | null
          id: number
          operation_id: string
          phase_id: number | null
          priority: string
          sort_order: number
          status: string
          task_type: string
          title: string
        }
        Insert: {
          assigned_unit_id?: number | null
          assigned_user_id?: number | null
          created_at?: string
          description?: string | null
          id?: never
          operation_id: string
          phase_id?: number | null
          priority?: string
          sort_order?: number
          status?: string
          task_type?: string
          title: string
        }
        Update: {
          assigned_unit_id?: number | null
          assigned_user_id?: number | null
          created_at?: string
          description?: string | null
          id?: never
          operation_id?: string
          phase_id?: number | null
          priority?: string
          sort_order?: number
          status?: string
          task_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_tasks_assigned_unit_id_fkey"
            columns: ["assigned_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_tasks_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "operation_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_templates: {
        Row: {
          created_at: string
          created_by: number | null
          description: string | null
          id: number
          name: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: number | null
          description?: string | null
          id?: never
          name: string
          payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: number | null
          description?: string | null
          id?: never
          name?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          aar_ai_generated_at: string | null
          aar_lessons_learned: string | null
          aar_submitted_at: string | null
          aar_submitted_by: number | null
          aar_summary: string | null
          active_end_time: string | null
          active_start_time: string | null
          additional_location_texts: string[]
          clearance_level: number | null
          commander_notes: string | null
          comms_plan: Json
          created_at: string
          description: string | null
          discord_announcement_channel_id: string | null
          discord_announcement_message_id: string | null
          id: string
          is_joint: boolean
          is_special: boolean | null
          is_training: boolean | null
          join_code: string | null
          live_status: string | null
          location_id: number | null
          location_text: string | null
          max_participants: number | null
          name: string
          owner_id: number | null
          payout_mode: string
          roe: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["operation_status"]
          total_costs: number
          total_uec: number | null
          tracks_uec: boolean | null
          type: Database["public"]["Enums"]["operation_type"]
          unit_id: number | null
          updated_at: string
        }
        Insert: {
          aar_ai_generated_at?: string | null
          aar_lessons_learned?: string | null
          aar_submitted_at?: string | null
          aar_submitted_by?: number | null
          aar_summary?: string | null
          active_end_time?: string | null
          active_start_time?: string | null
          additional_location_texts?: string[]
          clearance_level?: number | null
          commander_notes?: string | null
          comms_plan?: Json
          created_at?: string
          description?: string | null
          discord_announcement_channel_id?: string | null
          discord_announcement_message_id?: string | null
          id?: string
          is_joint?: boolean
          is_special?: boolean | null
          is_training?: boolean | null
          join_code?: string | null
          live_status?: string | null
          location_id?: number | null
          location_text?: string | null
          max_participants?: number | null
          name: string
          owner_id?: number | null
          payout_mode?: string
          roe?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          total_costs?: number
          total_uec?: number | null
          tracks_uec?: boolean | null
          type: Database["public"]["Enums"]["operation_type"]
          unit_id?: number | null
          updated_at?: string
        }
        Update: {
          aar_ai_generated_at?: string | null
          aar_lessons_learned?: string | null
          aar_submitted_at?: string | null
          aar_submitted_by?: number | null
          aar_summary?: string | null
          active_end_time?: string | null
          active_start_time?: string | null
          additional_location_texts?: string[]
          clearance_level?: number | null
          commander_notes?: string | null
          comms_plan?: Json
          created_at?: string
          description?: string | null
          discord_announcement_channel_id?: string | null
          discord_announcement_message_id?: string | null
          id?: string
          is_joint?: boolean
          is_special?: boolean | null
          is_training?: boolean | null
          join_code?: string | null
          live_status?: string | null
          location_id?: number | null
          location_text?: string | null
          max_participants?: number | null
          name?: string
          owner_id?: number | null
          payout_mode?: string
          roe?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          total_costs?: number
          total_uec?: number | null
          tracks_uec?: boolean | null
          type?: Database["public"]["Enums"]["operation_type"]
          unit_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_aar_submitted_by_fkey"
            columns: ["aar_submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          description: string | null
          id: number
          name: string
        }
        Insert: {
          category: string
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          category?: string
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      personnel_positions: {
        Row: {
          created_at: string | null
          department: string | null
          description: string | null
          icon: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string
        }
        Relationships: [
        ]
      }
      platform_locations: {
        Row: {
          amenities: Json
          code: string | null
          created_at: string
          external_id: number
          faction_name: string | null
          id: number
          is_armistice: boolean | null
          is_available_live: boolean | null
          is_decommissioned: boolean | null
          is_hidden: boolean
          is_internal: boolean
          is_landable: boolean | null
          is_visible: boolean | null
          jurisdiction_name: string | null
          kind: string
          last_synced_at: string | null
          name: string
          nickname: string | null
          pad_types: string | null
          parent_id: number | null
          path: string | null
          star_system_id: number | null
          uex_date_added: number | null
          uex_date_modified: number | null
          updated_at: string
          wiki_url: string | null
        }
        Insert: {
          amenities?: Json
          code?: string | null
          created_at?: string
          external_id: number
          faction_name?: string | null
          id?: never
          is_armistice?: boolean | null
          is_available_live?: boolean | null
          is_decommissioned?: boolean | null
          is_hidden?: boolean
          is_internal?: boolean
          is_landable?: boolean | null
          is_visible?: boolean | null
          jurisdiction_name?: string | null
          kind: string
          last_synced_at?: string | null
          name: string
          nickname?: string | null
          pad_types?: string | null
          parent_id?: number | null
          path?: string | null
          star_system_id?: number | null
          uex_date_added?: number | null
          uex_date_modified?: number | null
          updated_at?: string
          wiki_url?: string | null
        }
        Update: {
          amenities?: Json
          code?: string | null
          created_at?: string
          external_id?: number
          faction_name?: string | null
          id?: never
          is_armistice?: boolean | null
          is_available_live?: boolean | null
          is_decommissioned?: boolean | null
          is_hidden?: boolean
          is_internal?: boolean
          is_landable?: boolean | null
          is_visible?: boolean | null
          jurisdiction_name?: string | null
          kind?: string
          last_synced_at?: string | null
          name?: string
          nickname?: string | null
          pad_types?: string | null
          parent_id?: number | null
          path?: string | null
          star_system_id?: number | null
          uex_date_added?: number | null
          uex_date_modified?: number | null
          updated_at?: string
          wiki_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "platform_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_locations_star_system_id_fkey"
            columns: ["star_system_id"]
            isOneToOne: false
            referencedRelation: "platform_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ships: {
        Row: {
          beam: number | null
          career: string | null
          cargo_capacity: number | null
          created_at: string | null
          crew_max: number | null
          crew_min: number | null
          description: string | null
          external_api_id: number | null
          external_uuid: string | null
          health: number | null
          height: number | null
          id: number
          image_url: string | null
          length: number | null
          manufacturer: string
          manufacturer_code: string | null
          mass: number | null
          max_speed: number | null
          msrp: number | null
          name: string
          pledge_url: string | null
          production_status: string | null
          role: string | null
          scm_speed: number | null
          shield_hp: number | null
          size: string | null
          updated_at: string | null
          wiki_url: string | null
        }
        Insert: {
          beam?: number | null
          career?: string | null
          cargo_capacity?: number | null
          created_at?: string | null
          crew_max?: number | null
          crew_min?: number | null
          description?: string | null
          external_api_id?: number | null
          external_uuid?: string | null
          health?: number | null
          height?: number | null
          id?: number
          image_url?: string | null
          length?: number | null
          manufacturer: string
          manufacturer_code?: string | null
          mass?: number | null
          max_speed?: number | null
          msrp?: number | null
          name: string
          pledge_url?: string | null
          production_status?: string | null
          role?: string | null
          scm_speed?: number | null
          shield_hp?: number | null
          size?: string | null
          updated_at?: string | null
          wiki_url?: string | null
        }
        Update: {
          beam?: number | null
          career?: string | null
          cargo_capacity?: number | null
          created_at?: string | null
          crew_max?: number | null
          crew_min?: number | null
          description?: string | null
          external_api_id?: number | null
          external_uuid?: string | null
          health?: number | null
          height?: number | null
          id?: number
          image_url?: string | null
          length?: number | null
          manufacturer?: string
          manufacturer_code?: string | null
          mass?: number | null
          max_speed?: number | null
          msrp?: number | null
          name?: string
          pledge_url?: string | null
          production_status?: string | null
          role?: string | null
          scm_speed?: number | null
          shield_hp?: number | null
          size?: string | null
          updated_at?: string | null
          wiki_url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string | null
          id: string
          last_used_at: string
          p256dh: string | null
          subscription: Json | null
          user_agent: string | null
          user_id: number
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          last_used_at?: string
          p256dh?: string | null
          subscription?: Json | null
          user_agent?: string | null
          user_id: number
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          last_used_at?: string
          p256dh?: string | null
          subscription?: Json | null
          user_agent?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quartermaster_catalog: {
        Row: {
          attributes: Json
          category: string
          color: string | null
          color2: string | null
          company_name: string | null
          created_at: string
          external_id: number | null
          external_uuid: string | null
          game_version: string | null
          id: number
          is_commodity: boolean
          is_harvestable: boolean
          is_vehicle_item: boolean
          last_synced_at: string | null
          name: string
          platform_category_id: number | null
          quality: number | null
          screenshot_url: string | null
          size_label: string | null
          slug: string
          source: string
          store_url: string | null
          subcategory: string | null
          thumbnail_url: string | null
          updated_at: string
          vehicle_name: string | null
          wiki_url: string | null
        }
        Insert: {
          attributes?: Json
          category: string
          color?: string | null
          color2?: string | null
          company_name?: string | null
          created_at?: string
          external_id?: number | null
          external_uuid?: string | null
          game_version?: string | null
          id?: never
          is_commodity?: boolean
          is_harvestable?: boolean
          is_vehicle_item?: boolean
          last_synced_at?: string | null
          name: string
          platform_category_id?: number | null
          quality?: number | null
          screenshot_url?: string | null
          size_label?: string | null
          slug: string
          source?: string
          store_url?: string | null
          subcategory?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vehicle_name?: string | null
          wiki_url?: string | null
        }
        Update: {
          attributes?: Json
          category?: string
          color?: string | null
          color2?: string | null
          company_name?: string | null
          created_at?: string
          external_id?: number | null
          external_uuid?: string | null
          game_version?: string | null
          id?: never
          is_commodity?: boolean
          is_harvestable?: boolean
          is_vehicle_item?: boolean
          last_synced_at?: string | null
          name?: string
          platform_category_id?: number | null
          quality?: number | null
          screenshot_url?: string | null
          size_label?: string | null
          slug?: string
          source?: string
          store_url?: string | null
          subcategory?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vehicle_name?: string | null
          wiki_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quartermaster_catalog_platform_category_id_fkey"
            columns: ["platform_category_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_platform_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quartermaster_inventory: {
        Row: {
          acquired_at: string
          catalog_id: number | null
          condition: string
          created_at: string
          custom_name: string | null
          id: number
          is_archived: boolean
          location_id: number | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          acquired_at?: string
          catalog_id?: number | null
          condition?: string
          created_at?: string
          custom_name?: string | null
          id?: never
          is_archived?: boolean
          location_id?: number | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          acquired_at?: string
          catalog_id?: number | null
          condition?: string
          created_at?: string
          custom_name?: string | null
          id?: never
          is_archived?: boolean
          location_id?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quartermaster_inventory_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quartermaster_inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      quartermaster_inventory_movements: {
        Row: {
          actor_user_id: number
          created_at: string
          delta: number
          id: string
          inventory_id: number
          notes: string | null
          reason: string
          related_issuance_id: number | null
        }
        Insert: {
          actor_user_id: number
          created_at?: string
          delta: number
          id?: string
          inventory_id: number
          notes?: string | null
          reason: string
          related_issuance_id?: number | null
        }
        Update: {
          actor_user_id?: number
          created_at?: string
          delta?: number
          id?: string
          inventory_id?: number
          notes?: string | null
          reason?: string
          related_issuance_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qm_movements_related_issuance_fk"
            columns: ["related_issuance_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_issuances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quartermaster_inventory_movements_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quartermaster_inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      quartermaster_issuances: {
        Row: {
          closed_by_user_id: number | null
          created_at: string
          due_back_at: string | null
          id: number
          inventory_id: number
          issued_at: string | null
          issued_by_user_id: number | null
          issued_to_user_id: number
          notes: string | null
          operation_id: number | null
          outcome: string | null
          quantity: number
          requested_at: string | null
          requested_by_user_id: number | null
          returned_at: string | null
          returned_quantity: number | null
          status: string
          updated_at: string
        }
        Insert: {
          closed_by_user_id?: number | null
          created_at?: string
          due_back_at?: string | null
          id?: never
          inventory_id: number
          issued_at?: string | null
          issued_by_user_id?: number | null
          issued_to_user_id: number
          notes?: string | null
          operation_id?: number | null
          outcome?: string | null
          quantity: number
          requested_at?: string | null
          requested_by_user_id?: number | null
          returned_at?: string | null
          returned_quantity?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          closed_by_user_id?: number | null
          created_at?: string
          due_back_at?: string | null
          id?: never
          inventory_id?: number
          issued_at?: string | null
          issued_by_user_id?: number | null
          issued_to_user_id?: number
          notes?: string | null
          operation_id?: number | null
          outcome?: string | null
          quantity?: number
          requested_at?: string | null
          requested_by_user_id?: number | null
          returned_at?: string | null
          returned_quantity?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quartermaster_issuances_closed_by_user_id_fkey"
            columns: ["closed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quartermaster_issuances_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quartermaster_issuances_issued_by_user_id_fkey"
            columns: ["issued_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quartermaster_issuances_issued_to_user_id_fkey"
            columns: ["issued_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quartermaster_issuances_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quartermaster_locations: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          parent_id: number | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          name: string
          parent_id?: number | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          name?: string
          parent_id?: number | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quartermaster_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      quartermaster_platform_categories: {
        Row: {
          created_at: string
          display_name: string
          id: number
          is_hidden: boolean
          sort_order: number
          uex_category_id: number
          uex_category_name: string
          uex_section: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: never
          is_hidden?: boolean
          sort_order?: number
          uex_category_id: number
          uex_category_name: string
          uex_section?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: never
          is_hidden?: boolean
          sort_order?: number
          uex_category_id?: number
          uex_category_name?: string
          uex_section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      radio_channels: {
        Row: {
          color: string | null
          id: string
          name: string
          sort_order: number | null
          type: string | null
        }
        Insert: {
          color?: string | null
          id: string
          name: string
          sort_order?: number | null
          type?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          type?: string | null
        }
        Relationships: [
        ]
      }
      rank_mappings: {
        Row: {
          discord_role_id: string
          rank_id: number | null
          role_id: number | null
        }
        Insert: {
          discord_role_id: string
          rank_id?: number | null
          role_id?: number | null
        }
        Update: {
          discord_role_id?: string
          rank_id?: number | null
          role_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_mappings_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_mappings_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ranks: {
        Row: {
          icon_url: string | null
          id: number
          name: string
          sort_order: number | null
        }
        Insert: {
          icon_url?: string | null
          id?: number
          name: string
          sort_order?: number | null
        }
        Update: {
          icon_url?: string | null
          id?: number
          name?: string
          sort_order?: number | null
        }
        Relationships: [
        ]
      }
      reputation_history: {
        Row: {
          admin_user_id: number
          change_date: string
          id: number
          new_reputation: number
          old_reputation: number
          reason: string
          user_id: number | null
        }
        Insert: {
          admin_user_id: number
          change_date?: string
          id?: number
          new_reputation: number
          old_reputation: number
          reason: string
          user_id?: number | null
        }
        Update: {
          admin_user_id?: number
          change_date?: string
          id?: number
          new_reputation?: number
          old_reputation?: number
          reason?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reputation_history_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      request_responders: {
        Row: {
          request_id: string
          user_id: number
        }
        Insert: {
          request_id: string
          user_id: number
        }
        Update: {
          request_id?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_responders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_responders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: number
          role_id: number
        }
        Insert: {
          permission_id: number
          role_id: number
        }
        Update: {
          permission_id?: number
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: number
          is_system: boolean | null
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          is_system?: boolean | null
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          is_system?: boolean | null
          name?: string
        }
        Relationships: [
        ]
      }
      security_clearances: {
        Row: {
          description: string | null
          id: number
          level: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          level: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          level?: number
          name?: string
        }
        Relationships: [
        ]
      }
      security_limiting_markers: {
        Row: {
          code: string
          description: string | null
          id: number
          name: string
          sync_restricted: boolean | null
        }
        Insert: {
          code: string
          description?: string | null
          id?: number
          name: string
          sync_restricted?: boolean | null
        }
        Update: {
          code?: string
          description?: string | null
          id?: number
          name?: string
          sync_restricted?: boolean | null
        }
        Relationships: [
        ]
      }
      service_requests: {
        Row: {
          client_feedback: string | null
          client_id: number | null
          client_rating: number | null
          created_at: string
          description: string
          discord_message_id: string | null
          id: string
          lead_responder_id: number | null
          location: string
          medigel_consumed: number | null
          notes: string | null
          party_info: string | null
          rated: boolean | null
          secondary_client_handles: string[] | null
          service_type: string
          status: Database["public"]["Enums"]["service_request_status"]
          threat_level: Database["public"]["Enums"]["threat_level"]
          uec_earned: number | null
          unregistered_client_rsi_handle: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          client_feedback?: string | null
          client_id?: number | null
          client_rating?: number | null
          created_at?: string
          description: string
          discord_message_id?: string | null
          id: string
          lead_responder_id?: number | null
          location: string
          medigel_consumed?: number | null
          notes?: string | null
          party_info?: string | null
          rated?: boolean | null
          secondary_client_handles?: string[] | null
          service_type: string
          status: Database["public"]["Enums"]["service_request_status"]
          threat_level?: Database["public"]["Enums"]["threat_level"]
          uec_earned?: number | null
          unregistered_client_rsi_handle?: string | null
          updated_at?: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          client_feedback?: string | null
          client_id?: number | null
          client_rating?: number | null
          created_at?: string
          description?: string
          discord_message_id?: string | null
          id?: string
          lead_responder_id?: number | null
          location?: string
          medigel_consumed?: number | null
          notes?: string | null
          party_info?: string | null
          rated?: boolean | null
          secondary_client_handles?: string[] | null
          service_type?: string
          status?: Database["public"]["Enums"]["service_request_status"]
          threat_level?: Database["public"]["Enums"]["threat_level"]
          uec_earned?: number | null
          unregistered_client_rsi_handle?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_lead_responder_id_fkey"
            columns: ["lead_responder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          discord_channel_id: string | null
          icon: string | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discord_channel_id?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discord_channel_id?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json | null
        }
        Insert: {
          key: string
          value?: Json | null
        }
        Update: {
          key?: string
          value?: Json | null
        }
        Relationships: [
        ]
      }
      specialization_tags: {
        Row: {
          description: string | null
          icon: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id?: number
          image_url?: string | null
          name: string
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: number
          image_url?: string | null
          name?: string
        }
        Relationships: [
        ]
      }
      status_history: {
        Row: {
          id: number
          note: string | null
          request_id: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          id?: number
          note?: string | null
          request_id?: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          id?: number
          note?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_discord_roles: {
        Row: {
          color: string
          id: string
          name: string
        }
        Insert: {
          color: string
          id: string
          name: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
        }
        Relationships: [
        ]
      }
      treasury_accounts: {
        Row: {
          balance_cached: number
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          balance_cached?: number
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          balance_cached?: number
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
        ]
      }
      treasury_ledger_entries: {
        Row: {
          account_id: number
          amount: number
          approved_at: string | null
          approved_by_user_id: number | null
          counterparty_text: string | null
          counterparty_user_id: number | null
          created_at: string
          created_by_user_id: number
          entry_type: string
          id: string
          memo: string | null
          notes: string | null
          operation_id: number | null
          related_entry_id: string | null
          related_inventory_id: number | null
          status: string
          transfer_group_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: number
          amount: number
          approved_at?: string | null
          approved_by_user_id?: number | null
          counterparty_text?: string | null
          counterparty_user_id?: number | null
          created_at?: string
          created_by_user_id: number
          entry_type: string
          id?: string
          memo?: string | null
          notes?: string | null
          operation_id?: number | null
          related_entry_id?: string | null
          related_inventory_id?: number | null
          status?: string
          transfer_group_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: number
          amount?: number
          approved_at?: string | null
          approved_by_user_id?: number | null
          counterparty_text?: string | null
          counterparty_user_id?: number | null
          created_at?: string
          created_by_user_id?: number
          entry_type?: string
          id?: string
          memo?: string | null
          notes?: string | null
          operation_id?: number | null
          related_entry_id?: string | null
          related_inventory_id?: number | null
          status?: string
          transfer_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_ledger_entries_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_ledger_entries_counterparty_user_id_fkey"
            columns: ["counterparty_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_ledger_entries_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_ledger_entries_related_entry_id_fkey"
            columns: ["related_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_posts: {
        Row: {
          author_id: number | null
          content: string
          created_at: string
          id: string
          pinned: boolean | null
          unit_id: number
        }
        Insert: {
          author_id?: number | null
          content: string
          created_at?: string
          id?: string
          pinned?: boolean | null
          unit_id: number
        }
        Update: {
          author_id?: number | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean | null
          unit_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_posts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          banner_url: string | null
          description: string | null
          has_radio_channel: boolean
          id: number
          is_restricted: boolean
          leader_id: number | null
          linked_channel_id: string | null
          logo_url: string | null
          motto: string | null
          name: string
          parent_unit_id: number | null
          sort_order: number | null
        }
        Insert: {
          banner_url?: string | null
          description?: string | null
          has_radio_channel?: boolean
          id?: number
          is_restricted?: boolean
          leader_id?: number | null
          linked_channel_id?: string | null
          logo_url?: string | null
          motto?: string | null
          name: string
          parent_unit_id?: number | null
          sort_order?: number | null
        }
        Update: {
          banner_url?: string | null
          description?: string | null
          has_radio_channel?: boolean
          id?: number
          is_restricted?: boolean
          leader_id?: number | null
          linked_channel_id?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          parent_unit_id?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "units_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certifications: {
        Row: {
          awarded_at: string
          awarded_by: number | null
          certification_id: number
          user_id: number
        }
        Insert: {
          awarded_at?: string
          awarded_by?: number | null
          certification_id: number
          user_id: number
        }
        Update: {
          awarded_at?: string
          awarded_by?: number | null
          certification_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_certifications_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_commendations: {
        Row: {
          awarded_at: string
          awarded_by: number | null
          commendation_id: number | null
          id: number
          reason: string
          user_id: number | null
        }
        Insert: {
          awarded_at?: string
          awarded_by?: number | null
          commendation_id?: number | null
          id?: number
          reason: string
          user_id?: number | null
        }
        Update: {
          awarded_at?: string
          awarded_by?: number | null
          commendation_id?: number | null
          id?: number
          reason?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_commendations_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_commendations_commendation_id_fkey"
            columns: ["commendation_id"]
            isOneToOne: false
            referencedRelation: "commendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_commendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hr_position_history: {
        Row: {
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: number
          position_id: number
          started_at: string
          user_id: number
        }
        Insert: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: never
          position_id: number
          started_at?: string
          user_id: number
        }
        Update: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: never
          position_id?: number
          started_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_hr_position_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "personnel_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hr_position_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_limiting_markers: {
        Row: {
          marker_id: number
          user_id: number
        }
        Insert: {
          marker_id: number
          user_id: number
        }
        Update: {
          marker_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_limiting_markers_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "security_limiting_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_limiting_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          avatar_refreshed_at: string | null
          last_active_at: string | null
          user_id: number
        }
        Insert: {
          avatar_refreshed_at?: string | null
          last_active_at?: string | null
          user_id: number
        }
        Update: {
          avatar_refreshed_at?: string | null
          last_active_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ships: {
        Row: {
          created_at: string | null
          custom_name: string | null
          id: number
          is_primary: boolean | null
          loadout_notes: string | null
          ship_id: number
          status: Database["public"]["Enums"]["ship_status"]
          user_id: number
        }
        Insert: {
          created_at?: string | null
          custom_name?: string | null
          id?: number
          is_primary?: boolean | null
          loadout_notes?: string | null
          ship_id: number
          status?: Database["public"]["Enums"]["ship_status"]
          user_id: number
        }
        Update: {
          created_at?: string | null
          custom_name?: string | null
          id?: number
          is_primary?: boolean | null
          loadout_notes?: string | null
          ship_id?: number
          status?: Database["public"]["Enums"]["ship_status"]
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_ships_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "platform_ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_specializations: {
        Row: {
          specialization_id: number
          user_id: number
        }
        Insert: {
          specialization_id: number
          user_id: number
        }
        Update: {
          specialization_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_specializations_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specialization_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_specializations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          admin_notes: string | null
          auth_user_id: string | null
          avatar_refreshed_at: string | null
          avatar_url: string | null
          clearance_level_id: number | null
          created_at: string
          date_format: string | null
          deleted_at: string | null
          discord_id: string
          discord_synced_at: string | null
          display_name: string | null
          id: number
          is_affiliate: boolean
          is_duty: boolean
          is_vip: boolean
          job_title: string | null
          last_active_at: string | null
          name: string
          personnel_notes: string | null
          position_id: number | null
          probation_end: string | null
          probation_start: string | null
          rank_id: number | null
          reputation: number
          role_id: number
          rsi_handle: string
          rsi_handle_pending: string | null
          rsi_verification_code: string | null
          secondary_position_id: number | null
          tenure_start_date: string | null
          timezone: string | null
          unit_id: number | null
          voice_channel_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          auth_user_id?: string | null
          avatar_refreshed_at?: string | null
          avatar_url?: string | null
          clearance_level_id?: number | null
          created_at?: string
          date_format?: string | null
          deleted_at?: string | null
          discord_id: string
          discord_synced_at?: string | null
          display_name?: string | null
          id?: number
          is_affiliate?: boolean
          is_duty?: boolean
          is_vip?: boolean
          job_title?: string | null
          last_active_at?: string | null
          name: string
          personnel_notes?: string | null
          position_id?: number | null
          probation_end?: string | null
          probation_start?: string | null
          rank_id?: number | null
          reputation?: number
          role_id: number
          rsi_handle: string
          rsi_handle_pending?: string | null
          rsi_verification_code?: string | null
          secondary_position_id?: number | null
          tenure_start_date?: string | null
          timezone?: string | null
          unit_id?: number | null
          voice_channel_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          auth_user_id?: string | null
          avatar_refreshed_at?: string | null
          avatar_url?: string | null
          clearance_level_id?: number | null
          created_at?: string
          date_format?: string | null
          deleted_at?: string | null
          discord_id?: string
          discord_synced_at?: string | null
          display_name?: string | null
          id?: number
          is_affiliate?: boolean
          is_duty?: boolean
          is_vip?: boolean
          job_title?: string | null
          last_active_at?: string | null
          name?: string
          personnel_notes?: string | null
          position_id?: number | null
          probation_end?: string | null
          probation_start?: string | null
          rank_id?: number | null
          reputation?: number
          role_id?: number
          rsi_handle?: string
          rsi_handle_pending?: string | null
          rsi_verification_code?: string | null
          secondary_position_id?: number | null
          tenure_start_date?: string | null
          timezone?: string | null
          unit_id?: number | null
          voice_channel_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_clearance_level_id_fkey"
            columns: ["clearance_level_id"]
            isOneToOne: false
            referencedRelation: "security_clearances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "personnel_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_secondary_position_id_fkey"
            columns: ["secondary_position_id"]
            isOneToOne: false
            referencedRelation: "personnel_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_catalog: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          description: string | null
          id: number
          name: string
          quality_label: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: never
          name: string
          quality_label?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: never
          name?: string
          quality_label?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
        ]
      }
      warehouse_movements: {
        Row: {
          actor_user_id: number
          created_at: string
          delta: number
          id: string
          notes: string | null
          reason: string
          related_contract_id: string | null
          related_movement_id: string | null
          related_request_id: string | null
          stock_id: number
        }
        Insert: {
          actor_user_id: number
          created_at?: string
          delta: number
          id?: string
          notes?: string | null
          reason: string
          related_contract_id?: string | null
          related_movement_id?: string | null
          related_request_id?: string | null
          stock_id: number
        }
        Update: {
          actor_user_id?: number
          created_at?: string
          delta?: number
          id?: string
          notes?: string | null
          reason?: string
          related_contract_id?: string | null
          related_movement_id?: string | null
          related_request_id?: string | null
          stock_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_movements_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_movements_related_movement_id_fkey"
            columns: ["related_movement_id"]
            isOneToOne: false
            referencedRelation: "warehouse_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_movements_related_request_fk"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "warehouse_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_movements_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_stock_with_qty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_movements_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "warehouse_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_platform_categories: {
        Row: {
          created_at: string
          display_name: string
          id: number
          is_hidden: boolean
          slug: string
          sort_order: number
          uex_kind: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: never
          is_hidden?: boolean
          slug: string
          sort_order?: number
          uex_kind: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: never
          is_hidden?: boolean
          slug?: string
          sort_order?: number
          uex_kind?: string
          updated_at?: string
        }
        Relationships: []
      }
      warehouse_platform_commodities: {
        Row: {
          code: string | null
          created_at: string
          external_id: number
          external_uuid: string | null
          id: number
          is_available: boolean | null
          is_available_live: boolean | null
          is_buggy: boolean | null
          is_buyable: boolean | null
          is_explosive: boolean | null
          is_extractable: boolean | null
          is_fuel: boolean | null
          is_harvestable: boolean | null
          is_illegal: boolean | null
          is_inert: boolean | null
          is_mineral: boolean | null
          is_pure: boolean | null
          is_raw: boolean | null
          is_refinable: boolean | null
          is_refined: boolean | null
          is_sellable: boolean | null
          is_temporary: boolean | null
          is_visible: boolean | null
          is_volatile_qt: boolean | null
          is_volatile_time: boolean | null
          kind: string | null
          last_synced_at: string | null
          name: string
          platform_category_id: number | null
          price_buy: number | null
          price_sell: number | null
          slug: string
          uex_date_added: number | null
          uex_date_modified: number | null
          updated_at: string
          weight_scu: number | null
          wiki_url: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          external_id: number
          external_uuid?: string | null
          id?: never
          is_available?: boolean | null
          is_available_live?: boolean | null
          is_buggy?: boolean | null
          is_buyable?: boolean | null
          is_explosive?: boolean | null
          is_extractable?: boolean | null
          is_fuel?: boolean | null
          is_harvestable?: boolean | null
          is_illegal?: boolean | null
          is_inert?: boolean | null
          is_mineral?: boolean | null
          is_pure?: boolean | null
          is_raw?: boolean | null
          is_refinable?: boolean | null
          is_refined?: boolean | null
          is_sellable?: boolean | null
          is_temporary?: boolean | null
          is_visible?: boolean | null
          is_volatile_qt?: boolean | null
          is_volatile_time?: boolean | null
          kind?: string | null
          last_synced_at?: string | null
          name: string
          platform_category_id?: number | null
          price_buy?: number | null
          price_sell?: number | null
          slug: string
          uex_date_added?: number | null
          uex_date_modified?: number | null
          updated_at?: string
          weight_scu?: number | null
          wiki_url?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          external_id?: number
          external_uuid?: string | null
          id?: never
          is_available?: boolean | null
          is_available_live?: boolean | null
          is_buggy?: boolean | null
          is_buyable?: boolean | null
          is_explosive?: boolean | null
          is_extractable?: boolean | null
          is_fuel?: boolean | null
          is_harvestable?: boolean | null
          is_illegal?: boolean | null
          is_inert?: boolean | null
          is_mineral?: boolean | null
          is_pure?: boolean | null
          is_raw?: boolean | null
          is_refinable?: boolean | null
          is_refined?: boolean | null
          is_sellable?: boolean | null
          is_temporary?: boolean | null
          is_visible?: boolean | null
          is_volatile_qt?: boolean | null
          is_volatile_time?: boolean | null
          kind?: string | null
          last_synced_at?: string | null
          name?: string
          platform_category_id?: number | null
          price_buy?: number | null
          price_sell?: number | null
          slug?: string
          uex_date_added?: number | null
          uex_date_modified?: number | null
          updated_at?: string
          weight_scu?: number | null
          wiki_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_platform_commodities_platform_category_id_fkey"
            columns: ["platform_category_id"]
            isOneToOne: false
            referencedRelation: "warehouse_platform_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_requests: {
        Row: {
          approved_at: string | null
          approved_by_user_id: number | null
          created_at: string
          denial_reason: string | null
          fulfilled_at: string | null
          fulfilled_movement_id: string | null
          id: string
          reason_category: string
          reason_notes: string | null
          requested_by_user_id: number
          requested_quantity: number
          status: string
          stock_id: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: number | null
          created_at?: string
          denial_reason?: string | null
          fulfilled_at?: string | null
          fulfilled_movement_id?: string | null
          id?: string
          reason_category: string
          reason_notes?: string | null
          requested_by_user_id: number
          requested_quantity: number
          status?: string
          stock_id: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: number | null
          created_at?: string
          denial_reason?: string | null
          fulfilled_at?: string | null
          fulfilled_movement_id?: string | null
          id?: string
          reason_category?: string
          reason_notes?: string | null
          requested_by_user_id?: number
          requested_quantity?: number
          status?: string
          stock_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_requests_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_requests_fulfilled_movement_id_fkey"
            columns: ["fulfilled_movement_id"]
            isOneToOne: false
            referencedRelation: "warehouse_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_requests_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "v_warehouse_stock_with_qty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_requests_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "warehouse_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_stock: {
        Row: {
          catalog_id: number
          created_at: string
          id: number
          location_id: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          catalog_id: number
          created_at?: string
          id?: never
          location_id: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          catalog_id?: number
          created_at?: string
          id?: never
          location_id?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "warehouse_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      warrant_notes: {
        Row: {
          author_id: number | null
          content: string
          created_at: string
          id: number
          warrant_id: string
        }
        Insert: {
          author_id?: number | null
          content: string
          created_at?: string
          id?: never
          warrant_id: string
        }
        Update: {
          author_id?: number | null
          content?: string
          created_at?: string
          id?: never
          warrant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warrant_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warrant_notes_warrant_id_fkey"
            columns: ["warrant_id"]
            isOneToOne: false
            referencedRelation: "warrants"
            referencedColumns: ["id"]
          },
        ]
      }
      warrants: {
        Row: {
          action: Database["public"]["Enums"]["warrant_action"]
          claimed_at: string | null
          claimed_by: number | null
          created_at: string
          external_id: string | null
          id: string
          issued_by: number
          notes: string | null
          reason: string
          source_feed_id: string | null
          status: Database["public"]["Enums"]["warrant_status"]
          target_rsi_handle: string
          uec_reward: number
          updated_at: string
        }
        Insert: {
          action: Database["public"]["Enums"]["warrant_action"]
          claimed_at?: string | null
          claimed_by?: number | null
          created_at?: string
          external_id?: string | null
          id?: string
          issued_by: number
          notes?: string | null
          reason: string
          source_feed_id?: string | null
          status?: Database["public"]["Enums"]["warrant_status"]
          target_rsi_handle: string
          uec_reward: number
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["warrant_action"]
          claimed_at?: string | null
          claimed_by?: number | null
          created_at?: string
          external_id?: string | null
          id?: string
          issued_by?: number
          notes?: string | null
          reason?: string
          source_feed_id?: string | null
          status?: Database["public"]["Enums"]["warrant_status"]
          target_rsi_handle?: string
          uec_reward?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warrants_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warrants_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_limiting_markers: {
        Row: {
          marker_id: number
          page_id: string
        }
        Insert: {
          marker_id: number
          page_id: string
        }
        Update: {
          marker_id?: number
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_limiting_markers_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "security_limiting_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_limiting_markers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_pages: {
        Row: {
          classification_level: number | null
          content: Json | null
          created_at: string
          created_by_id: number | null
          id: string
          menu_structure_locked: boolean
          parent_page_id: string | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
          updated_by_id: number | null
        }
        Insert: {
          classification_level?: number | null
          content?: Json | null
          created_at?: string
          created_by_id?: number | null
          id?: string
          menu_structure_locked?: boolean
          parent_page_id?: string | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
          updated_by_id?: number | null
        }
        Update: {
          classification_level?: number | null
          content?: Json | null
          created_at?: string
          created_by_id?: number | null
          id?: string
          menu_structure_locked?: boolean
          parent_page_id?: string | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
          updated_by_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_pages_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_position_history_unified: {
        Row: {
          end_reason: string | null
          ended_at: string | null
          id: number | null
          kind: string | null
          position_description: string | null
          position_icon: string | null
          position_id: number | null
          position_name: string | null
          started_at: string | null
          user_id: number | null
        }
        Relationships: []
      }
      v_warehouse_stock_with_qty: {
        Row: {
          catalog_id: number | null
          created_at: string | null
          id: number | null
          location_id: number | null
          notes: string | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          updated_at: string | null
        }
        Insert: {
          catalog_id?: number | null
          created_at?: string | null
          id?: number | null
          location_id?: number | null
          notes?: string | null
          quantity_on_hand?: never
          quantity_reserved?: never
          updated_at?: string | null
        }
        Update: {
          catalog_id?: number | null
          created_at?: string | null
          id?: number | null
          location_id?: number | null
          notes?: string | null
          quantity_on_hand?: never
          quantity_reserved?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "warehouse_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "quartermaster_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_cost_to_operation: {
        Args: { amount_to_add: number; op_id: string }
        Returns: undefined
      }
      add_uec_to_operation: {
        Args: { amount_to_add: number; op_id: string }
        Returns: undefined
      }
      admin_adjust_reputation: {
        Args: {
          admin_id_in: number
          new_reputation_in: number
          reason_in: string
          user_id_in: number
        }
        Returns: undefined
      }
      finance_approve_entry: {
        Args: { p_approver_id: number; p_entry_id: string }
        Returns: number
      }
      finance_reconcile_balances: {
        Args: never
        Returns: {
          account_id: number
          cached: number
          computed: number
          delta: number
        }[]
      }
      finance_reject_entry: {
        Args: { p_approver_id: number; p_entry_id: string; p_reason: string }
        Returns: number
      }
      finance_reverse_entry: {
        Args: { p_actor_id: number; p_entry_id: string; p_reason: string }
        Returns: string
      }
      get_org_secret: {
        Args: { p_name: string; p_org_id: string }
        Returns: string
      }
      public_stats_for_org: {
        Args: { org_id: string }
        Returns: {
          avg_rating_times10: number
          avg_response_minutes: number
          last30_completed: number
          total_completed: number
        }[]
      }
      qm_adjust_inventory: {
        Args: {
          p_actor_id: number
          p_delta: number
          p_inventory_id: number
          p_notes: string
          p_reason: string
        }
        Returns: string
      }
      qm_fulfil_issuance: {
        Args: { p_actor_id: number; p_issuance_id: number }
        Returns: number
      }
      qm_issue_bulk: {
        Args: {
          p_actor_id: number
          p_due_back_at: string
          p_issued_to: number
          p_lines: Json
          p_notes: string
          p_operation_id: number
        }
        Returns: number[]
      }
      qm_issue_direct: {
        Args: {
          p_actor_id: number
          p_due_back_at: string
          p_inventory_id: number
          p_issued_to: number
          p_notes: string
          p_operation_id: number
          p_quantity: number
        }
        Returns: number
      }
      qm_overview_stats: {
        Args: { p_org_id: string }
        Returns: {
          distinct_skus: number
          items_on_issue: number
          overdue_count: number
          pending_requests: number
          total_items: number
        }[]
      }
      qm_return_bulk: {
        Args: { p_actor_id: number; p_lines: Json; p_notes: string }
        Returns: number
      }
      qm_return_issuance: {
        Args: {
          p_actor_id: number
          p_issuance_id: number
          p_notes: string
          p_outcome: string
          p_returned_qty: number
        }
        Returns: number
      }
      qm_write_off_issuance: {
        Args: {
          p_actor_id: number
          p_issuance_id: number
          p_notes: string
          p_outcome: string
        }
        Returns: number
      }
      warehouse_adjust_stock: {
        Args: {
          p_actor_id: number
          p_delta: number
          p_notes: string
          p_reason: string
          p_stock_id: number
        }
        Returns: string
      }
      warehouse_fulfil_request: {
        Args: { p_actor_id: number; p_request_id: string }
        Returns: string
      }
      warehouse_marketplace_deliver: {
        Args: { p_actor_id: number; p_contract_id: string }
        Returns: string
      }
      warehouse_marketplace_reverse: {
        Args: {
          p_actor_id: number
          p_contract_id: string
          p_reason_text: string
        }
        Returns: string
      }
      warehouse_overview_stats: {
        Args: { p_org_id: string }
        Returns: {
          low_stock_count: number
          open_request_count: number
          total_on_hand: number
          total_reserved: number
          total_stocks: number
        }[]
      }
      warehouse_transfer_stock: {
        Args: {
          p_actor_id: number
          p_from_stock_id: number
          p_notes: string
          p_quantity: number
          p_to_stock_id: number
        }
        Returns: string
      }
    }
    Enums: {
      alliance_status: "Pending" | "Active" | "Dissolved"
      alliance_type: "Alliance" | "Rivalry" | "Neutral"
      announcement_type: "Information" | "Warning" | "Danger"
      application_status:
        | "Applied"
        | "Screening"
        | "Interviewing"
        | "On Hold"
        | "Offered"
        | "Rejected"
        | "Accepted"
        | "Hired"
        | "Withdrawn"
      conduct_record_type:
        | "Commendation"
        | "Observation"
        | "Counseling"
        | "Warning"
        | "Infraction"
      intel_subject_type: "Person" | "Organization"
      intel_threat_level: "None" | "Low" | "Medium" | "High" | "Critical"
      job_posting_status: "Draft" | "Open" | "Closed" | "Filled"
      location_type: "System" | "Planet" | "Moon" | "Station" | "Facility"
      operation_status: "Planning" | "Scheduled" | "Active" | "Concluded"
      operation_type:
        | "PvP"
        | "PvE"
        | "Non-Combat"
        | "Training"
        | "Social"
        | "Mixed"
      service_request_status:
        | "Submitted"
        | "Triaged"
        | "Accepted"
        | "In-Progress"
        | "Success"
        | "Failed"
        | "Cancelled"
        | "Refused"
        | "Aborted"
        | "GameError"
      ship_status: "Active" | "Stored" | "Damaged" | "Lent" | "Sold"
      threat_level: "None" | "Low" | "Medium" | "High" | "Critical" | "PVP"
      transfer_request_status: "Pending" | "Approved" | "Denied" | "Cancelled"
      urgency_level: "Low" | "Medium" | "High" | "Critical"
      warrant_action: "Caution" | "High Caution" | "Extreme Caution"
      warrant_status: "Active" | "Claimed" | "Cancelled" | "Standing"
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
      alliance_status: ["Pending", "Active", "Dissolved"],
      alliance_type: ["Alliance", "Rivalry", "Neutral"],
      announcement_type: ["Information", "Warning", "Danger"],
      application_status: [
        "Applied",
        "Screening",
        "Interviewing",
        "On Hold",
        "Offered",
        "Rejected",
        "Accepted",
        "Hired",
        "Withdrawn",
      ],
      conduct_record_type: [
        "Commendation",
        "Observation",
        "Counseling",
        "Warning",
        "Infraction",
      ],
      intel_subject_type: ["Person", "Organization"],
      intel_threat_level: ["None", "Low", "Medium", "High", "Critical"],
      job_posting_status: ["Draft", "Open", "Closed", "Filled"],
      location_type: ["System", "Planet", "Moon", "Station", "Facility"],
      operation_status: ["Planning", "Scheduled", "Active", "Concluded"],
      operation_type: [
        "PvP",
        "PvE",
        "Non-Combat",
        "Training",
        "Social",
        "Mixed",
      ],
      service_request_status: [
        "Submitted",
        "Triaged",
        "Accepted",
        "In-Progress",
        "Success",
        "Failed",
        "Cancelled",
        "Refused",
        "Aborted",
        "GameError",
      ],
      ship_status: ["Active", "Stored", "Damaged", "Lent", "Sold"],
      threat_level: ["None", "Low", "Medium", "High", "Critical", "PVP"],
      transfer_request_status: ["Pending", "Approved", "Denied", "Cancelled"],
      urgency_level: ["Low", "Medium", "High", "Critical"],
      warrant_action: ["Caution", "High Caution", "Extreme Caution"],
      warrant_status: ["Active", "Claimed", "Cancelled", "Standing"],
    },
  },
} as const
