import { SavingsAccountType } from '../types/core.types';

export interface CloudSavingsAccount {
  id: string;
  user_id: string;
  name: string;
  type: SavingsAccountType;
  current_amount: number;
  currency: string;
  institution: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateCloudSavingsAccountPayload {
  user_id: string;
  name: string;
  type: SavingsAccountType;
  current_amount: number;
  currency?: string;
  institution?: string | null;
  note?: string | null;
  is_active?: boolean;
}

export interface UpdateCloudSavingsAccountPayload {
  name?: string;
  type?: SavingsAccountType;
  current_amount?: number;
  currency?: string;
  institution?: string | null;
  note?: string | null;
  is_active?: boolean;
  updated_at?: string;
  deleted_at?: string | null;
}
