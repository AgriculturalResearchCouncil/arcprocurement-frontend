export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'approver' | 'campus_manager' | 'responsible_user' | 'viewer';
  campus_id: number;
  campus_name?: string;
  business_unit?: string;
  created_at: Date;
  updated_at: Date;
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