import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';

import { StorageService } from '../storage/storage';
import { ExpensesService } from '../expenses/expenses';
import { INCOME_STORAGE_KEY } from '../../../shared/constants/app.constants';
import { BudgetBucket, BudgetSummary } from '../../models/interface';
import { BudgetCategory } from '../../models/types/core.types';
import { CloudSyncQueueService } from '../../sync/cloud-sync-queue/cloud-sync-queue-service';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly storageService: StorageService = inject<StorageService>(StorageService);

  private readonly expensesService: ExpensesService = inject<ExpensesService>(ExpensesService);

  private readonly cloudSyncQueueService: CloudSyncQueueService =
    inject<CloudSyncQueueService>(CloudSyncQueueService);

  public readonly income: WritableSignal<number> = signal<number>(
    this.storageService.getItem<number>(INCOME_STORAGE_KEY, 0),
  );

  private readonly mealVouchersAmountSignal = signal<number>(0);

  private readonly giftCardsAmountSignal = signal<number>(0);

  public readonly mealVouchersAmount = this.mealVouchersAmountSignal.asReadonly();

  public readonly giftCardsAmount = this.giftCardsAmountSignal.asReadonly();

  public readonly totalMonthlyBenefits = computed<number>(
    () => this.mealVouchersAmountSignal() + this.giftCardsAmountSignal(),
  );

  public readonly totalAvailableIncome = computed<number>(
    () => this.income() + this.totalMonthlyBenefits(),
  );

  public readonly needsAmount: Signal<number> = computed<number>(
    () => this.income() * 0.5 + this.mealVouchersAmountSignal(),
  );

  public readonly wantsAmount: Signal<number> = computed<number>(
    () => this.income() * 0.3 + this.giftCardsAmountSignal(),
  );

  public readonly savingsAmount: Signal<number> = computed<number>(() => this.income() * 0.2);

  public readonly budgetSummary: Signal<BudgetSummary> = computed<BudgetSummary>(() => {
    const income: number = this.income();

    const totalMonthlyBenefits: number = this.totalMonthlyBenefits();

    const totalAvailableIncome: number = this.totalAvailableIncome();

    const needs: BudgetBucket = this.createBucket({
      category: 'needs',
      label: 'Needs',
      percentage: 50,
      amount: this.needsAmount(),
      spent: this.expensesService.needsSpent(),
      icon: '🧺',
      description: 'Rent, bills, food, transport',
      actionLabel: 'used',
    });

    const wants: BudgetBucket = this.createBucket({
      category: 'wants',
      label: 'Wants',
      percentage: 30,
      amount: this.wantsAmount(),
      spent: this.expensesService.wantsSpent(),
      icon: '🛍️',
      description: 'Fun, shopping, restaurants',
      actionLabel: 'used',
    });

    const savings: BudgetBucket = this.createBucket({
      category: 'savings',
      label: 'Savings',
      percentage: 20,
      amount: this.savingsAmount(),
      spent: this.expensesService.savingsSpent(),
      icon: '🐷',
      description: 'Investments, emergency fund',
      actionLabel: 'used',
    });

    const totalSpent: number = needs.spent + wants.spent + savings.spent;

    return {
      income,
      totalAvailableIncome,
      totalMonthlyBenefits,

      needs,
      wants,
      savings,

      totalSpent,
      totalRemaining: totalAvailableIncome - totalSpent,

      yearlySavingsPotential: savings.amount * 12,
    };
  });

  public readonly budgetBuckets: Signal<BudgetBucket[]> = computed<BudgetBucket[]>(() => {
    const summary: BudgetSummary = this.budgetSummary();

    return [summary.needs, summary.wants, summary.savings];
  });

  public setMonthlyBenefits(mealVouchersAmount: number, giftCardsAmount: number): void {
    this.mealVouchersAmountSignal.set(this.normalizeAmount(mealVouchersAmount));

    this.giftCardsAmountSignal.set(this.normalizeAmount(giftCardsAmount));
  }

  public updateIncome(income: number): void {
    const safeIncome = Math.max(Number(income) || 0, 0);

    this.income.set(safeIncome);

    this.storageService.setItem(INCOME_STORAGE_KEY, safeIncome);

    this.cloudSyncQueueService.requestAutoBackup('settings-changed');
  }

  public setIncome(income: number): void {
    this.updateIncome(income);
  }

  private createBucket(payload: {
    category: BudgetCategory;
    label: string;
    percentage: number;
    amount: number;
    spent: number;
    icon: string;
    description: string;
    actionLabel: string;
  }): BudgetBucket {
    const remaining = payload.amount - payload.spent;

    const progress =
      payload.amount > 0 ? Math.min(Math.round((payload.spent / payload.amount) * 100), 100) : 0;

    return {
      ...payload,
      remaining,
      progress,
    };
  }

  private normalizeAmount(value: number): number {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      return 0;
    }

    return amount;
  }
}
