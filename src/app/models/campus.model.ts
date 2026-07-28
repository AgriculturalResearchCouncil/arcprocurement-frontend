export interface Campus {
  id: number;
  name: string;
  campus_name?: string;
  location?: string;  // Make location optional (string | undefined)
  created_at?: string;  // Make created_at optional
}

// Add this for the dashboard API response
export interface CampusProcurement {
  campus_id: number;
  campus_name: string;
  count: number;
}