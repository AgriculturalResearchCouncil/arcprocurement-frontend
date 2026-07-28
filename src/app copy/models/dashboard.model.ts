export interface DashboardSummary {
  total_procurements: number;
  pending_count: number;
  in_progress_count: number;
  completed_count: number;
  overdue_count: number;
  recent_procurements: RecentProcurement[];
}

export interface RecentProcurement {
  id: number;
  proc_number: string;
  project_description: string;
  overall_status: string;
  bid_closing: Date;
  campus_name: string;
}

export interface CampusProcurement {
  campus_id: number;
  campus_name: string;
  count: number;
}

export interface StatusDistribution {
  labels: string[];
  data: number[];
}

export interface TrendData {
  month: string;
  count: number;
}

export interface Notification {
  id: number;
  procurement_id: number;
  user_id: number;
  type: 'reminder' | 'overdue' | 'update';
  message: string;
  status: 'pending' | 'sent' | 'read';
  created_at: Date;
  sent_at?: Date;
  proc_number?: string;
}