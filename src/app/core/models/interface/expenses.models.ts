import { BudgetCategory, SourceType } from '../types/core.types';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: BudgetCategory;
  date: string;
  note?: string;
  merchant?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateExpensePayload {
  title: string;
  amount: number;
  date?: string;
  note?: string;
  category?: BudgetCategory;
}

export interface CloudExpense {
  id: string;
  user_id: string;
  local_id: string | null;
  title: string;
  amount: number;
  category: BudgetCategory;
  expense_date: string;
  source_type: SourceType;
  subscription_payment_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateCloudExpensePayload {
  user_id: string;
  local_id?: string | null;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  source_type?: SourceType;
  subscription_payment_id?: string | null;
  note?: string | null;
}

export interface UpdateCloudExpensePayload {
  title?: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  note?: string | null;
  deleted_at?: string | null;
}

export interface CreateSubscriptionExpenseParams {
  paymentId: string;
  subscriptionName: string;
  amount: number;
  expenseDate: string;
  categoryType: BudgetCategory;
}
