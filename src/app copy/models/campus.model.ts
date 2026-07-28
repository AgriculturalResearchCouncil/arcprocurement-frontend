export interface Campus {
  id: number;
  name: string;
  campus_name?: string;
}

// Add this for the dashboard API response
export interface CampusProcurement {
  campus_id: number;
  campus_name: string;
  count: number;
}