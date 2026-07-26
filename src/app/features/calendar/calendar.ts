import { Component, computed, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { CloudExpensesService } from '../../core/services/cloud-expenses/cloud-expenses-service';
import {
  CloudSpendingPeriod,
  CloudExpense,
  DailyAllowanceSummary,
  CalendarDayBudget,
  CloudSubscriptionPayment,
  CloudSubscription,
  SubscriptionPaymentItem,
} from '../../core/models/interface';
import { DailyAllowanceCalculatorService } from '../../core/services/daily-allowance-calculator/daily-allowance-calculator-service';
import { SpendingPeriodsService } from '../../core/services/spending-periods/spending-periods-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetCategory, MonthState } from '../../core/models/types/core.types';
import { TIMELINE } from '../../core/models/enums/enums.core';
import { DAY_WEEK_CONST } from '../../shared/constants/app.constants';
import { CloudSubscriptionPaymentsService } from '../../core/services/cloud-subscription-payments/cloud-subscription-payments-service';
import { CloudSubscriptionsService } from '../../core/services/cloud-subscriptions/cloud-subscriptions-service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog/confirm-dialog-service';
import { ToastService } from '../../core/services/toast/toast';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit {
  private readonly cloudExpensesService: CloudExpensesService =
    inject<CloudExpensesService>(CloudExpensesService);
  private readonly cloudSpendingPeriodsService: SpendingPeriodsService =
    inject<SpendingPeriodsService>(SpendingPeriodsService);
  private readonly dailyAllowanceCalculatorService: DailyAllowanceCalculatorService =
    inject<DailyAllowanceCalculatorService>(DailyAllowanceCalculatorService);
  private readonly cloudSubscriptionsService: CloudSubscriptionsService =
    inject<CloudSubscriptionsService>(CloudSubscriptionsService);
  private readonly cloudSubscriptionPaymentsService: CloudSubscriptionPaymentsService =
    inject<CloudSubscriptionPaymentsService>(CloudSubscriptionPaymentsService);

  private readonly confirmDialogService: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);

  private readonly toastService: ToastService = inject<ToastService>(ToastService);

  protected readonly subscriptions: WritableSignal<CloudSubscription[]> = signal<
    CloudSubscription[]
  >([]);
  protected readonly subscriptionPayments: WritableSignal<CloudSubscriptionPayment[]> = signal<
    CloudSubscriptionPayment[]
  >([]);
  protected readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  protected readonly error: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly spendingPeriod: WritableSignal<CloudSpendingPeriod | null> =
    signal<CloudSpendingPeriod | null>(null);
  protected readonly editingDailyLimit: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly dailyLimitInput: WritableSignal<string> = signal<string>('');
  protected readonly savingDailyLimit: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly expenses: WritableSignal<CloudExpense[]> = signal<CloudExpense[]>([]);
  protected readonly selectedDay: WritableSignal<CalendarDayBudget | null> =
    signal<CalendarDayBudget | null>(null);
  protected readonly selectedMonth: WritableSignal<Date> = signal<Date>(new Date());
  protected readonly addingSubscription: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly savingSubscription: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly subscriptionNameInput: WritableSignal<string> = signal<string>('');
  protected readonly subscriptionAmountInput: WritableSignal<string> = signal<string>('');
  protected readonly subscriptionDueDayInput: WritableSignal<string> = signal<string>('');
  protected readonly subscriptionCategoryInput: WritableSignal<BudgetCategory> =
    signal<BudgetCategory>('needs');
  protected readonly editingSubscriptionItem: WritableSignal<SubscriptionPaymentItem | null> =
    signal<SubscriptionPaymentItem | null>(null);
  protected readonly showCompletedSubscriptionPayments: WritableSignal<boolean> =
    signal<boolean>(false);

  protected readonly completedSubscriptionPaymentItems = computed<SubscriptionPaymentItem[]>(() => {
    return this.subscriptionPaymentItems().filter(
      (item) => item.status === 'paid' || item.status === 'skipped',
    );
  });

  protected readonly visibleSubscriptionPaymentItems = computed<SubscriptionPaymentItem[]>(() => {
    if (this.showCompletedSubscriptionPayments()) {
      return this.subscriptionPaymentItems();
    }

    return this.subscriptionPaymentItems().filter((item) => item.status === 'pending');
  });

  protected readonly subscriptionFormOpen = computed<boolean>(() => {
    return this.addingSubscription() || !!this.editingSubscriptionItem();
  });

  protected readonly subscriptionPaymentItems = computed<SubscriptionPaymentItem[]>(() => {
    const subscriptions = this.subscriptions();
    const payments = this.subscriptionPayments();

    return payments.map((payment) => {
      const subscription =
        subscriptions.find((item) => item.id === payment.subscription_id) ?? null;

      return {
        payment,
        subscription,
        name: subscription?.name ?? 'Recurring payment',
        amount: payment.amount,
        currency: payment.currency,
        dueDate: payment.due_date,
        status: payment.status,
      };
    });
  });

  protected readonly pendingSubscriptionPaymentItems = computed<SubscriptionPaymentItem[]>(() => {
    return this.subscriptionPaymentItems().filter((item) => item.status === 'pending');
  });
  protected readonly selectedDayExpenses: Signal<CloudExpense[]> = computed<CloudExpense[]>(() => {
    const selectedDay = this.selectedDay();
    if (!selectedDay) return [];
    return this.expenses().filter((expense) => expense.expense_date === selectedDay.date);
  });
  protected readonly selectedMonthState: Signal<MonthState> = computed<MonthState>(() => {
    const selectedMonth = this.getMonthStartDate(this.selectedMonth());
    const currentMonth = this.getMonthStartDate(new Date());
    if (selectedMonth.getTime() < currentMonth.getTime()) return TIMELINE.PAST;
    if (selectedMonth.getTime() > currentMonth.getTime()) return TIMELINE.FUTURE;

    return TIMELINE.CURRENT;
  });
  protected readonly allowanceReferenceDate: Signal<Date> = computed<Date>(() => {
    const selectedMonth = this.selectedMonth();
    const monthState = this.selectedMonthState();

    if (monthState === TIMELINE.PAST) return this.getMonthEndDate(selectedMonth);
    if (monthState === TIMELINE.FUTURE) return this.getMonthStartDate(selectedMonth);

    return new Date();
  });
  protected readonly dailyAllowanceSummary: Signal<DailyAllowanceSummary | null> =
    computed<DailyAllowanceSummary | null>(() => {
      const period = this.spendingPeriod();

      if (!period) return null;

      return this.dailyAllowanceCalculatorService.calculateSummary(
        {
          id: period.id,
          user_id: period.user_id,
          period_start: period.period_start,
          period_end: period.period_end,
          daily_limit: period.daily_limit,
          currency: period.currency,
          include_planned_recurring: period.include_planned_recurring,
          created_at: period.created_at,
          updated_at: period.updated_at,
          meal_vouchers_amount: 0,
          gift_cards_amount: 0
        },
        this.expenses().map((expense) => ({
          id: expense.id,
          amount: expense.amount,
          date: expense.expense_date,
        })),
        this.allowanceReferenceDate(),
      );
    });

  protected readonly selectedMonthLabel: Signal<string> = computed<string>(() => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(this.selectedMonth());
  });

  protected readonly calendarDays: Signal<CalendarDayBudget[]> = computed<CalendarDayBudget[]>(
    () => {
      const period = this.spendingPeriod();

      if (!period) return [];

      return this.dailyAllowanceCalculatorService.buildCalendarDays(
        {
          id: period.id,
          user_id: period.user_id,
          period_start: period.period_start,
          period_end: period.period_end,
          daily_limit: period.daily_limit,
          currency: period.currency,
          include_planned_recurring: period.include_planned_recurring,
          created_at: period.created_at,
          updated_at: period.updated_at,
          meal_vouchers_amount: 0,
          gift_cards_amount: 0
        },
        this.expenses().map((expense) => ({
          id: expense.id,
          amount: expense.amount,
          date: expense.expense_date,
        })),
      );
    },
  );

  protected readonly weekdayLabels: string[] = DAY_WEEK_CONST;

  protected readonly calendarGridItems: Signal<
    (
      | { type: 'empty'; trackId: string }
      | {
          type: 'day';
          trackId: string;
          day: CalendarDayBudget;
        }
    )[]
  > = computed<
    (
      | { type: 'empty'; trackId: string }
      | { type: 'day'; trackId: string; day: CalendarDayBudget }
    )[]
  >(() => {
    const days = this.calendarDays();

    if (!days.length) return [];

    const firstDay = new Date(days[0].date);
    const emptyDaysBeforeFirstDay = (firstDay.getDay() + 6) % 7;
    const emptyItems = Array.from({ length: emptyDaysBeforeFirstDay }, (_, index) => ({
      type: 'empty' as const,
      trackId: `empty-${index}`,
    }));

    const dayItems = days.map((day) => ({ type: 'day' as const, trackId: day.date, day }));

    return [...emptyItems, ...dayItems];
  });

  public async ngOnInit(): Promise<void> {
    await this.loadCalendarForSelectedMonth();
  }

  protected async loadCalendarForSelectedMonth(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      this.selectedDay.set(null);

      const period = await this.cloudSpendingPeriodsService.getOrCreateCurrentSpendingPeriod(
        this.selectedMonth(),
      );
      const [expenses, subscriptions, subscriptionPayments] = await Promise.all([
        this.cloudExpensesService.getExpensesByDateRange(period.period_start, period.period_end),
        this.cloudSubscriptionsService.getActiveSubscriptions(),
        this.cloudSubscriptionPaymentsService.ensurePaymentsForPeriod(
          period.period_start,
          period.period_end,
        ),
      ]);

      this.spendingPeriod.set(period);
      this.expenses.set(expenses);
      this.subscriptions.set(subscriptions);
      this.subscriptionPayments.set(subscriptionPayments);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load calendar.');
    } finally {
      this.loading.set(false);
    }
  }

  protected startEditingDailyLimit(): void {
    const period = this.spendingPeriod();

    if (!period) return;

    this.dailyLimitInput.set(String(period.daily_limit));
    this.editingDailyLimit.set(true);
  }

  protected cancelEditingDailyLimit(): void {
    this.editingDailyLimit.set(false);
    this.dailyLimitInput.set('');
  }

  protected async saveDailyLimit(): Promise<void> {
    const period = this.spendingPeriod();

    if (!period) return;

    const dailyLimit = Number(this.dailyLimitInput());

    if (!dailyLimit || dailyLimit < 0) {
      this.error.set('Please enter a valid daily limit.');
      return;
    }

    try {
      this.savingDailyLimit.set(true);
      this.error.set(null);

      const updatedPeriod = await this.cloudSpendingPeriodsService.updateDailyLimit(
        period.id,
        dailyLimit,
      );

      this.spendingPeriod.set(updatedPeriod);
      this.editingDailyLimit.set(false);
      this.dailyLimitInput.set('');
      this.toastService.info('Daily limit updated');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not update daily limit.');
    } finally {
      this.savingDailyLimit.set(false);
    }
  }

  protected selectDay(day: CalendarDayBudget): void {
    this.selectedDay.set(day);
  }

  protected closeSelectedDay(): void {
    this.selectedDay.set(null);
  }

  protected startAddingSubscription(): void {
    this.editingSubscriptionItem.set(null);
    this.subscriptionNameInput.set('');
    this.subscriptionAmountInput.set('');
    this.subscriptionDueDayInput.set('');
    this.subscriptionCategoryInput.set('needs');
    this.addingSubscription.set(true);
  }

  protected startEditingSubscription(item: SubscriptionPaymentItem): void {
    if (!item.subscription) {
      this.error.set('Could not find recurring payment details.');
      return;
    }

    this.addingSubscription.set(false);
    this.editingSubscriptionItem.set(item);

    this.subscriptionNameInput.set(item.subscription.name);
    this.subscriptionAmountInput.set(String(item.subscription.amount));
    this.subscriptionDueDayInput.set(String(item.subscription.due_day));
    this.subscriptionCategoryInput.set(item.subscription.category_type);
  }

  protected cancelSubscriptionForm(): void {
    this.addingSubscription.set(false);
    this.editingSubscriptionItem.set(null);
    this.subscriptionNameInput.set('');
    this.subscriptionAmountInput.set('');
    this.subscriptionDueDayInput.set('');
    this.subscriptionCategoryInput.set('needs');
  }

  protected getExpenseLabel(expense: CloudExpense): string {
    const item = expense as CloudExpense & {
      title?: string;
      name?: string;
      description?: string;
      category?: string;
      category_name?: string;
    };

    return (
      item.title ??
      item.name ??
      item.description ??
      item.category ??
      item.category_name ??
      'Expense'
    );
  }

  protected toggleCompletedSubscriptionPayments(): void {
    this.showCompletedSubscriptionPayments.update((value) => !value);
  }

  protected async clearCompletedSubscriptionPayments(): Promise<void> {
    const period = this.spendingPeriod();

    if (!period) {
      this.error.set('Could not find the selected month.');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Clear completed payments?',
      message:
        'Paid and skipped payments will be hidden from this month. Expenses already created will remain.',
      confirmLabel: 'Clear',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    try {
      this.error.set(null);

      await this.cloudSubscriptionPaymentsService.clearCompletedPaymentsForPeriod(
        period.period_start,
      );

      this.toastService.info('Completed payments cleared');
      await this.loadCalendarForSelectedMonth();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Could not clear completed recurring payments.',
      );
    }
  }

  protected async saveSubscription(): Promise<void> {
    const name = this.subscriptionNameInput().trim();
    const amount = Number(this.subscriptionAmountInput());
    const dueDay = Number(this.subscriptionDueDayInput());
    const categoryType = this.subscriptionCategoryInput();

    if (!name) {
      this.error.set('Please enter a recurring payment name.');
      return;
    }

    if (!amount || amount <= 0) {
      this.error.set('Please enter a valid amount.');
      return;
    }

    if (!dueDay || dueDay < 1 || dueDay > 31) {
      this.error.set('Please enter a due day between 1 and 31.');
      return;
    }

    const period = this.spendingPeriod();

    if (!period) {
      this.error.set('Could not find the selected month.');
      return;
    }

    try {
      this.savingSubscription.set(true);
      this.error.set(null);

      const editingItem = this.editingSubscriptionItem();

      if (editingItem?.subscription) {
        const updatedSubscription = await this.cloudSubscriptionsService.updateSubscription(
          editingItem.subscription.id,
          {
            name,
            amount,
            currency: 'RON',
            category_type: categoryType,
            frequency: 'monthly',
            due_day: dueDay,
          },
        );

        await this.cloudSubscriptionPaymentsService.updatePendingPaymentFromSubscription(
          editingItem.payment,
          updatedSubscription,
        );

        this.toastService.info('Recurring payment updated');

        this.cancelSubscriptionForm();
        await this.loadCalendarForSelectedMonth();

        return;
      }

      await this.cloudSubscriptionsService.createSubscription({
        name,
        amount,
        currency: 'RON',
        category_type: categoryType,
        frequency: 'monthly',
        due_day: dueDay,
        start_date: period.period_start,
        is_active: true,
      });

      this.toastService.info('Recurring payment added');

      this.cancelSubscriptionForm();
      await this.loadCalendarForSelectedMonth();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save recurring payment.');
    } finally {
      this.savingSubscription.set(false);
    }
  }

  protected async stopSubscription(item: SubscriptionPaymentItem): Promise<void> {
    if (!item.subscription) {
      this.error.set('Could not find recurring payment details.');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'Stop recurring payment?',
      message: `This will stop future payments for ${item.subscription.name}. Existing expenses will remain.`,
      confirmLabel: 'Stop',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      this.error.set(null);

      await this.cloudSubscriptionsService.softDeleteSubscription(item.subscription.id);

      if (item.status === 'pending') {
        await this.cloudSubscriptionPaymentsService.softDeletePayment(item.payment.id);
      }

      this.toastService.info('Recurring payment stopped');
      await this.loadCalendarForSelectedMonth();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not stop recurring payment.');
    }
  }

  protected async goToPreviousMonth(): Promise<void> {
    const current = this.selectedMonth();
    this.selectedMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    await this.loadCalendarForSelectedMonth();
  }

  protected async goToNextMonth(): Promise<void> {
    const current = this.selectedMonth();
    this.selectedMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    await this.loadCalendarForSelectedMonth();
  }

  protected async goToCurrentMonth(): Promise<void> {
    this.selectedMonth.set(new Date());
    await this.loadCalendarForSelectedMonth();
  }
  protected async skipSubscriptionPayment(item: SubscriptionPaymentItem): Promise<void> {
    try {
      this.error.set(null);

      const updatedPayment = await this.cloudSubscriptionPaymentsService.markPaymentAsSkipped(
        item.payment.id,
      );

      this.subscriptionPayments.update((payments) =>
        payments.map((payment) => (payment.id === updatedPayment.id ? updatedPayment : payment)),
      );

      this.toastService.info('Payment skipped');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not skip recurring payment.');
    }
  }

  protected async markSubscriptionPaymentAsPaid(item: SubscriptionPaymentItem): Promise<void> {
    if (!item.subscription) {
      this.error.set('Could not find the recurring payment details.');
      return;
    }

    try {
      this.error.set(null);

      await this.cloudSubscriptionPaymentsService.markPaymentAsPaid(
        item.payment,
        item.subscription,
      );

      this.toastService.info('Recurring payment added to expenses');
      await this.loadCalendarForSelectedMonth();
    } catch (error) {
      console.error('Mark subscription payment as paid failed:', error);

      this.error.set(
        error instanceof Error ? error.message : 'Could not mark recurring payment as paid.',
      );
    }
  }

  protected formatShortDate(date: string): string {
    return new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' }).format(
      this.parseDateOnly(date),
    );
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private getMonthStartDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private getMonthEndDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
}
