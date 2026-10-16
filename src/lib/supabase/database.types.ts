
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admins": {
                  Row: {
                    "created_at": string,"email": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"areas": {
                  Row: {
                    "created_at": string,"id": string,"is_retired": boolean,"label": string,"region": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label": string,"region"?: string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label"?: string,"region"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"bean_origins": {
                  Row: {
                    "created_at": string,"id": string,"is_retired": boolean,"label": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"preparation_methods": {
                  Row: {
                    "created_at": string,"id": string,"is_retired": boolean,"label": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"processing_methods": {
                  Row: {
                    "created_at": string,"id": string,"is_retired": boolean,"label": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"rate_limit_events": {
                  Row: {
                    "bucket": string,"created_at": string,"id": number,"key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"created_at"?: string,"id"?: never,"key": string
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"id"?: never,"key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"roast_levels": {
                  Row: {
                    "created_at": string,"id": string,"is_retired": boolean,"label": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_retired"?: boolean,"label"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"roasters": {
                  Row: {
                    "city": string | null,"created_at": string,"id": string,"name": string,"processing": (string)[],"shop_id": string | null,"slug": string,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"id"?: string,"name": string,"processing"?: (string)[],"shop_id"?: string | null,"slug": string,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"processing"?: (string)[],"shop_id"?: string | null,"slug"?: string,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "roasters_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: true
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_preparations": {
                  Row: {
                    "preparation_id": string,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "preparation_id": string,"shop_id": string
                  }
                  Update: {
                    "preparation_id"?: string,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_preparations_preparation_id_fkey"
      columns: ["preparation_id"]
isOneToOne: false
      referencedRelation: "preparation_methods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shop_preparations_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_revisions": {
                  Row: {
                    "action": Database["public"]['Enums']["revision_action"],"changed_at": string,"changed_by": string | null,"changes": NonNullable<Json>,"id": number,"shop_id": string,"snapshot": NonNullable<Json>,"txid": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": Database["public"]['Enums']["revision_action"],"changed_at"?: string,"changed_by"?: string | null,"changes"?: NonNullable<Json>,"id"?: never,"shop_id": string,"snapshot": NonNullable<Json>,"txid": number
                  }
                  Update: {
                    "action"?: Database["public"]['Enums']["revision_action"],"changed_at"?: string,"changed_by"?: string | null,"changes"?: NonNullable<Json>,"id"?: never,"shop_id"?: string,"snapshot"?: NonNullable<Json>,"txid"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_revisions_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_roasters": {
                  Row: {
                    "roaster_id": string,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "roaster_id": string,"shop_id": string
                  }
                  Update: {
                    "roaster_id"?: string,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_roasters_roaster_id_fkey"
      columns: ["roaster_id"]
isOneToOne: false
      referencedRelation: "roaster_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shop_roasters_roaster_id_fkey"
      columns: ["roaster_id"]
isOneToOne: false
      referencedRelation: "roasters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shop_roasters_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_slug_redirects": {
                  Row: {
                    "created_at": string,"shop_id": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"shop_id": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"shop_id"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_slug_redirects_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_submissions": {
                  Row: {
                    "address": string | null,"area_text": string | null,"created_at": string,"id": string,"ip_hash": string | null,"maps_url": string,"name": string,"notes": string | null,"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"shop_id": string | null,"status": Database["public"]['Enums']["submission_status"],"submitter_email": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"area_text"?: string | null,"created_at"?: string,"id"?: string,"ip_hash"?: string | null,"maps_url": string,"name": string,"notes"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"shop_id"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitter_email"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"area_text"?: string | null,"created_at"?: string,"id"?: string,"ip_hash"?: string | null,"maps_url"?: string,"name"?: string,"notes"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"shop_id"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitter_email"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_submissions_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_votes": {
                  Row: {
                    "created_at": string,"ip_hash": string,"shop_id": string,"updated_at": string,"value": number,"voter_token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ip_hash": string,"shop_id": string,"updated_at"?: string,"value": number,"voter_token": string
                  }
                  Update: {
                    "created_at"?: string,"ip_hash"?: string,"shop_id"?: string,"updated_at"?: string,"value"?: number,"voter_token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_votes_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shops": {
                  Row: {
                    "address": string,"area_id": string,"bean_origin": string,"cover_image_url": string | null,"created_at": string,"created_by": string | null,"description": string | null,"downvotes": number,"id": string,"instagram": string | null,"is_hidden": boolean,"lat": number | null,"lng": number | null,"maps_url": string | null,"name": string,"preparations": (string)[],"processing": (string)[],"roast_levels": (string)[],"roaster_ids": (string)[],"score": number,"search": unknown,"slug": string,"type": Database["public"]['Enums']["shop_type"],"updated_at": string,"updated_by": string | null,"upvotes": number,"website": string | null,"shop_tracked_fields": Json | null
                  }
                  ComputedFields: "shop_tracked_fields"
                  Insert: {
                    "address": string,"area_id": string,"bean_origin": string,"cover_image_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"downvotes"?: number,"id"?: string,"instagram"?: string | null,"is_hidden"?: boolean,"lat"?: number | null,"lng"?: number | null,"maps_url"?: string | null,"name": string,"preparations"?: (string)[],"processing"?: (string)[],"roast_levels"?: (string)[],"roaster_ids"?: (string)[],"score"?: number,"search"?: unknown,"slug": string,"type": Database["public"]['Enums']["shop_type"],"updated_at"?: string,"updated_by"?: string | null,"upvotes"?: number,"website"?: string | null
                  }
                  Update: {
                    "address"?: string,"area_id"?: string,"bean_origin"?: string,"cover_image_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"downvotes"?: number,"id"?: string,"instagram"?: string | null,"is_hidden"?: boolean,"lat"?: number | null,"lng"?: number | null,"maps_url"?: string | null,"name"?: string,"preparations"?: (string)[],"processing"?: (string)[],"roast_levels"?: (string)[],"roaster_ids"?: (string)[],"score"?: number,"search"?: unknown,"slug"?: string,"type"?: Database["public"]['Enums']["shop_type"],"updated_at"?: string,"updated_by"?: string | null,"upvotes"?: number,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shops_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shops_bean_origin_fkey"
      columns: ["bean_origin"]
isOneToOne: false
      referencedRelation: "bean_origins"
      referencedColumns: ["slug"]
    }
                  ]
                }
          }
          Views: {
            "roaster_directory": {
                  Row: {
                    "city": string | null,"id": string | null,"name": string | null,"processing": (string)[] | null,"shop_count": number | null,"shop_id": string | null,"slug": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "city"?: string | null,"id"?: string | null,"name"?: string | null,"processing"?: (string)[] | null,"shop_count"?: never,"shop_id"?: string | null,"slug"?: string | null,"website"?: string | null
                         }
                        Update: {
                           "city"?: string | null,"id"?: string | null,"name"?: string | null,"processing"?: (string)[] | null,"shop_count"?: never,"shop_id"?: string | null,"slug"?: string | null,"website"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "roasters_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: true
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "assert_options":
{ Args: { "p_label": string,"p_list": unknown,"p_values": (string)[] }; Returns: undefined
                           },
"cast_vote":
{ Args: { "p_ip_hash": string,"p_shop_id": string,"p_value": number,"p_voter_token": string }; Returns: {
              "downvotes": number,"upvotes": number,"value": number
            }[]
                           },
"find_similar_shops":
{ Args: { "p_area_id": string,"p_exclude_id"?: string,"p_name": string }; Returns: {
              "id": string,"is_hidden": boolean,"name": string,"slug": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"refresh_shop_votes":
{ Args: { "p_shop_id": string }; Returns: undefined
                           },
"refresh_vote_counters":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"save_shop":
{ Args: { "p_expected_updated_at"?: string,"p_new_roasters"?: Json,"p_preparation_ids": (string)[],"p_roaster_ids"?: (string)[],"p_shop": Json,"p_submission_id"?: string }; Returns: {
              "address": string,
"area_id": string,
"bean_origin": string,
"cover_image_url": string | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"downvotes": number,
"id": string,
"instagram": string | null,
"is_hidden": boolean,
"lat": number | null,
"lng": number | null,
"maps_url": string | null,
"name": string,
"preparations": (string)[],
"processing": (string)[],
"roast_levels": (string)[],
"roaster_ids": (string)[],
"score": number,
"search": unknown,
"slug": string,
"type": Database["public"]['Enums']["shop_type"],
"updated_at": string,
"updated_by": string | null,
"upvotes": number,
"website": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "shops"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_shops":
{ Args: { "p_areas"?: (string)[],"p_bean_origin"?: string,"p_limit"?: number,"p_offset"?: number,"p_preparations"?: (string)[],"p_processing"?: (string)[],"p_query"?: string,"p_roast"?: (string)[],"p_type"?: Database["public"]['Enums']["shop_type"] }; Returns: {
              "area_label": string,"area_slug": string,"bean_origin": string,"downvotes": number,"id": string,"name": string,"preparations": (string)[],"processing": (string)[],"roast_levels": (string)[],"score": number,"slug": string,"total_count": number,"type": Database["public"]['Enums']["shop_type"],"upvotes": number
            }[]
                           },
"shop_tracked_fields":
{ Args: { "s": Omit<Database["public"]['Tables']["shops"]['Row'], Database["public"]['Tables']["shops"]['ComputedFields']> }; Returns: Json
                           },
"slugify":
{ Args: { "value": string }; Returns: string
                           },
"submit_shop":
{ Args: { "p_ip_hash": string,"p_maps_url": string,"p_name": string,"p_notes": string,"p_submitter_email": string }; Returns: string
                           },
"unique_slug":
{ Args: { "p_fallback": string,"p_name": string,"p_table": unknown }; Returns: string
                           },
"vote_window":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            "revision_action": "create"|"update"|"hide"|"unhide","shop_type": "brewer"|"both","submission_status": "pending"|"approved"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "revision_action": ["create", "update", "hide", "unhide"],"shop_type": ["brewer", "both"],"submission_status": ["pending", "approved", "rejected"]
          }
        }
} as const
