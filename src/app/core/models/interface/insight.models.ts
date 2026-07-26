import { MoneyInsightCategory, MoneyInsightType } from '../types/core.types';

export interface MoneyInsight {
  id: string;
  type: MoneyInsightType;
  category: MoneyInsightCategory;
  title: string;
  message: string;
  icon: string;
  priority: number;
  actionLabel?: string;
  route?: string;
}
