import { CloudSyncState, CloudSyncReason, DeletedEntityType } from '../types/core.types';

export interface CloudUserSettings {
  id: string;
  user_id: string;
  monthly_income: number;
  currency: string;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertCloudUserSettingsPayload {
  user_id: string;
  monthly_income: number;
  currency: string;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  theme?: string | null;
}

export interface CloudRestoreResult {
  settingsRestored: boolean;
  expensesCount: number;
  goalsCount: number;
  spendingPeriodsCount: number;
  subscriptionsCount: number;
  subscriptionPaymentsCount: number;
  savingsAccountsCount: number;
}

export interface CloudSyncStatus {
  hasCloudData: boolean;
  hasSettings: boolean;
  expensesCount: number;
  goalsCount: number;
  spendingPeriodsCount: number;
  subscriptionsCount: number;
  subscriptionPaymentsCount: number;
  checkedAt: string;
  savingsAccountsCount: number;
}

export interface CloudSyncMeta {
  lastBackupAt: string | null;
  lastRestoreAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  state: CloudSyncState;
}

export interface CloudSyncRequest {
  reason: CloudSyncReason;
  requestedAt: string;
}

export interface LocalDeletionTombstone {
  entityType: DeletedEntityType;
  localId: string;
  deletedAt: string;
}
