export interface User {
  id: number;
  username?: string;  // Make optional for compatibility
  name: string;
  email: string;
  role: 'admin' | 'approver' | 'campus_manager' | 'responsible_user' | 'viewer' | string;
  campus_id?: number;
  campus_name?: string;
  business_unit?: string;
  is_active?: boolean;
  is_from_ad?: boolean;
  department?: string;
  title?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}