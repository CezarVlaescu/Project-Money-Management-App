import { CalendarDayStatus } from '../types/core.types';

export interface CalendarDayBudget {
  date: string;
  dayNumber: number;
  isToday: boolean;
  isFuture: boolean;
  spent: number;
  allowanceAtStartOfDay: number;
  remainingAfterSpend: number;
  status: CalendarDayStatus;
}

export interface DailyAllowanceSummary {
  periodStart: string;
  periodEnd: string;
  dailyLimit: number;
  monthlyBudget: number;
  spentBeforeToday: number;
  spentToday: number;
  spentThisMonth: number;
  daysLeftIncludingToday: number;
  adaptiveDailyAllowance: number;
  todayRemaining: number;
  remainingMonthlyBudget: number;
  isOverBudget: boolean;
}

export interface AllowanceExpense {
  id: string;
  amount: number;
  date: string;
}

export interface CloudSpendingPeriod {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  daily_limit: number;
  currency: string;
  include_planned_recurring: boolean;
  created_at: string;
  updated_at: string;
  meal_vouchers_amount: number;
  gift_cards_amount: number;
}

export interface CreateCloudSpendingPeriodPayload {
  user_id: string;
  period_start: string;
  period_end: string;
  daily_limit: number;
  currency?: string;
  include_planned_recurring?: boolean;
  meal_vouchers_amount?: number;
  gift_cards_amount?: number;
}

export interface UpdateCloudSpendingPeriodPayload {
  daily_limit?: number;
  currency?: string;
  include_planned_recurring?: boolean;
  updated_at?: string;
  meal_vouchers_amount?: number;
  gift_cards_amount?: number;
}
