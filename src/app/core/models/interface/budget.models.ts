import { BudgetCategory } from '../types/core.types';

export interface BudgetBucket {
  category: BudgetCategory;
  label: string;
  percentage: number;
  amount: number;
  spent: number;
  remaining: number;
  progress: number;
  icon: string;
  description: string;
  actionLabel: string;
}

export interface BudgetSummary {
  income: number;
  totalAvailableIncome: number;
  totalMonthlyBenefits: number;

  needs: BudgetBucket;
  wants: BudgetBucket;
  savings: BudgetBucket;

  totalSpent: number;
  totalRemaining: number;
  yearlySavingsPotential: number;
}

export interface CategoryRule {
  category: BudgetCategory;
  keywords: string[];
}
