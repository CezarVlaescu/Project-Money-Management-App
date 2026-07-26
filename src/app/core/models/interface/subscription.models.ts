import {
  SubscriptionCategoryType,
  SubscriptionFrequency,
  SubscriptionPaymentStatus,
} from '../types/core.types';

export interface CloudSubscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  category_type: SubscriptionCategoryType;
  frequency: SubscriptionFrequency;
  due_day: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateCloudSubscriptionPayload {
  user_id: string;
  name: string;
  amount: number;
  currency?: string;
  category_type: SubscriptionCategoryType;
  frequency?: SubscriptionFrequency;
  due_day: number;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
}

export interface UpdateCloudSubscriptionPayload {
  name?: string;
  amount?: number;
  currency?: string;
  category_type?: SubscriptionCategoryType;
  frequency?: SubscriptionFrequency;
  due_day?: number;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CloudSubscriptionPayment {
  id: string;
  user_id: string;
  subscription_id: string;
  period_start: string;
  due_date: string;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  cleared_at: string | null;
}

export interface CreateCloudSubscriptionPaymentPayload {
  user_id: string;
  subscription_id: string;
  period_start: string;
  due_date: string;
  amount: number;
  currency?: string;
  status?: SubscriptionPaymentStatus;
  paid_at?: string | null;
}

export interface UpdateCloudSubscriptionPaymentPayload {
  amount?: number;
  currency?: string;
  due_date?: string;
  status?: SubscriptionPaymentStatus;
  paid_at?: string | null;
  updated_at?: string;
  deleted_at?: string | null;
  cleared_at?: string | null;
}

export interface SubscriptionPaymentItem {
  payment: CloudSubscriptionPayment;
  subscription: CloudSubscription | null;
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: CloudSubscriptionPayment['status'];
}
