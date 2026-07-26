export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  icon: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSavingsGoalPayload {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  monthlyContribution?: number;
  icon?: string;
  color?: string;
}

export interface UpdateSavingsGoalPayload {
  title?: string;
  targetAmount?: number;
  currentAmount?: number;
  monthlyContribution?: number;
  icon?: string;
}

export interface CloudSavingsGoal {
  id: string;
  user_id: string;
  local_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateCloudSavingsGoalPayload {
  user_id: string;
  local_id?: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string | null;
  icon?: string | null;
}

export interface UpdateCloudSavingsGoalPayload {
  name?: string;
  target_amount?: number;
  current_amount?: number;
  deadline?: string | null;
  icon?: string | null;
  deleted_at?: string | null;
}
