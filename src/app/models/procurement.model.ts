// src/app/models/procurement.model.ts

export interface Procurement {
  id: number;
  proc_number: string;
  project_description: string;
  programme?: string;
  name_of_institute?: string;
  estimated_value?: number;
  method_of_procurement?: string;
  bid_specification?: Date;
  advert?: Date;
  bid_closing?: Date;
  bid_evaluation?: Date;
  bid_award?: Date;
  campus_id: number;
  campus_name?: string;
  business_unit?: string;
  status_advertised: boolean;
  status_evaluated: boolean;
  status_awarded: boolean;
  overall_status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  responsible_user_id?: number;
  responsible_user_name?: string;
  comments?: string;
  source: 'excel_import' | 'manual_entry';
  created_at: Date;
  updated_at: Date;
  logs?: ProcurementLog[];
}

export interface ProcurementLog {
  id: number;
  procurement_id: number;
  user_id: number;
  user_name?: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  comment?: string;
  created_at: Date;
}

export interface ProcurementListResponse {
  data: Procurement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProcurementFilters {
  page?: number;
  limit?: number;
  campus_id?: number;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// FIXED: Allow strings for dates (from Excel/forms)
export interface CreateProcurementRequest {
  proc_number: string;
  project_description: string;
  programme?: string;
  name_of_institute?: string;
  estimated_value?: number;
  method_of_procurement?: string;
  bid_specification?: string | Date;  // ← Changed
  advert?: string | Date;              // ← Changed
  bid_closing?: string | Date;         // ← Changed
  bid_evaluation?: string | Date;      // ← Changed
  bid_award?: string | Date;           // ← Changed
  campus_id: number;
  business_unit?: string;
}

export interface UpdateStatusRequest {
  status_field: 'advert' | 'bid_evaluation' | 'bid_award' | 'bid_closing' | 'bid_specification';
  value: Date;
  comment?: string;
}